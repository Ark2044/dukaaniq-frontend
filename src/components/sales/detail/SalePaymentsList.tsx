import { Badge } from "@/components/common/Badge";
import { PaymentLabelBadge, VerifiedIndicator } from "@/components/payments/PaymentBadges";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants/options";
import { formatDateTime, formatINR } from "@/lib/utils/format";
import type { PaymentKind, SalePayment } from "@/types/sale";

const KIND_LABELS: Record<PaymentKind, string> = {
  SALE_PAYMENT: "Payment",
  CREDIT_SETTLEMENT: "Credit settlement",
  REFUND: "Refund",
};

/** Trust labels come from the server's flags; manual entries say so. Old payloads without a label fall back to the provider. */
function PaymentTrust({ payment }: { payment: SalePayment }) {
  const label = payment.label ?? (payment.provider === "MOCK" || payment.simulated ? "SIMULATED" : null);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {label && <PaymentLabelBadge label={label} />}
      {payment.verified && <VerifiedIndicator />}
      {!label && !payment.verified && payment.provider === null && <span className="text-xs text-muted">Recorded by you</span>}
      {payment.status !== "SUCCESS" && <Badge tone={payment.status === "FAILED" ? "danger" : "neutral"}>{payment.status.toLowerCase()}</Badge>}
    </span>
  );
}

export function SalePaymentsList({ payments }: { payments: SalePayment[] }) {
  if (payments.length === 0) return <p className="text-sm text-muted">No payments recorded.</p>;
  return (
    <ul aria-label="Payments" className="divide-y divide-line">
      {payments.map((payment) => (
        <li key={payment.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold">
              {KIND_LABELS[payment.kind]} · {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
            </p>
            <PaymentTrust payment={payment} />
            <p className="text-xs text-muted">
              {formatDateTime(payment.createdAt)}
              {payment.orderId ? ` · Order ${payment.orderId}` : ""}
              {payment.note ? ` · ${payment.note}` : ""}
            </p>
          </div>
          <p className={payment.kind === "REFUND" ? "text-sm font-semibold text-danger" : "text-sm font-semibold"}>
            {payment.kind === "REFUND" ? `− ${formatINR(payment.amount)}` : formatINR(payment.amount)}
          </p>
        </li>
      ))}
    </ul>
  );
}
