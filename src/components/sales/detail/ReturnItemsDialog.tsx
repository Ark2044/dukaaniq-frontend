"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import { SelectField, TextField } from "@/components/forms/Fields";
import { FormAlert } from "@/components/forms/FormAlert";
import { ApiClientError } from "@/lib/api/client";
import { REFUND_METHOD_OPTIONS, UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { useReturnSale } from "@/lib/hooks/useSales";
import { returnSchema, type ReturnFormValues } from "@/lib/validation/payments";
import { formatQuantity } from "@/lib/utils/format";
import { roundQuantity } from "@/lib/utils/money";
import type { PaymentMethod, Sale } from "@/types/sale";

const REFUND_CHOICES = [{ value: "", label: "Choose refund method" }, ...REFUND_METHOD_OPTIONS];

export function ReturnItemsDialog({ sale, open, onClose }: { sale: Sale; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const returnSale = useReturnSale(sale.id);
  const [formError, setFormError] = useState<string | null>(null);
  // The refund method is only asked for after the server says one is needed.
  const [refundRequired, setRefundRequired] = useState(false);

  const lines = useMemo(
    () =>
      sale.items
        .map((item) => ({ item, max: roundQuantity(item.quantity - item.returnedQuantity) }))
        .filter((line) => line.max > 0),
    [sale.items],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReturnFormValues>({
    resolver: zodResolver(returnSchema(lines.map((l) => ({ id: l.item.id, max: l.max })))),
    defaultValues: { quantities: {}, refundMethod: "", reason: "" },
  });

  const submit = async (values: ReturnFormValues) => {
    setFormError(null);
    const items = lines
      .map(({ item }) => ({ saleItemId: item.id, quantity: Number((values.quantities[item.id] ?? "").trim()) }))
      .filter((entry) => entry.quantity > 0);
    try {
      const updated = await returnSale.mutateAsync({
        items,
        ...(values.refundMethod ? { refundMethod: values.refundMethod as PaymentMethod } : {}),
        ...(values.reason ? { reason: values.reason } : {}),
      });
      toast.success(updated.status === "COMPLETED" ? "Return recorded." : "Return recorded and sale updated.");
      onClose();
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        setFormError("Something went wrong. Please try again.");
        return;
      }
      const unmatched: string[] = [];
      for (const detail of error.details) {
        const field = detail.field ?? "";
        const index = /^items\[(\d+)\]/.exec(field)?.[1];
        if (field === "refundMethod") {
          setRefundRequired(true);
          setError("refundMethod", { type: "server", message: detail.message });
        } else if (index !== undefined && items[Number(index)]) {
          setError(`quantities.${items[Number(index)].saleItemId}`, { type: "server", message: detail.message });
        } else unmatched.push(detail.message);
      }
      if (error.details.length === 0 || unmatched.length > 0) setFormError(unmatched.join(" ") || error.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Return items" description={`${sale.saleNumber} · enter how many of each item came back.`}>
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
        <FormAlert message={formError} />
        {typeof errors.quantities?.message === "string" && (
          <p role="alert" className="text-sm font-medium text-danger">
            {errors.quantities.message}
          </p>
        )}
        {lines.length === 0 ? (
          <p className="text-sm text-muted">Everything on this sale has already been returned.</p>
        ) : (
          lines.map(({ item, max }) => (
            <TextField
              key={item.id}
              label={`${item.name} (up to ${formatQuantity(max)} ${UNIT_SHORT_LABELS[item.unit]})`}
              optional
              inputMode="decimal"
              placeholder="0"
              error={errors.quantities?.[item.id]?.message}
              {...register(`quantities.${item.id}`)}
            />
          ))
        )}
        {refundRequired && (
          <SelectField
            label="Refund method"
            hint="The customer has paid more than the new total, so the extra is refunded."
            options={REFUND_CHOICES}
            error={errors.refundMethod?.message}
            {...register("refundMethod")}
          />
        )}
        <TextField label="Reason" optional error={errors.reason?.message} {...register("reason")} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={lines.length === 0}>
            Return items
          </Button>
        </div>
      </form>
    </Modal>
  );
}
