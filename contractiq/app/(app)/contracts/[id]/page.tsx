"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useContract } from "@/lib/hooks/useContract";
import { ContractViewerProvider } from "@/components/contracts/ContractViewerContext";
import { PdfViewer } from "@/components/contracts/PdfViewer";
import { TextViewerFallback } from "@/components/contracts/TextViewerFallback";
import { KeyTermsPanel } from "@/components/contracts/KeyTermsPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { FeedbackWidget } from "@/components/contracts/FeedbackWidget";
import { Button } from "@/components/ui/Button";

export default function ContractResultsPage({ params }: { params: { id: string } }) {
  const { data, isLoading, isError, refetch } = useContract(params.id);
  const triggeredRef = useRef(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const processMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/contracts/${params.id}/process`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Processing failed.");
      }
      return res.json();
    },
    onSettled: () => refetch(),
  });

  // Processing starts automatically once the results page loads for a
  // freshly-uploaded contract -- the user already clicked "Process Contract"
  // to get here (spec 02's UploadForm).
  useEffect(() => {
    if (!data || triggeredRef.current) return;
    if (data.contract.status === "uploaded") {
      triggeredRef.current = true;
      processMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-10">
        <p className="text-body-sm text-grey-500">Loading...</p>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-10">
        <p className="text-body-sm text-red-700">Could not load this contract.</p>
      </main>
    );
  }

  const { contract, terms, pdf_available } = data;
  const isProcessing = contract.status === "processing" || processMutation.isPending;

  return (
    <ContractViewerProvider>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-h5 text-grey-900">{contract.original_filename}</h1>
            <p className="text-body-sm text-grey-500">{contract.contract_type}</p>
          </div>
          <p className="text-body-sm text-grey-400">Not legal advice.</p>
        </div>

        {isProcessing && (
          <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-body-sm text-blue-700">
            Analysing with AI... this can take up to 30 seconds.
          </div>
        )}

        {contract.status === "error" && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-body-sm text-red-700">
            <span>{contract.error_message ?? "Processing failed."}</span>
            <button
              type="button"
              className="font-medium hover:underline disabled:opacity-60"
              onClick={() => processMutation.mutate()}
              disabled={processMutation.isPending}
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            {pdf_available ? (
              <PdfViewer contractId={contract.id} />
            ) : (
              <TextViewerFallback contractText={contract.contract_text ?? ""} />
            )}
          </div>
          <div>
            {contract.status === "completed" ? (
              <KeyTermsPanel contractId={contract.id} terms={terms} disabled={false} />
            ) : (
              <p className="text-body-sm text-grey-500">
                Key terms will appear here once processing completes.
              </p>
            )}
          </div>
        </div>

        {contract.status === "completed" && <FeedbackWidget contractId={contract.id} />}

        {contract.status === "completed" && !isChatOpen && (
          <Button
            type="button"
            className="fixed bottom-4 right-4 z-40"
            onClick={() => setIsChatOpen(true)}
          >
            Chat with Contract
          </Button>
        )}
        {isChatOpen && <ChatPanel contractId={contract.id} onClose={() => setIsChatOpen(false)} />}
      </main>
    </ContractViewerProvider>
  );
}
