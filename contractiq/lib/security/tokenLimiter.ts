// Centralizes limits already enforced ad hoc across routes (upload, chat),
// plus new ones for this stage. Values match the app's actual established
// limits (PRD FR-02, engineering-doc.md §8) -- NOT the security-foundation
// skill's generic template defaults (e.g. its "200 pages" / "100 messages"
// examples), which would silently change already-approved behavior.

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches the Storage bucket limit
export const MAX_PAGE_COUNT = 20; // PRD FR-02
export const MIN_WORD_COUNT = 100; // scanned-PDF detection floor
export const MAX_MESSAGE_LENGTH = 5000; // matches chat_messages.content CHECK constraint

// The chat route already fetches/sends history with `.limit(200)` -- this
// env var makes that configurable without changing the existing default.
export const MAX_CHAT_HISTORY = Number(process.env.MAX_CHAT_HISTORY) || 200;
