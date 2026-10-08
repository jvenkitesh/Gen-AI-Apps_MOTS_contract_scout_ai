import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const [{ count: total }, { count: ndaCount }, { count: msaCount }, { data: recent }] = await Promise.all([
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("contract_type", "NDA"),
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("contract_type", "MSA"),
    supabase
      .from("contracts")
      .select("id, original_filename, contract_type, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return NextResponse.json({
    total: total ?? 0,
    by_type: { NDA: ndaCount ?? 0, MSA: msaCount ?? 0 },
    recent: recent ?? [],
  });
}
