import { Card } from "@/components/common/Card";
import { formatINR } from "@/lib/utils/format";
import type { AnalyticsSummary } from "@/types/analytics";

/** Growth is only shown when the server computed it (null = yesterday had no sales, so no percentage exists). */
function Growth({ percent, yesterday }: { percent: number; yesterday: number }) {
  const up = percent >= 0;
  return (
    <p
      className={`mt-2 inline-flex flex-wrap items-center gap-x-1.5 rounded-full px-3 py-1 text-sm font-semibold ${up ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span>
        {Math.abs(percent).toFixed(1)}% {up ? "up" : "down"} vs yesterday
      </span>
      <span className="font-normal opacity-80">({formatINR(yesterday)})</span>
    </p>
  );
}

export function TodayHero({ summary }: { summary: AnalyticsSummary }) {
  const { todayStats, yesterdayStats, growthVsYesterdayPercent } = summary;
  return (
    <Card className="bg-navy-900 text-white">
      <p className="text-sm text-white/70">Today&apos;s sales</p>
      <p className="mt-1 text-4xl font-bold tracking-tight" data-testid="today-sales">
        {formatINR(todayStats.salesAmount)}
      </p>
      {growthVsYesterdayPercent !== null && (
        <Growth percent={growthVsYesterdayPercent} yesterday={yesterdayStats.salesAmount} />
      )}
      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
        <div>
          <dt className="text-xs text-white/70">Transactions</dt>
          <dd className="text-xl font-semibold">{todayStats.transactions}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/70">Average order value</dt>
          <dd className="text-xl font-semibold">{formatINR(todayStats.averageOrderValue)}</dd>
        </div>
      </dl>
    </Card>
  );
}
