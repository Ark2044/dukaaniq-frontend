"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Button, buttonStyles } from "@/components/common/Button";
import { cn } from "@/lib/utils/format";

interface PaymentOutcomeNoticeProps {
  kind: "paid" | "cancelled";
  saleId: string;
  /** Server's cancel reason, shown as given. */
  reason?: string | null;
  /** The shop pressed "Cancel payment" (as opposed to the payment failing or timing out). */
  abandoned?: boolean;
  /** Demo / test money must never read like real money. */
  simulated?: boolean;
  sandbox?: boolean;
  /** Move focus to the message when it appears (inside dialogs, where the old button just vanished). */
  focusOnMount?: boolean;
  onStartAgain?: () => void;
  startAgainHref?: string;
  onNewSale?: () => void;
  showViewSale?: boolean;
}

/** The final, server-decided result of a Paytm QR sale. The message is a polite live region. */
export function PaymentOutcomeNotice({
  kind,
  saleId,
  reason,
  abandoned = false,
  simulated = false,
  sandbox = false,
  focusOnMount = false,
  onStartAgain,
  startAgainHref,
  onNewSale,
  showViewSale = true,
}: PaymentOutcomeNoticeProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusOnMount) messageRef.current?.focus();
  }, [focusOnMount]);

  const paid = kind === "paid";
  return (
    <div className="space-y-3">
      <div
        ref={messageRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className={cn(
          "space-y-1 rounded-xl px-4 py-3 outline-none",
          paid ? (simulated || sandbox ? "bg-warning-soft" : "bg-success-soft") : "bg-danger-soft",
        )}
      >
        {paid ? (
          <>
            <p className={cn("flex items-center gap-2 text-base font-semibold", simulated || sandbox ? "text-warning" : "text-success")}>
              <CheckCircle2 className="h-5 w-5" aria-hidden /> Paid
            </p>
            <p className="text-sm">The sale is complete.</p>
            {simulated && <p className="text-sm">This was a simulated demo payment. No real money was received.</p>}
            {sandbox && <p className="text-sm">This was Paytm sandbox test money. No real money was received.</p>}
          </>
        ) : (
          <>
            <p className="flex items-start gap-2 text-base font-semibold text-danger">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <span>
                {abandoned ? "Payment cancelled" : "Payment not received"} — this sale was cancelled and the stock was restored.
              </span>
            </p>
            {reason && <p className="text-sm">Reason: {reason}</p>}
            {abandoned && (
              <p className="text-sm">
                If the customer still pays, that payment will be flagged for review on the Payments page. It is not lost, but it is not added
                to this sale.
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {!paid && startAgainHref && (
          <Link href={startAgainHref} className={buttonStyles("primary", "min-h-12 flex-1")}>
            Start again
          </Link>
        )}
        {!paid && !startAgainHref && onStartAgain && (
          <Button className="min-h-12 flex-1" onClick={onStartAgain}>
            Start again
          </Button>
        )}
        {showViewSale && (
          <Link href={`/sales/${saleId}`} className={buttonStyles(paid ? "primary" : "secondary", "min-h-12 flex-1")}>
            View sale
          </Link>
        )}
        {paid && onNewSale && (
          <Button variant="secondary" className="min-h-12 flex-1" onClick={onNewSale}>
            New sale
          </Button>
        )}
      </div>
    </div>
  );
}
