"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, QrCode } from "lucide-react";
import { Button, buttonStyles } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { useToast } from "@/components/common/Toast";
import { AbandonPaymentDialog } from "./AbandonPaymentDialog";
import { PaymentOutcomeNotice } from "./PaymentOutcomeNotice";
import { SalePaymentModal } from "./SalePaymentModal";
import { pollWhileWaiting, useSale } from "@/lib/hooks/useSales";
import { formatINR } from "@/lib/utils/format";
import type { Sale } from "@/types/sale";

interface SaleAwaitingPaymentProps {
  /** The live sale; this component never decides an outcome, it only shows the sale's server status. */
  sale: Sale;
  /** Open the QR straight away (right after the sale was created) and ask the server for a new QR. */
  openOnMount?: boolean;
  onPaid?: (sale: Sale) => void;
  onStartAgain?: () => void;
  startAgainHref?: string;
  onNewSale?: () => void;
  /** Hide the "View sale" link when the page already is the sale. */
  showViewSale?: boolean;
}

/**
 * Everything about a Paytm QR sale that has not settled yet: the "waiting" banner with Show QR / Cancel payment,
 * the QR dialog, and the final Paid / cancelled notice once the server settles it. Renders nothing for sales that
 * were never waiting while this component was on screen.
 */
export function SaleAwaitingPayment({
  sale,
  openOnMount = false,
  onPaid,
  onStartAgain,
  startAgainHref,
  onNewSale,
  showViewSale = true,
}: SaleAwaitingPaymentProps) {
  const toast = useToast();
  const [wasWaiting] = useState(() => sale.status === "PENDING_PAYMENT");
  const [qrOpen, setQrOpen] = useState(openOnMount && sale.status === "PENDING_PAYMENT");
  // Only the very first QR of a brand-new sale is created blindly; later ones reopen the payment already in flight.
  const [fresh, setFresh] = useState(openOnMount);
  const [cancelling, setCancelling] = useState(false);
  const [abandoned, setAbandoned] = useState(false);
  const [conflictNote, setConflictNote] = useState<string | null>(null);

  const paidHandled = useRef(false);
  useEffect(() => {
    if (!wasWaiting || sale.status !== "COMPLETED" || paidHandled.current) return;
    paidHandled.current = true;
    toast.success(`Paid — sale ${sale.saleNumber} is complete.`);
    onPaid?.(sale);
  }, [wasWaiting, sale, toast, onPaid]);

  const closeQr = () => {
    setQrOpen(false);
    setFresh(false);
  };

  const waiting = sale.status === "PENDING_PAYMENT";
  if (!waiting && !wasWaiting && !qrOpen) return null;

  const successPayment = sale.payments.find((payment) => payment.status === "SUCCESS" && payment.provider);
  const nextSteps = { onStartAgain, startAgainHref, onNewSale, showViewSale };

  return (
    <>
      {waiting && (
        <Card className="space-y-4 border-warning/50 bg-warning-soft">
          <div className="flex items-start gap-3 text-warning">
            <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="text-base font-semibold">
                Waiting for Paytm payment — this sale is not complete yet and will be cancelled if it is not paid in time.
              </p>
              <p className="text-sm font-medium">
                {sale.saleNumber} · {formatINR(sale.totalAmount)}. Its stock is held until the payment arrives or the sale is cancelled.
              </p>
            </div>
          </div>
          {conflictNote && (
            <p role="status" className="text-sm font-medium">
              {conflictNote}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setQrOpen(true)}>
              <QrCode className="h-4 w-4" aria-hidden /> Show QR
            </Button>
            <Button variant="secondary" className="text-danger" onClick={() => setCancelling(true)}>
              Cancel payment
            </Button>
          </div>
          {showViewSale && (
            <Link href={`/sales/${sale.id}`} className={buttonStyles("ghost", "w-full")}>
              View sale
            </Link>
          )}
        </Card>
      )}

      {sale.status === "COMPLETED" && wasWaiting && !qrOpen && (
        <PaymentOutcomeNotice
          kind="paid"
          saleId={sale.id}
          simulated={successPayment?.simulated ?? false}
          sandbox={successPayment?.label === "PAYTM SANDBOX"}
          {...nextSteps}
        />
      )}
      {sale.status === "CANCELLED" && wasWaiting && !qrOpen && (
        <PaymentOutcomeNotice kind="cancelled" saleId={sale.id} reason={sale.cancelReason} abandoned={abandoned} {...nextSteps} />
      )}

      <SalePaymentModal
        sale={sale}
        open={qrOpen}
        onClose={closeQr}
        reuseExisting={!fresh}
        onStartAgain={onStartAgain}
        startAgainHref={startAgainHref}
        onNewSale={onNewSale}
      />
      <AbandonPaymentDialog
        saleId={sale.id}
        saleNumber={sale.saleNumber}
        open={cancelling}
        onClose={() => setCancelling(false)}
        onAbandoned={() => setAbandoned(true)}
        onConflict={(message) => setConflictNote(message)}
      />
    </>
  );
}

/** For the confirm screens: follows the sale just created until the server settles it, even when the QR is closed. */
export function PaytmCheckout({ sale, ...rest }: Omit<SaleAwaitingPaymentProps, "openOnMount" | "sale"> & { sale: Sale }) {
  const { data } = useSale(sale.id, { staleTime: 5000, refetchInterval: pollWhileWaiting });
  return <SaleAwaitingPayment sale={data ?? sale} openOnMount {...rest} />;
}
