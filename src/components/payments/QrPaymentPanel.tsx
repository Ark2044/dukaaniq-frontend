"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, CircleAlert, Clock, FlaskConical, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/common/Button";
import { NeedsReviewNotice, PaymentLabelBadge, VerifiedIndicator } from "./PaymentBadges";
import { useReconcilePayment, useSimulatePayment, usePaymentStatus } from "@/lib/hooks/usePayments";
import { canSimulate, isPaymentInProgress } from "@/lib/payments/status";
import { cn, formatINR } from "@/lib/utils/format";
import { messageOf } from "./paymentErrors";
import type { PaymentConfig, PaymentOutcome, PaymentView } from "@/types/payment";

/** Prominent warning shown for every simulated payment so demo data is never mistaken for real money. */
export function DemoQrBanner() {
  return (
    <div role="note" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft px-3 py-2.5 text-warning">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="text-sm font-semibold">Demo mode — this QR is not a real payment</p>
    </div>
  );
}

/** Paytm may hand back a bare Base64 PNG or a ready-made data URL. */
const imageSource = (qrImage: string) => (qrImage.startsWith("data:") ? qrImage : `data:image/png;base64,${qrImage}`);

export function PaymentQr({ payment }: { payment: PaymentView }) {
  const description = `QR code to pay ${formatINR(payment.amount)} for order ${payment.orderId}${
    payment.simulated ? ". Demo QR, not a real payment" : ""
  }`;
  return (
    <div
      className={cn(
        "mx-auto w-fit rounded-xl bg-white p-3",
        payment.simulated ? "border-2 border-dashed border-warning" : "border border-line",
      )}
    >
      {payment.qrImage ? (
        // The QR comes from Paytm as a data URL, so next/image has nothing to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSource(payment.qrImage)} alt={description} width={192} height={192} className="h-48 w-48" />
      ) : payment.qrData ? (
        <div role="img" aria-label={description}>
          <QRCodeSVG value={payment.qrData} size={192} marginSize={0} aria-hidden />
        </div>
      ) : null}
    </div>
  );
}

export function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

/** Re-renders every second with the current time; the interval is cleared on unmount. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Display-only countdown; whether the QR really expired is decided by the server's status. */
function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const now = useNow();
  const remaining = new Date(expiresAt).getTime() - now;
  if (Number.isNaN(remaining)) return null;
  return (
    <p className="flex items-center justify-center gap-1.5 text-sm text-muted">
      <Clock className="h-4 w-4" aria-hidden />
      {remaining > 0 ? (
        <span>
          QR expires in <span className="font-semibold tabular-nums text-foreground">{formatRemaining(remaining)}</span>
        </span>
      ) : (
        <span>QR time is up. Waiting for the server to confirm the final result.</span>
      )}
    </p>
  );
}

function StatusMessage({ payment }: { payment: PaymentView }) {
  switch (payment.status) {
    case "CREATED":
    case "PENDING":
      return (
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden /> Waiting for payment…
        </div>
      );
    case "SUCCESS":
      return (
        <div className="space-y-1">
          <p className={cn("flex items-center gap-2 text-base font-semibold", payment.simulated ? "text-warning" : "text-success")}>
            <CheckCircle2 className="h-5 w-5" aria-hidden /> Paid
          </p>
          {payment.simulated && <p className="text-sm">This was a simulated demo payment. No real money was received.</p>}
          {payment.label === "PAYTM SANDBOX" && <p className="text-sm">This was Paytm sandbox test money. No real money was received.</p>}
          {!payment.needsReview && <p className="text-sm text-muted">The sale has been updated.</p>}
        </div>
      );
    case "FAILED":
      return (
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-base font-semibold text-danger">
            <CircleAlert className="h-5 w-5" aria-hidden /> Failed
          </p>
          <p className="text-sm">{payment.failureReason ?? "The payment did not go through."} No money was collected.</p>
        </div>
      );
    case "UNKNOWN":
      return (
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-base font-semibold text-warning">
            <CircleAlert className="h-5 w-5" aria-hidden /> Not confirmed
          </p>
          <p className="text-sm">
            We could not confirm what happened to this payment, so we do not know if the customer paid. Press “Check status” to ask Paytm
            again. Do not create another QR for this sale until this one is confirmed.
          </p>
        </div>
      );
    case "REFUNDED":
      return <p className="text-base font-semibold">Refunded</p>;
  }
}

interface QrPaymentPanelProps {
  initial: PaymentView;
  config: PaymentConfig | undefined;
  onRetry: () => void;
  onClose: () => void;
}

/** Shows one payment and keeps it fresh from the server; the browser never decides an outcome itself. */
export function QrPaymentPanel({ initial, config, onRetry, onClose }: QrPaymentPanelProps) {
  const statusQuery = usePaymentStatus(initial.id);
  const payment = statusQuery.data ?? initial;
  const reconcile = useReconcilePayment();
  const simulate = useSimulatePayment(initial.id);
  const [actionError, setActionError] = useState<string | null>(null);

  const inProgress = isPaymentInProgress(payment.status);
  const showQr = (payment.status === "CREATED" || payment.status === "PENDING") && Boolean(payment.qrData || payment.qrImage);
  const showSimulate = canSimulate(config) && (payment.status === "CREATED" || payment.status === "PENDING");
  const busy = reconcile.isPending || simulate.isPending;

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(messageOf(error));
    }
  };

  const simulateOutcome = (outcome: PaymentOutcome) => run(() => simulate.mutateAsync(outcome));

  return (
    <div className="space-y-4">
      {(payment.simulated || config?.provider === "MOCK") && <DemoQrBanner />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-2xl font-semibold">{formatINR(payment.amount)}</p>
        <span className="flex flex-wrap items-center gap-2">
          <PaymentLabelBadge label={payment.label} />
          {payment.verified && <VerifiedIndicator />}
        </span>
      </div>
      <p className="-mt-3 text-xs text-muted">
        Order ID <span className="font-mono">{payment.orderId}</span>
      </p>

      {showQr && <PaymentQr payment={payment} />}
      {showQr && payment.expiresAt && <ExpiryCountdown expiresAt={payment.expiresAt} />}

      <div role="status" aria-live="polite" className="rounded-xl bg-background px-4 py-3">
        <StatusMessage payment={payment} />
      </div>

      {payment.needsReview && <NeedsReviewNotice reason={payment.reviewReason} />}

      {statusQuery.isError && inProgress && (
        <p role="alert" className="text-sm text-danger">
          Could not refresh the status just now. We will keep trying.
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-sm font-medium text-danger">
          {actionError}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {showSimulate && (
          <div className="grid gap-3 rounded-xl border border-dashed border-warning/60 p-3 sm:grid-cols-2">
            <Button disabled={busy} loading={simulate.isPending && simulate.variables === "SUCCESS"} onClick={() => simulateOutcome("SUCCESS")}>
              Simulate customer payment (demo)
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              loading={simulate.isPending && simulate.variables === "FAILED"}
              onClick={() => simulateOutcome("FAILED")}
            >
              Simulate failure (demo)
            </Button>
          </div>
        )}
        {inProgress && (
          <Button variant="secondary" loading={reconcile.isPending} disabled={busy} onClick={() => run(() => reconcile.mutateAsync(payment.id))}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Check status
          </Button>
        )}
        {payment.status === "FAILED" && <Button onClick={onRetry}>Try again</Button>}
        <Button variant={inProgress ? "ghost" : "secondary"} onClick={onClose}>
          {inProgress ? "Close" : "Done"}
        </Button>
        {inProgress && (
          <p className="text-center text-xs text-muted">
            Closing this window does not cancel the payment. You can follow it on the{" "}
            <Link href="/payments" className="font-medium text-navy-700 underline underline-offset-2">
              Payments page
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
