import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/ai/openaiClient";
import { buildExtractionSystemPrompt, JSON_RETRY_PROMPT } from "@/lib/ai/prompts/extraction";
import { extractionResponseSchema, type ExtractedTermFromAI } from "@/lib/ai/extractionSchema";
import { STANDARD_TERMS } from "@/lib/ai/termLibrary";
import { NextResponse } from "next/server";
import type OpenAI from "openai";

export const runtime = "nodejs";

// PRD §5: contracts over ~15,000 tokens are out of MVP scope (no chunking).
// ~4 chars/token is a standard rough estimate for English prose.
const MAX_CONTRACT_TOKENS_ESTIMATE = 15000;
const CHARS_PER_TOKEN_ESTIMATE = 4;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, contract_type, contract_text, status")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (contract.status !== "uploaded" && contract.status !== "error") {
    return NextResponse.json(
      { error: "INVALID_STATUS", message: "This contract is already processing or completed." },
      { status: 409 }
    );
  }

  if (!contract.contract_text) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "No extracted text found for this contract." },
      { status: 500 }
    );
  }

  const estimatedTokens = Math.ceil(contract.contract_text.length / CHARS_PER_TOKEN_ESTIMATE);
  if (estimatedTokens > MAX_CONTRACT_TOKENS_ESTIMATE) {
    await supabase
      .from("contracts")
      .update({ status: "error", error_message: "Contract is too long to process (exceeds ~15,000 tokens)." })
      .eq("id", contract.id);
    return NextResponse.json(
      { error: "CONTRACT_TOO_LONG", message: "This contract is too long to process." },
      { status: 422 }
    );
  }

  const { data: customTerms } = await supabase
    .from("custom_key_terms")
    .select("id, term_name")
    .eq("contract_id", contract.id);

  await supabase.from("contracts").update({ status: "processing" }).eq("id", contract.id);

  const contractType = contract.contract_type as "NDA" | "MSA";
  const systemPrompt = buildExtractionSystemPrompt({
    contractType,
    standardTerms: STANDARD_TERMS[contractType],
    customTermNames: (customTerms ?? []).map((t) => t.term_name),
  });

  const openai = getOpenAIClient();
  const baseMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contract.contract_text },
  ];

  let parsed: ExtractedTermFromAI[] | null = null;
  let lastRawResponse = "";

  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    const messages =
      attempt === 0
        ? baseMessages
        : [...baseMessages, { role: "assistant", content: lastRawResponse } as const, { role: "user", content: JSON_RETRY_PROMPT } as const];

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages,
      });
    } catch {
      await supabase
        .from("contracts")
        .update({ status: "error", error_message: "The AI extraction service is temporarily unavailable." })
        .eq("id", contract.id);
      return NextResponse.json(
        { error: "UPSTREAM_ERROR", message: "Extraction failed. Please try again shortly." },
        { status: 502 }
      );
    }

    lastRawResponse = completion.choices[0]?.message?.content ?? "";

    try {
      const rawJson = JSON.parse(lastRawResponse);
      const termsArray = Array.isArray(rawJson) ? rawJson : rawJson.terms;
      parsed = extractionResponseSchema.parse(termsArray);
    } catch {
      parsed = null;
    }
  }

  if (!parsed) {
    await supabase
      .from("contracts")
      .update({ status: "error", error_message: "AI extraction did not return valid results." })
      .eq("id", contract.id);
    return NextResponse.json(
      { error: "EXTRACTION_FAILED", message: "AI extraction did not return valid results. Please try again." },
      { status: 500 }
    );
  }

  const customTermByName = new Map((customTerms ?? []).map((t) => [t.term_name.toLowerCase(), t]));

  const rows = parsed.map((term) => {
    const customMatch = customTermByName.get(term.term_name.toLowerCase());
    return {
      contract_id: contract.id,
      user_id: user.id,
      custom_key_term_id: customMatch?.id ?? null,
      is_manual: Boolean(customMatch),
      term_name: term.term_name,
      value: term.value,
      page_number: term.page_number,
      confidence_score: Math.round(term.confidence_score * 100 * 100) / 100,
      source_sentence: term.source_sentence,
    };
  });

  // 0 extracted terms is a valid outcome (not an error) -- skip the insert
  // call entirely rather than passing an empty array to .insert().
  let insertedTerms: typeof rows = [];
  if (rows.length > 0) {
    const { data, error: insertError } = await supabase.from("extracted_key_terms").insert(rows).select();

    if (insertError) {
      await supabase
        .from("contracts")
        .update({ status: "error", error_message: "Could not save extracted terms." })
        .eq("id", contract.id);
      return NextResponse.json({ error: "SERVER_ERROR", message: "Could not save extracted terms." }, { status: 500 });
    }
    insertedTerms = data;
  }

  await supabase
    .from("contracts")
    .update({ status: "completed", processed_at: new Date().toISOString() })
    .eq("id", contract.id);

  return NextResponse.json({ terms: insertedTerms }, { status: 200 });
}
