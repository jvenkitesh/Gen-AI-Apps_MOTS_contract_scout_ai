import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; termId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { error, count } = await supabase
    .from("custom_key_terms")
    .delete({ count: "exact" })
    .eq("id", params.termId)
    .eq("contract_id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
