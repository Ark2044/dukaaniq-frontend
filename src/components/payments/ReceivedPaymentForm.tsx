"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/common/Button";
import { SelectField, TextField } from "@/components/forms/Fields";
import { FormAlert } from "@/components/forms/FormAlert";
import { PAYMENT_METHOD_OPTIONS, UPI_EXPLANATION } from "@/lib/constants/options";
import { applyApiError } from "@/lib/forms/apiErrors";
import { receivedPaymentSchema, type ReceivedPaymentFormValues } from "@/lib/validation/payments";
import { formatINR } from "@/lib/utils/format";
import { roundMoney } from "@/lib/utils/money";

const FIELDS = ["method", "amount", "note"] as const;

interface ReceivedPaymentFormProps {
  /** Most that can be accepted (sale due / customer outstanding). */
  max: number;
  maxLabel: string;
  submitLabel: string;
  onCancel: () => void;
  /** Rejections that are ApiClientError are mapped onto fields (e.g. `amount`) or the form alert. */
  onSubmit: (values: { method: ReceivedPaymentFormValues["method"]; amount: number; note?: string }) => Promise<void>;
}

export function ReceivedPaymentForm({ max, maxLabel, submitLabel, onCancel, onSubmit }: ReceivedPaymentFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ReceivedPaymentFormValues>({
    resolver: zodResolver(receivedPaymentSchema(max)),
    defaultValues: { method: "CASH", amount: String(roundMoney(max)), note: "" },
  });

  const method = useWatch({ control, name: "method" });

  const submit = async (values: ReceivedPaymentFormValues) => {
    setFormError(null);
    try {
      await onSubmit({ method: values.method, amount: roundMoney(Number(values.amount)), ...(values.note ? { note: values.note } : {}) });
    } catch (error) {
      setFormError(applyApiError(error, setError, FIELDS));
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <TextField
        label="Amount (₹)"
        inputMode="decimal"
        hint={`${maxLabel}: ${formatINR(max)}`}
        error={errors.amount?.message}
        {...register("amount")}
      />
      <SelectField label="Payment method" options={PAYMENT_METHOD_OPTIONS} error={errors.method?.message} {...register("method")} />
      {method === "UPI" && <p className="-mt-2 text-xs text-muted">{UPI_EXPLANATION}</p>}
      <TextField label="Note" optional error={errors.note?.message} {...register("note")} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
