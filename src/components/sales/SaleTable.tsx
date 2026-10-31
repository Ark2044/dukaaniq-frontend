import Link from "next/link";
import { SaleStatusBadge, VoiceBadge } from "./SaleBadges";
import { formatDateTime, formatINR } from "@/lib/utils/format";
import type { SaleSummary } from "@/types/sale";

export function SaleTable({ sales }: { sales: SaleSummary[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Sales history</caption>
        <thead className="border-b border-line bg-background text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Sale</th>
            <th scope="col" className="px-4 py-3 font-semibold">Date</th>
            <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Items</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Net</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Due</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-background/60">
              <td className="px-4 py-3">
                <Link href={`/sales/${sale.id}`} className="inline-flex min-h-11 items-center font-semibold hover:underline">
                  {sale.saleNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted">{formatDateTime(sale.createdAt)}</td>
              <td className="px-4 py-3">{sale.customerName ?? <span className="text-muted">Walk-in</span>}</td>
              <td className="px-4 py-3 text-right">{sale.itemCount}</td>
              <td className="px-4 py-3 text-right font-semibold">{formatINR(sale.netAmount)}</td>
              {sale.status === "PENDING_PAYMENT" ? (
                <td className="px-4 py-3 text-right text-muted">
                  <span aria-label="Not due yet, awaiting Paytm payment">—</span>
                </td>
              ) : (
                <td className={sale.dueAmount > 0 ? "px-4 py-3 text-right font-semibold text-warning" : "px-4 py-3 text-right text-muted"}>
                  {formatINR(sale.dueAmount)}
                </td>
              )}
              <td className="px-4 py-3">
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <SaleStatusBadge status={sale.status} paymentStatus={sale.paymentStatus} />
                  <VoiceBadge source={sale.source} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
