import { Card } from "@/components/common/Card";
import { SimulatedBadge } from "@/components/common/Badge";
import { formatINR } from "@/lib/utils/format";
import type { AnalyticsSummary } from "@/types/analytics";

function Row({ label, value, extra, tone }: { label: string; value: number; extra?: React.ReactNode; tone?: "danger" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="flex items-center gap-2 text-sm">
        {label}
        {extra}
      </dt>
      <dd className={tone === "danger" ? "text-sm font-semibold text-danger" : "text-sm font-semibold"}>{formatINR(value)}</dd>
    </div>
  );
}

/** Verified Paytm and simulated Paytm are separate rows; simulated money never counts as verified. */
export function CollectionsCard({ collections }: { collections: AnalyticsSummary["collectionsToday"] }) {
  return (
    <Card className="space-y-1">
      <h2 className="text-base font-semibold">Collections today</h2>
      <dl className="divide-y divide-line">
        <Row label="Cash" value={collections.cash} />
        <Row label="UPI" value={collections.upi} extra={<span className="text-xs font-normal text-muted">recorded by you</span>} />
        <Row label="Card" value={collections.card} />
        {collections.paytmVerified > 0 && <Row label="Paytm (verified)" value={collections.paytmVerified} />}
        {collections.paytmSimulated > 0 && <Row label="Paytm (demo)" value={collections.paytmSimulated} extra={<SimulatedBadge />} />}
        {collections.refunds > 0 && <Row label="Refunds" value={collections.refunds} tone="danger" />}
      </dl>
    </Card>
  );
}
