"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { TextField } from "@/components/forms/Fields";
import { FormAlert } from "@/components/forms/FormAlert";
import { DemoQrBanner, QrPaymentPanel } from "./QrPaymentPanel";
import { createQrProblem } from "./paymentErrors";
import { useCreatePaytmQr, usePaymentConfig } from "@/lib/hooks/usePayments";
import { numberProblem } from "@/lib/validation/fields";
import { formatINR } from "@/lib/utils/format";
import { parseNumber, roundMoney } from "@/lib/utils/money";
import type { PaymentConfig, PaymentView } from "@/types/payment";
import type { Sale } from "@/types/sale";

interface AmountFormProps {
  sale: Sale;
  config: PaymentConfig | undefined;
  onCreated: (payment: PaymentView) => void;
  onCancel: () => void;
}

function AmountForm({ sale, config, onCreated, onCancel }: AmountFormProps) {
  const due = roundMoney(sale.dueAmount);
  const [amount, setAmount] = useState(String(due));
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<{ message: string; hint: string | null } | null>(null);
  const create = useCreatePaytmQr();
  const notConfigured = config !== undefined && !config.configured;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const problem = numberProblem(amount, "Amount", { required: true, exclusiveMin: 0, max: due, maxDecimals: 2 });
    setFieldError(problem);
    if (problem) return;
    const value = roundMoney(parseNumber(amount));
    try {
      // Leaving the full due untouched lets the server work out what is still collectable.
      const payment = await create.mutateAsync(value === due ? { saleId: sale.id } : { saleId: sale.id, amount: value });
      onCreated(payment);
    } catch (error) {
      const failure = createQrProblem(error);
      if (failure.field === "amount") setFieldError(failure.message);
      else setFormError({ message: failure.message, hint: failure.hint });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {config?.provider === "MOCK" && <DemoQrBanner />}
      {notConfigured && (
        <FormAlert message="Paytm credentials are missing, so QR payments cannot be created right now. Ask whoever set up DukaanIQ to add them." />
      )}
      <FormAlert message={formError?.message ?? null} />
      {formError?.hint && <p className="-mt-2 text-xs text-muted">{formError.hint}</p>}
      <TextField
        label="Amount to collect (₹)"
        inputMode="decimal"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        hint={`Up to ${formatINR(due)} (amount due). Money already waiting on another Paytm QR is not counted; the server will tell you if this is too much.`}
        error={fieldError ?? undefined}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending} disabled={notConfigured}>
          Create QR
        </Button>
      </div>
    </form>
  );
}

interface PaytmQrModalProps {
  sale: Sale;
  open: boolean;
  onClose: () => void;
}

/** Creates a Paytm dynamic-QR order for a sale and follows it until the server settles it. */
export function PaytmQrModal({ sale, open, onClose }: PaytmQrModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Collect via Paytm QR"
      description={`${sale.saleNumber} · ${formatINR(sale.dueAmount)} is due.`}
    >
      <QrFlow sale={sale} onClose={onClose} />
    </Modal>
  );
}

/** Mounted only while the modal is open, so closing it also stops every poll and timer below. */
function QrFlow({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const { data: config } = usePaymentConfig();

  if (!payment) return <AmountForm sale={sale} config={config} onCreated={setPayment} onCancel={onClose} />;
  return <QrPaymentPanel key={payment.id} initial={payment} config={config} onRetry={() => setPayment(null)} onClose={onClose} />;
}
