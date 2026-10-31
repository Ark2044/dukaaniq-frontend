"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Clock, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { FormAlert } from "@/components/forms/FormAlert";
import { AbandonPaymentDialog } from "./AbandonPaymentDialog";
import { NeedsReviewNotice, PaymentLabelBadge, VerifiedIndicator } from "./PaymentBadges";
import { PaymentOutcomeNotice } from "./PaymentOutcomeNotice";
import { DemoQrBanner, PaymentQr, formatRemaining, useNow } from "./QrPaymentPanel";
import { messageOf } from "./paymentErrors";
import { paymentKeys } from "@/lib/api/payments";
import { SALE_AREAS, invalidateAreas } from "@/lib/hooks/invalidate";
import { useOpenSalePayment, usePaymentConfig, usePaymentStatus, useReconcilePayment, useSimulatePayment } from "@/lib/hooks/usePayments";
import { useSale } from "@/lib/hooks/useSales";
import { canSimulate, isPaymentInProgress } from "@/lib/payments/status";
import { formatINR } from "@/lib/utils/format";
import type { PaymentConfig, PaymentOutcome, PaymentView } from "@/types/payment";
import type { PaymentRecordStatus, Sale, SaleStatus } from "@/types/sale";

/** While the payment is settling, the sale is re-read this often until the server turns it COMPLETED/CANCELLED. */
const SETTLE_POLL_MS = 3000;

type PayableSale = Pick<Sale, "id" | "saleNumber" | "totalAmount">;

interface NextSteps {
  onStartAgain?: () => void;
  startAgainHref?: string;
  onNewSale?: () => void;
}

interface SalePaymentModalProps extends NextSteps {
  sale: PayableSale;
  open: boolean;
  onClose: () => void;
  /** Reopen the payment already in flight (sale detail) instead of asking the server for a new QR. */
  reuseExisting?: boolean;
}

/**
 * The Paytm QR for a sale that waits for its payment. The server alone decides the outcome: this only shows the QR,
 * follows the status and displays what the server reports.
 */
export function SalePaymentModal({ sale, open, onClose, reuseExisting = false, ...next }: SalePaymentModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Pay by Paytm QR" description={`${sale.saleNumber} · ${formatINR(sale.totalAmount)}`}>
      <SalePaymentFlow sale={sale} reuseExisting={reuseExisting} onClose={onClose} {...next} />
    </Modal>
  );
}

type Start = { kind: "starting" } | { kind: "ready"; payment: PaymentView } | { kind: "failed"; message: string };

interface FlowProps extends NextSteps {
  sale: PayableSale;
  reuseExisting: boolean;
  onClose: () => void;
}

/** Mounted only while the modal is open, so closing it also stops every poll and timer below. */
function SalePaymentFlow({ sale, reuseExisting, onClose, ...next }: FlowProps) {
  const { data: config } = usePaymentConfig();
  const { mutateAsync: openPayment } = useOpenSalePayment();
  const [start, setStart] = useState<Start>({ kind: "starting" });
  const began = useRef(false);

  const run = useCallback(() => {
    openPayment({ saleId: sale.id, reuseExisting }).then(
      (payment) => setStart({ kind: "ready", payment }),
      (error) => setStart({ kind: "failed", message: messageOf(error) }),
    );
  }, [openPayment, sale.id, reuseExisting]);

  useEffect(() => {
    if (began.current) return;
    began.current = true;
    run();
  }, [run]);

  if (start.kind === "ready") {
    return <WaitingPanel key={start.payment.id} sale={sale} initial={start.payment} config={config} onClose={onClose} {...next} />;
  }
  if (start.kind === "failed") {
    return (
      <StartFailed
        sale={sale}
        message={start.message}
        onRetry={() => {
          setStart({ kind: "starting" });
          run();
        }}
        onClose={onClose}
        {...next}
      />
    );
  }
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-sm font-semibold">
      <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden /> Creating the QR…
    </div>
  );
}

const CLOSE_NOTE = "You can close this window safely. This sale will be cancelled automatically if it is not paid in time.";

function SaleLink({ saleId }: { saleId: string }) {
  return (
    <p className="text-center text-xs text-muted">
      {CLOSE_NOTE} You can reopen the QR from{" "}
      <Link href={`/sales/${saleId}`} className="font-medium text-navy-700 underline underline-offset-2">
        the sale
      </Link>
      .
    </p>
  );
}

/** The QR could not be created. The sale is held until it is cancelled by the shop or the server's timeout. */
function StartFailed({ sale, message, onRetry, onClose, ...next }: { sale: PayableSale; message: string; onRetry: () => void; onClose: () => void } & NextSteps) {
  const [confirming, setConfirming] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  if (cancelled) {
    return <PaymentOutcomeNotice kind="cancelled" saleId={sale.id} abandoned focusOnMount {...next} />;
  }
  return (
    <div className="space-y-4">
      <FormAlert message={message} />
      <p className="text-sm text-muted">
        No QR was created, so nothing can be paid yet. The sale is on hold and will be cancelled automatically if no payment is started.
      </p>
      <div className="flex flex-col gap-3">
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Cancel payment
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <AbandonPaymentDialog
        saleId={sale.id}
        saleNumber={sale.saleNumber}
        open={confirming}
        onClose={() => setConfirming(false)}
        onAbandoned={() => setCancelled(true)}
        onConflict={() => setConfirming(false)}
      />
    </div>
  );
}

interface WaitingPanelProps extends NextSteps {
  sale: PayableSale;
  initial: PaymentView;
  config: PaymentConfig | undefined;
  onClose: () => void;
}

type Outcome = "waiting" | "unknown" | "confirming" | "paid" | "cancelled" | "ended";

function deriveOutcome(saleStatus: SaleStatus | undefined, paymentStatus: PaymentRecordStatus): Outcome {
  if (saleStatus === "COMPLETED") return "paid";
  if (saleStatus === "CANCELLED" || paymentStatus === "FAILED") return "cancelled";
  if (paymentStatus === "SUCCESS") return "confirming";
  if (paymentStatus === "REFUNDED") return "ended";
  return paymentStatus === "UNKNOWN" ? "unknown" : "waiting";
}

function WaitingPanel({ sale, initial, config, onClose, ...next }: WaitingPanelProps) {
  const queryClient = useQueryClient();
  const statusQuery = usePaymentStatus(initial.id);
  const payment = statusQuery.data ?? initial;
  const reconcile = useReconcilePayment();
  const simulate = useSimulatePayment(initial.id);
  const now = useNow();

  const [confirming, setConfirming] = useState(false);
  const [abandoned, setAbandoned] = useState(false);
  const [conflictNote, setConflictNote] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const paymentEnded = !isPaymentInProgress(payment.status);
  const checkSale = paymentEnded || conflictNote !== null;
  const saleQuery = useSale(sale.id, {
    enabled: checkSale,
    refetchInterval: (current) => (checkSale && current?.status === "PENDING_PAYMENT" ? SETTLE_POLL_MS : false),
  });
  const saleData = saleQuery.data;

  const outcome = deriveOutcome(saleData?.status, payment.status);

  // Everything a settled sale touches (stock, customer credit, dashboard) is refreshed once, when the server says so.
  const refreshedFor = useRef<Outcome | null>(null);
  useEffect(() => {
    if ((outcome !== "paid" && outcome !== "cancelled") || refreshedFor.current === outcome) return;
    refreshedFor.current = outcome;
    void invalidateAreas(queryClient, SALE_AREAS);
    void queryClient.invalidateQueries({ queryKey: paymentKeys.views });
  }, [outcome, queryClient]);

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(messageOf(error));
    }
  };

  const open = outcome === "waiting" || outcome === "unknown";
  const busy = reconcile.isPending || simulate.isPending;
  const remaining = payment.expiresAt ? new Date(payment.expiresAt).getTime() - now : Number.NaN;
  const timeIsUp = !Number.isNaN(remaining) && remaining <= 0;
  // An expired QR is hidden so nobody scans it, but only the server decides what the expiry means for the sale.
  const showQr = outcome === "waiting" && !timeIsUp && Boolean(payment.qrData || payment.qrImage);
  const settled = outcome === "paid" || outcome === "cancelled";

  const simulateOutcome = (result: PaymentOutcome) => run(() => simulate.mutateAsync(result));

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
      {outcome === "waiting" && !Number.isNaN(remaining) && (
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted">
          <Clock className="h-4 w-4" aria-hidden />
          {timeIsUp ? (
            <span>QR time is up.</span>
          ) : (
            <span>
              QR expires in <span className="font-semibold tabular-nums text-foreground">{formatRemaining(remaining)}</span>
            </span>
          )}
        </p>
      )}

      {settled ? (
        <PaymentOutcomeNotice
          kind={outcome}
          saleId={sale.id}
          reason={saleData?.cancelReason}
          abandoned={abandoned}
          simulated={payment.simulated && outcome === "paid"}
          sandbox={payment.label === "PAYTM SANDBOX" && outcome === "paid"}
          focusOnMount
          {...next}
        />
      ) : (
        <div role="status" aria-live="polite" className="space-y-1 rounded-xl bg-background px-4 py-3">
          {outcome === "waiting" && (
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden />
              {timeIsUp ? "Checking…" : "Waiting for payment…"}
            </div>
          )}
          {outcome === "waiting" && timeIsUp && (
            <p className="text-sm">The QR time is up. We are asking Paytm for the final result. Only the server decides if the sale is cancelled.</p>
          )}
          {outcome === "unknown" && (
            <>
              <p className="flex items-center gap-2 text-base font-semibold text-warning">
                <CircleAlert className="h-5 w-5" aria-hidden /> Not confirmed
              </p>
              <p className="text-sm">
                We could not confirm what happened to this payment, so we do not know if the customer paid. Press “Check status” to ask Paytm
                again. No new QR can be created while this one is open.
              </p>
            </>
          )}
          {outcome === "confirming" && (
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden /> Payment received. Finishing the sale…
            </div>
          )}
          {outcome === "ended" && <p className="text-base font-semibold">This payment was refunded.</p>}
          {conflictNote && <p className="text-sm">{conflictNote}</p>}
        </div>
      )}

      {payment.needsReview && <NeedsReviewNotice reason={payment.reviewReason} />}

      {statusQuery.isError && !paymentEnded && (
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
        {canSimulate(config) && outcome === "waiting" && (
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
        {open && (
          <Button variant="secondary" loading={reconcile.isPending} disabled={busy} onClick={() => run(() => reconcile.mutateAsync(payment.id))}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Check status
          </Button>
        )}
        {outcome === "confirming" && (
          <Button variant="secondary" loading={saleQuery.isFetching} onClick={() => run(() => saleQuery.refetch())}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Check again
          </Button>
        )}
        {open && (
          <Button variant="secondary" className="text-danger" disabled={busy} onClick={() => setConfirming(true)}>
            Cancel payment
          </Button>
        )}
        <Button variant={settled ? "secondary" : "ghost"} onClick={onClose}>
          {settled ? "Done" : "Close"}
        </Button>
        {!settled && <SaleLink saleId={sale.id} />}
      </div>

      <AbandonPaymentDialog
        saleId={sale.id}
        saleNumber={sale.saleNumber}
        open={confirming}
        onClose={() => setConfirming(false)}
        onAbandoned={() => setAbandoned(true)}
        onConflict={(message) => {
          setConflictNote(message);
          void statusQuery.refetch();
        }}
      />
    </div>
  );
}
