"use client";

import { useQuery } from "@tanstack/react-query";

export interface ContractTerm {
  id: string;
  term_name: string;
  value: string;
  page_number: number;
  confidence_score: number;
  source_sentence: string;
  is_manual: boolean;
  is_edited: boolean;
}

export interface ContractDetail {
  contract: {
    id: string;
    contract_type: "NDA" | "MSA";
    status: "uploaded" | "processing" | "completed" | "error";
    original_filename: string;
    page_count: number | null;
    error_message: string | null;
    contract_text: string | null;
  };
  terms: ContractTerm[];
  custom_terms: Array<{ id: string; term_name: string }>;
  pdf_available: boolean;
}

async function fetchContract(id: string): Promise<ContractDetail> {
  const res = await fetch(`/api/contracts/${id}`);
  if (!res.ok) throw new Error("Failed to load contract");
  return res.json();
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ["contract", id],
    queryFn: () => fetchContract(id),
    refetchInterval: (query) => (query.state.data?.contract.status === "processing" ? 2000 : false),
  });
}
