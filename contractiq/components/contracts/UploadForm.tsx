"use client";

import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

type ContractType = "NDA" | "MSA";

type UploadResponse = {
  contract_id: string;
  contract_type: ContractType;
  page_count: number;
  standard_terms: string[];
};

type CustomTerm = { id: string; term_name: string };

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contractType, setContractType] = useState<ContractType | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customTerms, setCustomTerms] = useState<CustomTerm[]>([]);
  const [newTermName, setNewTermName] = useState("");
  const [termError, setTermError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contract_type", contractType as ContractType);
      const res = await fetch("/api/contracts/upload", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? "Upload failed. Please try again.");
      return body as UploadResponse;
    },
    onSuccess: (data) => {
      setUploadResult(data);
      setUploadError(null);
    },
    onError: (err: Error) => setUploadError(err.message),
  });

  const addTermMutation = useMutation({
    mutationFn: async (termName: string) => {
      const res = await fetch(`/api/contracts/${uploadResult!.contract_id}/custom-terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term_name: termName }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? "Could not add term.");
      return body as CustomTerm;
    },
    onSuccess: (term) => {
      setCustomTerms((prev) => [...prev, term]);
      setNewTermName("");
      setTermError(null);
    },
    onError: (err: Error) => setTermError(err.message),
  });

  const removeTermMutation = useMutation({
    mutationFn: async (termId: string) => {
      const res = await fetch(
        `/api/contracts/${uploadResult!.contract_id}/custom-terms/${termId}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Could not remove term.");
      }
      return termId;
    },
    onMutate: async (termId) => {
      const previous = customTerms;
      setCustomTerms((prev) => prev.filter((t) => t.id !== termId));
      return { previous };
    },
    onError: (_err, _termId, context) => {
      if (context?.previous) setCustomTerms(context.previous);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contractType) return;
    uploadMutation.mutate(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !contractType) return;
    uploadMutation.mutate(file);
  }

  function handleAddTerm(e: FormEvent) {
    e.preventDefault();
    const trimmed = newTermName.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      setTermError("Term name must be 2-100 characters.");
      return;
    }
    addTermMutation.mutate(trimmed);
  }

  if (uploadResult) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-h5 text-grey-900">
            Standard terms for {uploadResult.contract_type}
          </h2>
          <p className="mt-1 text-body-sm text-grey-500">
            These will be extracted automatically. Add up to 5 custom terms below if needed.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {uploadResult.standard_terms.map((term) => (
              <li
                key={term}
                className="rounded-sm border border-grey-100 bg-grey-25 px-3 py-1 text-body-sm text-grey-900"
              >
                {term}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-body-lg font-medium text-grey-900">
            Custom terms ({customTerms.length}/5)
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {customTerms.map((term) => (
              <li key={term.id}>
                <Badge color="violet" className="inline-flex items-center gap-2">
                  {term.term_name}
                  <button
                    type="button"
                    aria-label={`Remove ${term.term_name}`}
                    onClick={() => removeTermMutation.mutate(term.id)}
                    className="text-violet-700 hover:text-violet-900"
                  >
                    &times;
                  </button>
                </Badge>
              </li>
            ))}
          </ul>

          {customTerms.length < 5 && (
            <form onSubmit={handleAddTerm} className="mt-3 flex gap-2">
              <Input
                value={newTermName}
                onChange={(e) => setNewTermName(e.target.value)}
                placeholder="e.g. Exclusivity"
                disabled={addTermMutation.isPending}
              />
              <Button type="submit" variant="ghost" disabled={addTermMutation.isPending}>
                + Add
              </Button>
            </form>
          )}
          {termError && <p className="mt-2 text-body-sm text-red-700">{termError}</p>}
        </div>

        <Button
          type="button"
          className="w-full"
          onClick={() => router.push(`/contracts/${uploadResult.contract_id}`)}
        >
          Process Contract
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-body-lg font-medium text-grey-900">Contract type</h2>
        <div className="flex gap-2">
          {(["NDA", "MSA"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setContractType(type)}
              className={
                contractType === type
                  ? "rounded-md bg-blue-500 px-4 py-2 text-body-lg font-medium text-white"
                  : "rounded-md border border-grey-200 px-4 py-2 text-body-lg font-medium text-grey-900 hover:bg-grey-50"
              }
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`rounded-lg border-2 border-dashed px-6 py-12 text-center ${
          contractType ? "border-grey-200 hover:bg-grey-50" : "border-grey-100 opacity-60"
        }`}
      >
        <p className="text-body-lg text-grey-900">
          {contractType ? "Drag & drop a PDF here" : "Select a contract type first"}
        </p>
        <p className="mt-1 text-body-sm text-grey-500">or</p>
        <Button
          type="button"
          variant="ghost"
          className="mt-3"
          disabled={!contractType || uploadMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadMutation.isPending ? "Uploading..." : "Choose file"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="mt-3 text-body-sm text-grey-400">PDF only, up to 10MB, 20 pages.</p>
      </div>

      {uploadError && (
        <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-700">
          {uploadError}
        </div>
      )}
    </div>
  );
}
