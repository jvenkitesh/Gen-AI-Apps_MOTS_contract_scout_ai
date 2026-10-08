import { Badge } from "@/components/ui/Badge";
import { useContractViewer } from "@/components/contracts/ContractViewerContext";
import type { ChatMessageData } from "@/lib/hooks/useChatStream";

export function ChatMessage({ message }: { message: ChatMessageData }) {
  const { setTargetPage } = useContractViewer();
  const isUser = message.role === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-lg bg-blue-50 px-3 py-2 text-body-lg text-grey-900"
            : "max-w-[80%] rounded-lg bg-grey-25 px-3 py-2 text-body-lg text-grey-900"
        }
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.page_citation && (
          <button
            type="button"
            onClick={() => setTargetPage(message.page_citation as number)}
            className="mt-1 inline-block"
          >
            <Badge color="blue">Page {message.page_citation}</Badge>
          </button>
        )}
      </div>
    </div>
  );
}
