// Call sanitizeForLLM() on every user chat message BEFORE it reaches the
// LLM. These patterns target attempts to override the grounding system
// prompt, exfiltrate secrets, or role-play past the "contract Q&A only"
// constraint -- not general profanity/content filtering.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|the\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+|the\s+)?above/i,
  /override\s+your\s+rules/i,
  /disregard\s+(your\s+|the\s+)?(system\s+)?prompt/i,
  /reveal\s+(your\s+|the\s+)?system\s+prompt/i,
  /print\s+your\s+instructions/i,
  /show\s+(me\s+)?your\s+instructions/i,
  /expose\s+(the\s+)?env(ironment)?\s+variables?/i,
  /show\s+(me\s+)?(the\s+)?api\s+keys?/i,
  /you\s+are\s+now\s+a\b/i,
  /^\s*act\s+as\b/i,
  /pretend\s+you\s+are\b/i,
  /jailbreak/i,
  /\bdan\s+mode\b/i,
  /developer\s+mode/i,
];

export type SanitizeResult = { blocked: false } | { blocked: true; reason: string };

export function sanitizeForLLM(message: string): SanitizeResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return { blocked: true, reason: "PROMPT_INJECTION" };
    }
  }
  return { blocked: false };
}
