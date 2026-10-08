# Spec 05 — Contract Chat

Source: `docs/engineering/engineering-doc.md` §8, §9; PRD US-007, US-012, FR-08, FR-09.

## Overview

Streamed, document-grounded Q&A. Every response is grounded strictly in the
uploaded contract text and conversation history, with a mandatory page
citation. History persists per contract and reloads on reopen.

## Files to create/modify

- `app/api/contracts/[id]/chat/route.ts` — new (GET history, POST streamed send)
- `lib/ai/queryClassifier.ts` — new
- `lib/ai/prompts/chat.ts` — new
- `lib/hooks/useChatStream.ts` — new
- `components/chat/ChatPanel.tsx` — new
- `components/chat/ChatMessage.tsx` — new
- `components/chat/ChatInput.tsx` — new

## Data Model

`chat_sessions` (1:1 with `contract_id`), `chat_messages` (`role`, `content`
≤5000 chars, `page_citation`). See `specs/supabase-schema.sql`.

## API Contract

| Method & Path | Request | Response |
|---|---|---|
| `GET /api/contracts/:id/chat` | — | `200 { session_id, messages }` (ascending, ≤200) |
| `POST /api/contracts/:id/chat` | `{ message: string }` (≤5000 chars) | `200` streamed `text/event-stream`; `404` if `contract.status !== 'completed'` |

## Prompt Contract

- Model `gpt-4o`, `temperature: 0.4`, `max_tokens: 1000`, `stream: true`.
- Context per turn: full `contract_text` (≤15k tokens, no chunking) + full
  ascending history (≤200 messages) + system prompt:
  > "Answer only from the document text provided. If the answer is not in
  > the document, say so. Always cite the page number in the format [Page X].
  > Begin grounded answers with 'Based on the document...'."
- "I cannot find this in the document" is a valid, expected response — never
  logged or treated as a failure.

## Query Classification (`lib/ai/queryClassifier.ts`, zero extra API calls)

```ts
export function classifyQuery(message: string): "contract" | "history" | "both" {
  const historyPatterns = /\b(earlier|you said|previously|before|last time|again)\b/i;
  const contractPatterns = /\b(clause|section|page|term|obligation|party|governing law|liability|indemnif)\b/i;
  const hasHistory = historyPatterns.test(message);
  const hasContract = contractPatterns.test(message);
  if (hasHistory && !hasContract) return "history";
  if (hasContract && !hasHistory) return "contract";
  return "both";
}
```

## Streaming Implementation

OpenAI SDK async iterator → wrap chunks into a `ReadableStream` → `new
Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })` →
client reads via `fetch()` + `response.body.getReader()` (POST rules out
`EventSource`). Persist the user message immediately on send; persist the
assistant message (with `page_citation` parsed via `/\[Page (\d+)\]/`) once
the stream completes.

`useChatStream.ts`: a `useMutation` that performs the fetch+stream read,
accumulates chunks in local state for live rendering, then calls
`queryClient.setQueryData` to merge the final message into the cached chat
history on completion.

## Design

User bubble = Blue 50 background, right-aligned; assistant bubble = Grey 25
background, left-aligned; both Paragraph Large Medium. Page-citation chip =
`Badge` primitive with `color="blue"`, clickable to navigate the viewer
(reuses `ContractViewerContext` from spec 04).

## Edge Cases

- Chat attempted before `status === 'completed'` → `404` (indistinguishable
  from not-found, per the no-403 rule).
- Message >5000 chars → `422` before any OpenAI call.
- OpenAI stream interrupted mid-response → persist whatever was streamed so
  far with a `[truncated]` marker rather than losing it silently.

## Acceptance Criteria (PRD US-007, US-012)

- Chat responds within 15 seconds.
- Every grounded response cites a page number.
- Reopening a contract loads its previous chat session from Supabase.
