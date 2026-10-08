import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security/authGuard";
import { feedbackSchema } from "@/lib/security/inputValidator";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const authResult = await requireAuth(supabase);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const json = await request.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 422 });
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { data: feedback, error } = await supabase
    .from("user_feedback")
    .upsert(
      {
        contract_id: contract.id,
        user_id: user.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
      },
      { onConflict: "contract_id,user_id" }
    )
    .select()
    .single();

  if (error || !feedback) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ feedback }, { status: 200 });
}
