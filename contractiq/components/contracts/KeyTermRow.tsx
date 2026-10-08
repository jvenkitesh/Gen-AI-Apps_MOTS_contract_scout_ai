"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { useContractViewer } from "./ContractViewerContext";
import type { ContractTerm } from "@/lib/hooks/useContract";

export function KeyTermRow({
  contractId,
  term,
  disabled,
}: {
  contractId: string;
  term: ContractTerm;
  disabled: boolean;
}) {
  const { setTargetPage } = useContractViewer();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(term.value);
  const [showWhy, setShowWhy] = useState(false);

  const editMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch(`/api/contracts/${contractId}/terms/${term.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? "Could not save.");
      return body.term;
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
    },
  });

  return (
    <li data-testid={`term-row-${term.term_name}`} className="rounded-md border border-grey-100 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-body-sm font-medium text-grey-900">{term.term_name}</span>
            {term.is_manual && <Badge color="violet">Custom</Badge>}
            {term.is_edited && <Badge color="blue">Edited</Badge>}
          </div>

          {isEditing ? (
            <div className="mt-1 flex gap-2">
              <Input
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                disabled={editMutation.isPending}
                autoFocus
              />
              <button
                type="button"
                className="text-body-sm text-blue-500 disabled:opacity-60"
                disabled={editMutation.isPending}
                onClick={() => editMutation.mutate(draftValue)}
              >
                Save
              </button>
              <button
                type="button"
                className="text-body-sm text-grey-500"
                onClick={() => {
                  setIsEditing(false);
                  setDraftValue(term.value);
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="term-value-button"
              className="mt-1 block text-left text-body-lg text-grey-900 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled}
              onClick={() => setIsEditing(true)}
              title={disabled ? "Processing in progress, try again shortly." : "Click to edit"}
            >
              {term.value}
            </button>
          )}
          {editMutation.isError && (
            <p className="mt-1 text-body-sm text-red-700">{(editMutation.error as Error).message}</p>
          )}

          <button
            type="button"
            className="mt-1 text-body-sm text-grey-400 hover:underline"
            onClick={() => setShowWhy((v) => !v)}
          >
            {showWhy ? "Hide source" : "Why?"}
          </button>
          {showWhy && (
            <p className="mt-1 rounded-sm bg-grey-25 p-2 text-body-sm text-grey-500">
              &ldquo;{term.source_sentence}&rdquo;
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <ConfidenceBadge score={term.confidence_score} />
          <button
            type="button"
            className="text-body-sm text-blue-500 hover:underline"
            onClick={() => setTargetPage(term.page_number)}
          >
            Page {term.page_number}
          </button>
        </div>
      </div>
    </li>
  );
}
