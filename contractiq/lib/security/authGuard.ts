import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AuthResult = { user: User } | { error: NextResponse };

// Every route already creates its own `createClient()` instance (cookies
// must come from that request's context), so this takes the client rather
// than constructing one -- it only centralizes the getUser()+401 check.
export async function requireAuth(supabase: SupabaseClient): Promise<AuthResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  }

  return { user };
}
