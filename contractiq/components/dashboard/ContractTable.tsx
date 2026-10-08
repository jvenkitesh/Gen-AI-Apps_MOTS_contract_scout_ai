"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { ContractSummary, SortField, SortOrder } from "@/lib/hooks/useContracts";

const STATUS_COLOR: Record<ContractSummary["status"], "green" | "yellow" | "red" | "blue"> = {
  completed: "green",
  processing: "blue",
  uploaded: "yellow",
  error: "red",
};

export function ContractTable({
  items,
  sort,
  order,
  onSortChange,
}: {
  items: ContractSummary[];
  sort: SortField;
  order: SortOrder;
  onSortChange: (field: SortField) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="text-body-sm text-grey-500">
        No contracts reviewed yet -- upload your first contract to begin.
      </p>
    );
  }

  function headerButton(field: SortField, label: string) {
    return (
      <button
        type="button"
        onClick={() => onSortChange(field)}
        className="text-body-sm font-medium text-grey-500 hover:text-grey-900"
      >
        {label} {sort === field ? (order === "asc" ? "↑" : "↓") : ""}
      </button>
    );
  }

  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg bg-white">
      <thead>
        <tr className="border-b border-grey-100">
          <th className="p-3 text-left">{headerButton("name", "Name")}</th>
          <th className="p-3 text-left">{headerButton("type", "Type")}</th>
          <th className="p-3 text-left">{headerButton("date", "Date")}</th>
          <th className="p-3 text-left text-body-sm font-medium text-grey-500">Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-grey-50 last:border-0 hover:bg-grey-25">
            <td className="p-3">
              <Link href={`/contracts/${item.id}`} className="text-body-lg text-grey-900 hover:underline">
                {item.original_filename}
              </Link>
            </td>
            <td className="p-3 text-body-sm text-grey-500">{item.contract_type}</td>
            <td className="p-3 text-body-sm text-grey-500">
              {new Date(item.created_at).toLocaleDateString()}
            </td>
            <td className="p-3">
              <Badge color={STATUS_COLOR[item.status]}>{item.status}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
