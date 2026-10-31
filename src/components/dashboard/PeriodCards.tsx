import { Card } from "@/components/common/Card";
import { formatINR } from "@/lib/utils/format";
import type { PeriodStats } from "@/types/analytics";

function Period({ label, stats }: { label: string; stats: PeriodStats }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold">{formatINR(stats.salesAmount)}</p>
      <p className="mt-1 text-xs text-muted">
        {stats.transactions} {stats.transactions === 1 ? "sale" : "sales"} · avg {formatINR(stats.averageOrderValue)}
      </p>
    </Card>
  );
}

export function PeriodCards({ last7Days, monthToDate }: { last7Days: PeriodStats; monthToDate: PeriodStats }) {
  return (
    <section aria-label="Sales over time" className="grid grid-cols-2 gap-3">
      <Period label="Last 7 days" stats={last7Days} />
      <Period label="Month to date" stats={monthToDate} />
    </section>
  );
}
