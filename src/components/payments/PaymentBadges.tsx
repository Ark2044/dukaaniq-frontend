import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge, SimulatedBadge } from "@/components/common/Badge";
import { PAYMENT_STATUS_LABELS, reviewNotice } from "@/lib/payments/status";
import type { PaymentLabel, PaymentReviewReason } from "@/types/payment";
import type { PaymentRecordStatus } from "@/types/sale";

const STATUS_TONES: Record<PaymentRecordStatus, "success" | "warning" | "danger" | "neutral"> = {
  CREATED: "neutral",
  PENDING: "warning",
  SUCCESS: "success",
  FAILED: "danger",
  UNKNOWN: "warning",
  REFUNDED: "neutral",
};

/** The server's trust label (SIMULATED / PAYTM SANDBOX / PAYTM), always shown beside a provider payment. */
export function PaymentLabelBadge({ label }: { label: PaymentLabel }) {
  if (label === "SIMULATED") return <SimulatedBadge />;
  const sandbox = label === "PAYTM SANDBOX";
  return (
    <span
      title={sandbox ? "Paytm sandbox. This is test money, not real money." : "Paytm payment"}
      className={
        sandbox
          ? "inline-flex items-center rounded-full border border-warning/40 bg-warning-soft px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-warning"
          : "inline-flex items-center rounded-full border border-navy-700/30 bg-background px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-navy-900"
      }
    >
      {sandbox ? "Paytm sandbox" : "Paytm"}
    </span>
  );
}

/** Shown only when the server confirmed the payment with Paytm. */
export function VerifiedIndicator() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Verified by Paytm
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentRecordStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

/** Plain-language explanation of why a payment needs the merchant's attention. */
export function NeedsReviewNotice({ reason }: { reason: PaymentReviewReason | null }) {
  const { title, explanation } = reviewNotice(reason);
  return (
    <div role="note" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft px-3 py-2.5">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-warning">Needs your review: {title}</p>
        <p className="mt-0.5 text-sm">{explanation}</p>
      </div>
    </div>
  );
}
