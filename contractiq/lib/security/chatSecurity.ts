import type { SupabaseClient } from "@supabase/supabase-js";

interface ContractForChat {
  id: string;
  status: string;
  contract_text: string | null;
}

// Doubles as the ownership check (404, not 403, per the no-existence-leak
// rule) -- also enforces "chat only once extraction has completed".
export async function verifyContractOwnership(
  supabase: SupabaseClient,
  userId: string,
  contractId: string
): Promise<ContractForChat | null> {
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status, contract_text")
    .eq("id", contractId)
    .eq("user_id", userId)
    .single();

  if (!contract || contract.status !== "completed") {
    return null;
  }
  return contract;
}

interface ChatSessionRow {
  id: string;
}

// A chat_session's contract_id already ties it to a user via
// verifyContractOwnership(), but RLS/ownership should be checked at every
// hop rather than assumed transitively from an earlier query in the same
// request.
export async function verifySessionOwnership(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<ChatSessionRow | null> {
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  return session ?? null;
}
