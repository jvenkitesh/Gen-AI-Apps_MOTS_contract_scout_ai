import { createClient } from "@/lib/supabase/server";
import { extractContractText } from "@/lib/pdf/extractText";
import { STANDARD_TERMS } from "@/lib/ai/termLibrary";
import { requireAuth } from "@/lib/security/authGuard";
import { validateFileUpload } from "@/lib/security/inputValidator";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rateLimiter";
import { MAX_PAGE_COUNT, MIN_WORD_COUNT } from "@/lib/security/tokenLimiter";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const authResult = await requireAuth(supabase);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const rateLimit = await checkRateLimit(`user:${user.id}`, "upload");
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const contractType = formData?.get("contract_type");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Only PDF files are supported." },
      { status: 422 }
    );
  }
  const fileValidation = validateFileUpload(file);
  if (!fileValidation.valid) {
    return NextResponse.json(
      { error: fileValidation.error, message: fileValidation.message },
      { status: 422 }
    );
  }
  if (contractType !== "NDA" && contractType !== "MSA") {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "contract_type must be NDA or MSA." },
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

  if (extracted.pageCount > MAX_PAGE_COUNT) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: `Contracts must be ${MAX_PAGE_COUNT} pages or fewer.` },
      { status: 422 }
    );
  }

  if (extracted.wordCount < MIN_WORD_COUNT) {
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
