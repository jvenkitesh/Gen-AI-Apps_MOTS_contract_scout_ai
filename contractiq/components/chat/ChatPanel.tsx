"use client";

import { useEffect, useState } from "react";
import { useChatStream, type ChatMessageData } from "@/lib/hooks/useChatStream";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

export function ChatPanel({ contractId, onClose }: { contractId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { sendMessage, streamingContent, isSending, error } = useChatStream(contractId);

  useEffect(() => {
    fetch(`/api/contracts/${contractId}/chat`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []))
      .finally(() => setIsLoadingHistory(false));
  }, [contractId]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[32rem] w-96 flex-col rounded-lg border border-grey-100 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-grey-100 p-3">
        <h3 className="text-body-lg font-medium text-grey-900">Chat with Contract</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-grey-400 hover:text-grey-900"
          aria-label="Close chat"
        >
          &times;
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {isLoadingHistory ? (
          <p className="text-body-sm text-grey-500">Loading...</p>
        ) : messages.length === 0 && streamingContent === null ? (
          <p className="text-body-sm text-grey-500">Ask your first question about this contract.</p>
        ) : (
          messages.map((m, i) => <ChatMessage key={i} message={m} />)
        )}
        {streamingContent !== null && (
          <ChatMessage message={{ role: "assistant", content: streamingContent || "..." }} />
        )}
        {error && <p className="text-body-sm text-red-700">{error}</p>}
      </div>

      <ChatInput onSend={(message) => sendMessage(message, setMessages)} disabled={isSending} />
    </div>
  );
}
