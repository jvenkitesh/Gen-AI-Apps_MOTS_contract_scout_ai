"use client";

import { useState } from "react";
import Link from "next/link";
import { useContracts, useDashboardSummary, type SortField } from "@/lib/hooks/useContracts";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { ContractTable } from "@/components/dashboard/ContractTable";

export default function DashboardPage() {
  const [sort, setSort] = useState<SortField>("date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: contractsData, isLoading: contractsLoading } = useContracts(sort, order);

  function handleSortChange(field: SortField) {
    if (field === sort) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setOrder("desc");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h5 text-grey-900">Dashboard</h1>
        <Link
          href="/contracts/upload"
          className="rounded-md bg-blue-500 px-6 py-2.5 text-body-lg font-medium text-white transition hover:bg-blue-600"
        >
          Review a Contract
        </Link>
      </div>

      {summaryLoading ? (
        <p className="text-body-sm text-grey-500">Loading...</p>
      ) : summary ? (
        <div className="mb-8">
          <SummaryCards summary={summary} />
        </div>
      ) : null}

      <h2 className="mb-3 text-h5 text-grey-900">All Contracts</h2>
      {contractsLoading ? (
        <p className="text-body-sm text-grey-500">Loading...</p>
      ) : contractsData ? (
        <ContractTable items={contractsData.items} sort={sort} order={order} onSortChange={handleSortChange} />
      ) : null}
    </main>
  );
}
