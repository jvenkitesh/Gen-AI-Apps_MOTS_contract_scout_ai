import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security/authGuard";
import { NextResponse } from "next/server";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour, per FR-06

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const authResult = await requireAuth(supabase);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const { data: contract } = await supabase
    .from("contracts")
    .select("file_path")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!contract.file_path) {
    return NextResponse.json({ error: "PDF_UNAVAILABLE" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(contract.file_path, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  return NextResponse.json({
    signed_url: data.signedUrl,
    expires_at: new Date(Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000).toISOString(),
  });
}
