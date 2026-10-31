import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SaleStatusBadge, VoiceBadge } from "./SaleBadges";
import { formatDateTime } from "@/lib/utils/format";
import { formatINR } from "@/lib/utils/format";
import type { SaleSummary } from "@/types/sale";

const itemsLabel = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;

/** Mobile presentation of a sale in history. */
export function SaleCard({ sale }: { sale: SaleSummary }) {
  return (
    <li>
      <Link
        href={`/sales/${sale.id}`}
        className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-4 active:bg-background"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">{sale.saleNumber}</p>
            <SaleStatusBadge status={sale.status} paymentStatus={sale.paymentStatus} />
            <VoiceBadge source={sale.source} />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">
            {sale.customerName ?? "Walk-in"} · {itemsLabel(sale.itemCount)}
          </p>
          <p className="text-xs text-muted">{formatDateTime(sale.createdAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold">{formatINR(sale.netAmount)}</p>
          {sale.status === "PENDING_PAYMENT" ? (
            <p className="text-xs font-medium text-warning">Awaiting payment</p>
          ) : (
            sale.dueAmount > 0 && <p className="text-xs font-medium text-warning">Due {formatINR(sale.dueAmount)}</p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}
