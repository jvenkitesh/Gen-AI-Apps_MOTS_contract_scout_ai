import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security/authGuard";
import { termPatchSchema } from "@/lib/security/inputValidator";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; termId: string } }
) {
  const supabase = createClient();
  const authResult = await requireAuth(supabase);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const json = await request.json().catch(() => null);
  const parsed = termPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 422 });
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("status")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (contract.status === "processing") {
    return NextResponse.json(
      { error: "CONTRACT_PROCESSING", message: "Processing in progress, try again shortly." },
      { status: 409 }
    );
  }

  const { data: existingTerm } = await supabase
    .from("extracted_key_terms")
    .select("id, value, original_ai_value")
    .eq("id", params.termId)
    .eq("contract_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!existingTerm) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // On first edit only, preserve the original AI value before overwriting.
  const updatePayload: Record<string, unknown> = {
    value: parsed.data.value,
    is_edited: true,
    edited_at: new Date().toISOString(),
  };
  if (existingTerm.original_ai_value === null) {
    updatePayload.original_ai_value = existingTerm.value;
  }

  const { data: updatedTerm, error } = await supabase
    .from("extracted_key_terms")
    .update(updatePayload)
    .eq("id", params.termId)
    .select()
    .single();

  if (error || !updatedTerm) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ term: updatedTerm }, { status: 200 });
}
