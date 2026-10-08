"use client";

import { useCallback, useEffect, useState } from "react";
import { useContractViewer } from "./ContractViewerContext";

// 1hr signed URL (see pdf-url route) -- refresh 5 minutes early so a long
// session never hits an expired URL (FR-06 edge case: "silent refresh").
const REFRESH_BEFORE_EXPIRY_MS = 55 * 60 * 1000;

export function PdfViewer({ contractId }: { contractId: string }) {
  const { targetPage } = useContractViewer();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUrl = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/contracts/${contractId}/pdf-url`)
      .then((res) => {
        if (!res.ok) throw new Error("unavailable");
        return res.json();
      })
      .then((data) => setSignedUrl(data.signed_url))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [contractId]);

  useEffect(() => {
    loadUrl();
  }, [loadUrl]);

  useEffect(() => {
    if (!signedUrl) return;
    const timer = setTimeout(loadUrl, REFRESH_BEFORE_EXPIRY_MS);
    return () => clearTimeout(timer);
  }, [signedUrl, loadUrl]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[600px] items-center justify-center rounded-lg border border-grey-100 bg-white">
        <p className="text-body-sm text-grey-500">Loading PDF...</p>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="flex h-full min-h-[600px] flex-col items-center justify-center gap-3 rounded-lg border border-grey-100 bg-white">
        <p className="text-body-sm text-grey-500">Couldn&apos;t load the PDF viewer.</p>
        <button type="button" onClick={loadUrl} className="text-body-sm text-blue-500 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const src = targetPage ? `${signedUrl}#page=${targetPage}` : signedUrl;

  return (
    <iframe
      key={targetPage ?? "initial"}
      src={src}
      title="Contract PDF"
      className="h-full min-h-[600px] w-full rounded-lg border border-grey-100 bg-white"
    />
  );
}
