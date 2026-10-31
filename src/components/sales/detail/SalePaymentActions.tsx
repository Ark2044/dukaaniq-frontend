"use client";

import { useState, type ReactNode } from "react";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import { ReceivedPaymentForm } from "@/components/payments/ReceivedPaymentForm";
import { useRecordSalePayment } from "@/lib/hooks/useSales";
import { formatINR } from "@/lib/utils/format";
import type { Sale } from "@/types/sale";

interface SalePaymentActionsProps {
  sale: Sale;
  /** Extra payment actions (e.g. an online payment button) rendered after the manual one. */
  children?: ReactNode;
}

/** Payment-related actions for one sale. Cancelled sales and fully paid sales offer none. */
export function SalePaymentActions({ sale, children }: SalePaymentActionsProps) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const record = useRecordSalePayment(sale.id);

  if (sale.status !== "COMPLETED") return null;
  const canRecord = sale.dueAmount > 0;
  if (!canRecord && !children) return null;

  return (
    <>
      {canRecord && (
        <Button onClick={() => setOpen(true)}>
          <HandCoins className="h-4 w-4" aria-hidden /> Record payment
        </Button>
      )}
      {children}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record payment"
        description={`${sale.saleNumber} · ${formatINR(sale.dueAmount)} is due.`}
      >
        <ReceivedPaymentForm
          max={sale.dueAmount}
          maxLabel="Amount due"
          submitLabel="Record payment"
          onCancel={() => setOpen(false)}
          onSubmit={async (values) => {
            await record.mutateAsync(values);
            toast.success(`${formatINR(values.amount)} recorded.`);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
}
