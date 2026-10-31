"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";
import { SelectField, TextField } from "@/components/forms/Fields";
import { FormAlert } from "@/components/forms/FormAlert";
import { REFUND_METHOD_OPTIONS } from "@/lib/constants/options";
import { applyApiError } from "@/lib/forms/apiErrors";
import { useCancelSale } from "@/lib/hooks/useSales";
import { cancelSchema, type CancelFormValues } from "@/lib/validation/payments";
import { formatINR } from "@/lib/utils/format";
import type { PaymentMethod, Sale } from "@/types/sale";

const FIELDS = ["reason", "refundMethod"] as const;
const REFUND_CHOICES = [{ value: "", label: "Choose refund method" }, ...REFUND_METHOD_OPTIONS];

export function CancelSaleDialog({ sale, open, onClose }: { sale: Sale; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const cancel = useCancelSale(sale.id);
  const [formError, setFormError] = useState<string | null>(null);
  const refundNeeded = sale.paidAmount > 0;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CancelFormValues>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { reason: "", refundMethod: "" },
  });

  const submit = async (values: CancelFormValues) => {
    setFormError(null);
    if (refundNeeded && values.refundMethod === "") {
      setError("refundMethod", { type: "required", message: "Choose how the money is refunded" });
      return;
    }
    try {
      await cancel.mutateAsync({
        ...(values.reason ? { reason: values.reason } : {}),
        ...(refundNeeded ? { refundMethod: values.refundMethod as PaymentMethod } : {}),
      });
      toast.success(`${sale.saleNumber} was cancelled.`);
      onClose();
    } catch (error) {
      setFormError(applyApiError(error, setError, FIELDS));
    }
  };

  return (
    <ConfirmDialog
      open={open}
      tone="danger"
      title={`Cancel ${sale.saleNumber}?`}
      description="Stock is put back and the sale is removed from the customer's dues. The record is kept."
      confirmLabel="Cancel sale"
      cancelLabel="Keep sale"
      loading={isSubmitting}
      onCancel={onClose}
      onConfirm={() => void handleSubmit(submit)()}
    >
      <FormAlert message={formError} />
      <TextField label="Reason" optional error={errors.reason?.message} {...register("reason")} />
      {refundNeeded && (
        <SelectField
          label="Refund method"
          hint={`${formatINR(sale.paidAmount)} paid so far will be refunded.`}
          options={REFUND_CHOICES}
          error={errors.refundMethod?.message}
          {...register("refundMethod")}
        />
      )}
    </ConfirmDialog>
  );
}
