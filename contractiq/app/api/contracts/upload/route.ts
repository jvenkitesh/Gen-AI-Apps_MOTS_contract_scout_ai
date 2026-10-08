import { createClient } from "@/lib/supabase/server";
import { extractContractText } from "@/lib/pdf/extractText";
import { STANDARD_TERMS } from "@/lib/ai/termLibrary";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB, per PRD FR-02
const MAX_PAGES = 20;
const MIN_WORDS = 100;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const contractType = formData?.get("contract_type");

  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Only PDF files are supported." },
      { status: 422 }
    );
  }
  if (contractType !== "NDA" && contractType !== "MSA") {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "contract_type must be NDA or MSA." },
      { status: 422 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "File must be 10MB or smaller." },
      { status: 422 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let extracted;
  try {
    extracted = await extractContractText(buffer);
  } catch {
    return NextResponse.json(
      {
        error: "UNREADABLE_PDF",
        message: "We couldn't read this PDF. Please make sure it's a valid, non-corrupted PDF file.",
      },
      { status: 422 }
    );
  }

  if (extracted.pageCount > MAX_PAGES) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: `Contracts must be ${MAX_PAGES} pages or fewer.` },
      { status: 422 }
    );
  }

  if (extracted.wordCount < MIN_WORDS) {
    await supabase.from("contracts").insert({
      user_id: user.id,
      original_filename: file.name,
      contract_type: contractType,
      status: "error",
      error_message: "Scanned PDFs are not supported yet.",
      page_count: extracted.pageCount,
      file_size_bytes: file.size,
    });
    return NextResponse.json(
      { error: "SCANNED_PDF_UNSUPPORTED", message: "Scanned PDFs are not supported yet." },
      { status: 422 }
    );
  }

  const { data: contract, error: insertError } = await supabase
    .from("contracts")
    .insert({
      user_id: user.id,
      original_filename: file.name,
      contract_type: contractType,
      status: "uploaded",
      contract_text: extracted.text,
      page_count: extracted.pageCount,
      file_size_bytes: file.size,
    })
    .select("id")
    .single();

  if (insertError || !contract) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Could not save the contract. Please try again." },
      { status: 500 }
    );
  }

  // Non-blocking Storage upload: failure here must never fail the request --
  // file_path stays null and the text-viewer fallback (spec 04) is used.
  const path = `${user.id}/${contract.id}/${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("contracts")
    .upload(path, buffer, { contentType: "application/pdf", upsert: false });

  if (!uploadError) {
    await supabase.from("contracts").update({ file_path: path }).eq("id", contract.id);
  }

  return NextResponse.json(
    {
      contract_id: contract.id,
      contract_type: contractType,
      page_count: extracted.pageCount,
      standard_terms: STANDARD_TERMS[contractType],
    },
    { status: 201 }
  );
}
