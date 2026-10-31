"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ApiClientError } from "@/lib/api/client";
import { useAbandonSalePayment } from "@/lib/hooks/useSales";
import { messageOf } from "./paymentErrors";
import type { Sale } from "@/types/sale";

interface AbandonPaymentDialogProps {
  saleId: string;
  saleNumber: string;
  open: boolean;
  onClose: () => void;
  /** The server cancelled the sale and released its stock. */
  onAbandoned: (sale: Sale) => void;
  /** 409: the money just arrived (or the sale already resolved), so the caller must show the server's state. */
  onConflict: (message: string) => void;
}

/** "Cancel payment" for a Paytm QR sale that is still waiting. Explains the consequence before asking the server. */
export function AbandonPaymentDialog({ saleId, saleNumber, open, onClose, onAbandoned, onConflict }: AbandonPaymentDialogProps) {
  const abandon = useAbandonSalePayment(saleId);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setError(null);
    try {
      onAbandoned(await abandon.mutateAsync());
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.status === 409) onConflict(failure.message);
      else {
        setError(messageOf(failure));
        return;
      }
    }
    setError(null);
    onClose();
  };

  return (
    <ConfirmDialog
      open={open}
      tone="danger"
      title="Cancel this payment?"
      description={`Sale ${saleNumber} will be cancelled and its stock put back. The QR cannot be withdrawn from Paytm: if the customer still pays afterwards, the payment will be flagged for review on the Payments page. It is not lost, but it will not be added to this sale.`}
      confirmLabel="Cancel payment"
      cancelLabel="Keep waiting"
      loading={abandon.isPending}
      onConfirm={confirm}
      onCancel={close}
    >
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </ConfirmDialog>
  );
}
