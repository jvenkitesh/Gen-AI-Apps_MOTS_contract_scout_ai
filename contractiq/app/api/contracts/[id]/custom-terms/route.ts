import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security/authGuard";
import { customTermSchema } from "@/lib/security/inputValidator";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const authResult = await requireAuth(supabase);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const json = await request.json().catch(() => null);
  const parsed = customTermSchema.safeParse(json);
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

  const { count } = await supabase
    .from("custom_key_terms")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", params.id);

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: "MAX_CUSTOM_TERMS", message: "A contract may have at most 5 custom key terms." },
      { status: 422 }
    );
  }

  const { data: term, error } = await supabase
    .from("custom_key_terms")
    .insert({ contract_id: params.id, user_id: user.id, term_name: parsed.data.term_name })
    .select("id, term_name")
    .single();

  if (error || !term) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  return NextResponse.json(term, { status: 201 });
}
