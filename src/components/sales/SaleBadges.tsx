import { Mic } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import type { PaymentStatus, SaleSource, SaleStatus } from "@/types/sale";

const PAYMENT_TONES = { PAID: "success", PARTIAL: "warning", UNPAID: "danger" } as const;
const PAYMENT_LABELS = { PAID: "Paid", PARTIAL: "Partial", UNPAID: "Unpaid" } as const;

/**
 * CANCELLED overrides the payment status (the server sends paymentStatus=null for cancelled sales), and a sale
 * waiting for its Paytm payment is never shown as paid or as ordinary unpaid credit.
 */
export function SaleStatusBadge({ status, paymentStatus }: { status: SaleStatus; paymentStatus: PaymentStatus | null }) {
  if (status === "CANCELLED") return <Badge tone="neutral">Cancelled</Badge>;
  if (status === "PENDING_PAYMENT") return <Badge tone="warning">Awaiting payment</Badge>;
  if (!paymentStatus) return null;
  return <Badge tone={PAYMENT_TONES[paymentStatus]}>{PAYMENT_LABELS[paymentStatus]}</Badge>;
}

export function VoiceBadge({ source }: { source: SaleSource }) {
  if (source !== "VOICE") return null;
  return (
    <span
      title="Recorded by voice"
      className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 text-xs font-semibold text-muted"
    >
      <Mic className="h-3 w-3" aria-hidden /> Voice
    </span>
  );
}
