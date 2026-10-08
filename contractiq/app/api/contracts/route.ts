import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security/authGuard";
import { NextResponse } from "next/server";

const SORT_COLUMNS: Record<string, string> = {
  date: "created_at",
  name: "original_filename",
  type: "contract_type",
};

export async function GET(request: Request) {
  const supabase = createClient();
  const authResult = await requireAuth(supabase);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const url = new URL(request.url);
  const sortParam = url.searchParams.get("sort") ?? "date";
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 20));

  const sortColumn = SORT_COLUMNS[sortParam] ?? "created_at";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("contracts")
    .select("id, original_filename, contract_type, status, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order(sortColumn, { ascending: order === "asc" })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [], total: count ?? 0 });
}
