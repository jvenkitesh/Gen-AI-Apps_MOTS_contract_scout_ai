export type QueryClassification = "contract" | "history" | "both";

// Pure regex heuristic -- zero extra API calls, per PRD §7's explicit
// requirement that this adjust the system prompt without a second LLM call.
export function classifyQuery(message: string): QueryClassification {
  const historyPatterns = /\b(earlier|you said|previously|before|last time|again)\b/i;
  const contractPatterns = /\b(clause|section|page|term|obligation|party|governing law|liability|indemnif)\b/i;

  const hasHistory = historyPatterns.test(message);
  const hasContract = contractPatterns.test(message);

  if (hasHistory && !hasContract) return "history";
  if (hasContract && !hasHistory) return "contract";
  return "both";
}
