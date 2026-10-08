import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client -- bypasses RLS entirely. SERVER ONLY. Never import
// this from a Client Component or expose SUPABASE_SERVICE_ROLE_KEY to the
// browser. Reserved for admin-only operations (e.g. full-account deletion);
// not used by any Stage 1-3 route yet.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
