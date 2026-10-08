"use client";

import { useCallback, useState } from "react";

export interface ChatMessageData {
  role: "user" | "assistant";
  content: string;
  page_citation?: number | null;
}

export function useChatStream(contractId: string) {
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (message: string, onLocalMessages: (updater: (prev: ChatMessageData[]) => ChatMessageData[]) => void) => {
      setError(null);
      setIsSending(true);
      setStreamingContent("");

      onLocalMessages((prev) => [...prev, { role: "user", content: message }]);

      try {
        const res = await fetch(`/api/contracts/${contractId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? "Chat failed. Please try again.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setStreamingContent(accumulated);
        }

        const pageCitationMatch = accumulated.match(/\[Page (\d+)\]/);
        onLocalMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: accumulated,
            page_citation: pageCitationMatch ? Number(pageCitationMatch[1]) : null,
          },
        ]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsSending(false);
        setStreamingContent(null);
      }
    },
    [contractId]
  );

  return { sendMessage, streamingContent, isSending, error };
}
