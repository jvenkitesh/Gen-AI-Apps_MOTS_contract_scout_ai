"use client";

import { useQuery } from "@tanstack/react-query";

export interface ContractSummary {
  id: string;
  original_filename: string;
  contract_type: "NDA" | "MSA";
  status: "uploaded" | "processing" | "completed" | "error";
  created_at: string;
}

export type SortField = "date" | "name" | "type";
export type SortOrder = "asc" | "desc";

async function fetchContracts(
  sort: SortField,
  order: SortOrder
): Promise<{ items: ContractSummary[]; total: number }> {
  const params = new URLSearchParams({ sort, order });
  const res = await fetch(`/api/contracts?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load contracts");
  return res.json();
}

export function useContracts(sort: SortField = "date", order: SortOrder = "desc") {
  return useQuery({
    queryKey: ["contracts", sort, order],
    queryFn: () => fetchContracts(sort, order),
  });
}

export interface DashboardSummary {
  total: number;
  by_type: { NDA: number; MSA: number };
  recent: ContractSummary[];
}

async function fetchSummary(): Promise<DashboardSummary> {
  const res = await fetch("/api/dashboard/summary");
  if (!res.ok) throw new Error("Failed to load summary");
  return res.json();
}

export function useDashboardSummary() {
  return useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchSummary });
}
