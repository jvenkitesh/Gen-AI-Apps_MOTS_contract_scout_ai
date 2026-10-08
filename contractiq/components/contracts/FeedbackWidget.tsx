"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function FeedbackWidget({ contractId }: { contractId: string }) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const feedbackMutation = useMutation({
    mutationFn: async (payload: { rating: "up" | "down"; comment?: string }) => {
      const res = await fetch(`/api/contracts/${contractId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? "Could not submit feedback.");
      return body.feedback;
    },
    onSuccess: () => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    },
  });

  function handleRate(value: "up" | "down") {
    setRating(value);
    setShowCommentBox(true);
    feedbackMutation.mutate({ rating: value, comment: comment || undefined });
  }

  function handleCommentSubmit() {
    if (!rating) return;
    feedbackMutation.mutate({ rating, comment: comment || undefined });
  }

  return (
    <div className="mt-6 rounded-lg bg-white p-4">
      <p className="mb-2 text-body-sm font-medium text-grey-900">Was this analysis helpful?</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleRate("up")}
          className={
            rating === "up"
              ? "rounded-md bg-blue-50 px-3 py-1.5 text-body-lg text-blue-700"
              : "rounded-md border border-grey-200 px-3 py-1.5 text-body-lg text-grey-500 hover:bg-grey-50"
          }
          aria-label="Thumbs up"
        >
          &#128077;
        </button>
        <button
          type="button"
          onClick={() => handleRate("down")}
          className={
            rating === "down"
              ? "rounded-md bg-blue-50 px-3 py-1.5 text-body-lg text-blue-700"
              : "rounded-md border border-grey-200 px-3 py-1.5 text-body-lg text-grey-500 hover:bg-grey-50"
          }
          aria-label="Thumbs down"
        >
          &#128078;
        </button>
      </div>

      {showCommentBox && (
        <div className="mt-3 flex gap-2">
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment..."
            maxLength={2000}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={handleCommentSubmit}
            disabled={feedbackMutation.isPending}
          >
            Save
          </Button>
        </div>
      )}

      {feedbackMutation.isError && (
        <p className="mt-2 text-body-sm text-red-700">{(feedbackMutation.error as Error).message}</p>
      )}

      {showToast && (
        <div className="fixed bottom-20 right-4 z-50 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-body-sm text-green-700 shadow-lg">
          Thanks for your feedback!
        </div>
      )}
    </div>
  );
}
