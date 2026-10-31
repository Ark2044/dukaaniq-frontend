"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import { NeedsReviewNotice, PaymentLabelBadge, PaymentStatusBadge, VerifiedIndicator } from "./PaymentBadges";
import { messageOf } from "./paymentErrors";
import { useReconcilePayment } from "@/lib/hooks/usePayments";
import { PAYMENT_STATUS_LABELS, isPaymentInProgress } from "@/lib/payments/status";
import { formatDateTime, formatINR } from "@/lib/utils/format";
import type { PaymentView } from "@/types/payment";

/** One provider payment: amount, trust label, status, a link to its sale and a "Check status" action while in progress. */
export function PaymentRow({ payment, attention = false }: { payment: PaymentView; attention?: boolean }) {
  const toast = useToast();
  const reconcile = useReconcilePayment();
  const inProgress = isPaymentInProgress(payment.status);

  const check = async () => {
    try {
      const result = await reconcile.mutateAsync(payment.id);
      toast.info(`${payment.orderId}: ${PAYMENT_STATUS_LABELS[result.status]}.`);
    } catch (error) {
      toast.error(messageOf(error));
    }
  };

  return (
    <li className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-lg font-semibold">{formatINR(payment.amount)}</p>
          <div className="flex flex-wrap items-center gap-2">
            <PaymentStatusBadge status={payment.status} />
            <PaymentLabelBadge label={payment.label} />
            {payment.verified && <VerifiedIndicator />}
          </div>
        </div>
        {inProgress && (
          <Button variant="secondary" className="min-h-11 shrink-0 px-3" loading={reconcile.isPending} onClick={check} aria-label={`Check status of order ${payment.orderId}`}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Check status
          </Button>
        )}
      </div>
      <p className="text-sm text-muted">
        <Link href={`/sales/${payment.saleId}`} className="font-medium text-navy-700 underline-offset-2 hover:underline">
          {payment.saleNumber}
        </Link>
        {" · "}Order <span className="font-mono">{payment.orderId}</span>
        {" · "}
        {formatDateTime(payment.createdAt)}
      </p>
      {payment.status === "FAILED" && payment.failureReason && <p className="text-sm text-danger">{payment.failureReason}</p>}
      {payment.status === "UNKNOWN" && (
        <p className="text-sm text-warning">We could not confirm this payment. Check its status before creating another QR.</p>
      )}
      {attention && !payment.needsReview && (payment.status === "PENDING" || payment.status === "CREATED") && (
        <p className="text-sm text-warning">This has been waiting longer than usual. Check status to see if the customer paid.</p>
      )}
      {payment.needsReview && <NeedsReviewNotice reason={payment.reviewReason} />}
    </li>
  );
}
