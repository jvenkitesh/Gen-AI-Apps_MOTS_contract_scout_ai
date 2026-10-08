import { createClient } from "@supabase/supabase-js";

// Service-role client for test setup/teardown only (creating/confirming/
// deleting test users, direct DB assertions). Never used to exercise the
// app itself -- tests call the app's own API routes for that.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function deleteStorageObject(path: string): Promise<void> {
  const admin = createAdminClient();
  await admin.storage.from("contracts").remove([path]);
}

/** Test-only: directly flips a contract's status for edge-case setup (e.g.
 *  simulating mid-processing state) without burning a real OpenAI call. */
export async function setContractStatus(contractId: string, status: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("contracts").update({ status }).eq("id", contractId);
}
