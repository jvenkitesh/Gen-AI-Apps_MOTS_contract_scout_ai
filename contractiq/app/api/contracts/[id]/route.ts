import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await supabase
    .from("contracts")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", contract.id);

  const { data: terms } = await supabase
    .from("extracted_key_terms")
    .select("id, term_name, value, page_number, confidence_score, source_sentence, is_manual, is_edited")
    .eq("contract_id", contract.id)
    .order("created_at", { ascending: true });

  const { data: customTerms } = await supabase
    .from("custom_key_terms")
    .select("id, term_name")
    .eq("contract_id", contract.id);

  return NextResponse.json({
    contract: {
      id: contract.id,
      contract_type: contract.contract_type,
      status: contract.status,
      original_filename: contract.original_filename,
      page_count: contract.page_count,
      error_message: contract.error_message,
      contract_text: contract.contract_text,
    },
    terms: terms ?? [],
    custom_terms: customTerms ?? [],
    pdf_available: Boolean(contract.file_path),
  });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, file_path")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (contract.file_path) {
    await supabase.storage.from("contracts").remove([contract.file_path]);
  }

  const { error } = await supabase.from("contracts").delete().eq("id", contract.id);
  if (error) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
