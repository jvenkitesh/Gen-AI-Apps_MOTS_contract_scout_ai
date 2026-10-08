"use client";

import { useEffect, useRef } from "react";
import { useContractViewer } from "./ContractViewerContext";

function parsePages(contractText: string): Array<{ page: number; text: string }> {
  const parts = contractText.split(/\[PAGE (\d+)\]/);
  const pages: Array<{ page: number; text: string }> = [];
  // parts === ["", "1", "text1", "2", "text2", ...] -- odd indices are page numbers
  for (let i = 1; i < parts.length; i += 2) {
    pages.push({ page: Number(parts[i]), text: parts[i + 1]?.trim() ?? "" });
  }
  return pages;
}

export function TextViewerFallback({ contractText }: { contractText: string }) {
  const { targetPage } = useContractViewer();
  const containerRef = useRef<HTMLDivElement>(null);
  const pages = parsePages(contractText);

  useEffect(() => {
    if (!targetPage) return;
    const el = containerRef.current?.querySelector(`[data-page="${targetPage}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [targetPage]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[600px] overflow-y-auto rounded-lg border border-grey-100 bg-white p-6"
    >
      <p className="mb-4 rounded-sm bg-yellow-50 px-3 py-2 text-body-sm text-yellow-800">
        PDF preview isn&apos;t available for this contract -- showing extracted text instead.
      </p>
      {pages.map(({ page, text }) => (
        <section
          key={page}
          data-page={page}
          className={page === targetPage ? "mb-6 rounded-md bg-blue-50 p-3" : "mb-6"}
        >
          <h3 className="mb-2 text-body-sm font-medium text-grey-400">Page {page}</h3>
          <p className="whitespace-pre-wrap text-body-lg text-grey-900">{text}</p>
        </section>
      ))}
    </div>
  );
}
