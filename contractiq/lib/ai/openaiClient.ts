import OpenAI from "openai";

let client: OpenAI | null = null;

// 3x retry w/ exponential backoff on 429/5xx, per engineering-doc.md §8 --
// the SDK's built-in retry handles the backoff timing.
export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY");
    }
    client = new OpenAI({ apiKey, maxRetries: 3 });
  }
  return client;
}
