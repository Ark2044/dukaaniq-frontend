import { formatINR } from "@/lib/utils/format";
import type { Sale } from "@/types/sale";

type Totals = Pick<Sale, "subtotal" | "discountAmount" | "totalAmount" | "returnedAmount" | "netAmount" | "paidAmount" | "dueAmount">;

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "warning" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "text-base font-semibold" : "text-muted"}>{label}</dt>
      <dd className={[strong ? "text-lg font-bold" : "font-medium", tone === "warning" ? "text-warning" : ""].join(" ")}>{value}</dd>
    </div>
  );
}

/** Server-computed amounts, exactly as returned in the Sale. A sale awaiting Paytm has nothing paid or due yet. */
export function SaleTotalsList({ sale, awaitingPayment = false }: { sale: Totals; awaitingPayment?: boolean }) {
  return (
    <dl aria-label="Sale amounts" className="space-y-2 text-sm">
      <Row label="Subtotal" value={formatINR(sale.subtotal)} />
      {sale.discountAmount > 0 && <Row label="Discount" value={`− ${formatINR(sale.discountAmount)}`} />}
      <Row label="Total" value={formatINR(sale.totalAmount)} />
      {sale.returnedAmount > 0 && <Row label="Returned" value={`− ${formatINR(sale.returnedAmount)}`} />}
      <div className="border-t border-line pt-2">
        <Row label="Net amount" value={formatINR(sale.netAmount)} strong />
      </div>
      {awaitingPayment ? (
        <Row label="Payment" value="Awaiting Paytm payment" tone="warning" />
      ) : (
        <>
          <Row label="Paid" value={formatINR(sale.paidAmount)} />
          <Row label="Due" value={formatINR(sale.dueAmount)} tone={sale.dueAmount > 0 ? "warning" : undefined} />
        </>
      )}
    </dl>
  );
}
