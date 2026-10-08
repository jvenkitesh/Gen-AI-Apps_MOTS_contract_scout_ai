import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/ai/openaiClient";
import { classifyQuery } from "@/lib/ai/queryClassifier";
import { buildChatSystemPrompt } from "@/lib/ai/prompts/chat";
import { requireAuth } from "@/lib/security/authGuard";
import { chatMessageSchema } from "@/lib/security/inputValidator";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rateLimiter";
import { sanitizeForLLM } from "@/lib/security/promptInjectionGuard";
import { verifyContractOwnership } from "@/lib/security/chatSecurity";
import { MAX_CHAT_HISTORY } from "@/lib/security/tokenLimiter";
import { NextResponse } from "next/server";
import type OpenAI from "openai";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const authResult = await requireAuth(supabase);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("contract_id", contract.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ session_id: null, messages: [] });
  }

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, role, content, page_citation, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })
    .limit(MAX_CHAT_HISTORY);

  return NextResponse.json({ session_id: session.id, messages: messages ?? [] });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const authResult = await requireAuth(supabase);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const rateLimit = await checkRateLimit(`user:${user.id}`, "chat");
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const json = await request.json().catch(() => null);
  const parsed = chatMessageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 422 });
  }

  const sanitizeResult = sanitizeForLLM(parsed.data.message);
  if (sanitizeResult.blocked) {
    return NextResponse.json({ error: sanitizeResult.reason }, { status: 400 });
  }

  // Chat is only meaningful once extraction has completed; also doubles as
  // the ownership check (404, not 403, per the no-existence-leak rule).
  const contract = await verifyContractOwnership(supabase, user.id, params.id);
  if (!contract) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let sessionId: string;
  const { data: existingSession } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("contract_id", contract.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingSession) {
    sessionId = existingSession.id;
  } else {
    const { data: newSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({ contract_id: contract.id, user_id: user.id })
      .select("id")
      .single();
    if (sessionError || !newSession) {
      return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
    sessionId = newSession.id;
  }

  // Persist the user message immediately, before calling OpenAI.
  await supabase.from("chat_messages").insert({
    session_id: sessionId,
    user_id: user.id,
    role: "user",
    content: parsed.data.message,
  });

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(MAX_CHAT_HISTORY);

  const classification = classifyQuery(parsed.data.message);
  const systemPrompt = buildChatSystemPrompt({
    contractText: contract.contract_text ?? "",
    classification,
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).map(
      (m): OpenAI.Chat.ChatCompletionMessageParam => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })
    ),
  ];

  const openai = getOpenAIClient();
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completionStream = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.4,
          max_tokens: 1000,
          stream: true,
          messages,
        });

        for await (const chunk of completionStream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            fullResponse += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch {
        const interruption = "\n\n[Response interrupted -- please try again.]";
        fullResponse += interruption;
        controller.enqueue(encoder.encode(interruption));
      } finally {
        const pageCitationMatch = fullResponse.match(/\[Page (\d+)\]/);
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          user_id: user.id,
          role: "assistant",
          content: fullResponse || "[No response generated]",
          page_citation: pageCitationMatch ? Number(pageCitationMatch[1]) : null,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
