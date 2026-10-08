import type { DashboardSummary } from "@/lib/hooks/useContracts";

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg bg-white p-4">
        <p className="text-body-sm text-grey-500">Total contracts</p>
        <p className="text-h3 text-grey-900">{summary.total}</p>
      </div>
      <div className="rounded-lg bg-white p-4">
        <p className="text-body-sm text-grey-500">NDAs</p>
        <p className="text-h3 text-grey-900">{summary.by_type.NDA}</p>
      </div>
      <div className="rounded-lg bg-white p-4">
        <p className="text-body-sm text-grey-500">MSAs</p>
        <p className="text-h3 text-grey-900">{summary.by_type.MSA}</p>
      </div>
    </div>
  );
}
