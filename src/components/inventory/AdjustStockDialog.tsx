"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { ProductPicker } from "@/components/common/pickers";
import type { PickerOption } from "@/components/common/SearchPicker";
import { useToast } from "@/components/common/Toast";
import { SelectField, TextField } from "@/components/forms/Fields";
import { FormAlert } from "@/components/forms/FormAlert";
import { ApiClientError } from "@/lib/api/client";
import { ADJUSTMENT_REASON_OPTIONS, UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { applyApiError } from "@/lib/forms/apiErrors";
import { useAdjustStock } from "@/lib/hooks/useInventory";
import { ADJUSTMENT_FIELDS, adjustmentSchema, type AdjustmentFormValues } from "@/lib/validation/inventory";
import { formatQuantity } from "@/lib/utils/format";
import type { Unit } from "@/types/product";

export interface AdjustableProduct {
  id: string;
  name: string;
  unit: Unit;
  stockQuantity?: number;
}

interface AdjustStockDialogProps {
  open: boolean;
  onClose: () => void;
  /** Fixed product (from a row); omit to let the merchant pick one. */
  product?: AdjustableProduct;
  defaultKind?: AdjustmentFormValues["kind"];
}

export function AdjustStockDialog({ open, onClose, product, defaultKind = "STOCK_IN" }: AdjustStockDialogProps) {
  const toast = useToast();
  const adjust = useAdjustStock();
  const [picked, setPicked] = useState<PickerOption | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { kind: defaultKind, quantity: "", reason: "COUNT_CORRECTION", note: "" },
  });
  const kind = useWatch({ control, name: "kind" });

  const productId = product?.id ?? picked?.id;
  const productName = product?.name ?? picked?.label;

  const submit = async (values: AdjustmentFormValues) => {
    setFormError(null);
    if (!productId) {
      setPickError("Choose a product");
      return;
    }
    const stockIn = values.kind === "STOCK_IN";
    try {
      await adjust.mutateAsync({
        productId,
        type: stockIn ? "PURCHASE" : "ADJUSTMENT",
        quantity: Number(values.quantity.replace(/^\+/, "")),
        reason: stockIn ? "PURCHASE" : values.reason,
        ...(values.note ? { note: values.note } : {}),
      });
      toast.success(stockIn ? `Stock added to ${productName}.` : `Stock adjusted for ${productName}.`);
      onClose();
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "INSUFFICIENT_STOCK") {
        setError("quantity", { type: "server", message: error.details[0]?.message ?? error.message });
        return;
      }
      setFormError(applyApiError(error, setError, ADJUSTMENT_FIELDS));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? `Adjust stock: ${product.name}` : "Adjust stock"}
      description={
        product?.stockQuantity !== undefined ? `Current stock: ${formatQuantity(product.stockQuantity)} ${UNIT_SHORT_LABELS[product.unit]}` : undefined
      }
    >
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
        <FormAlert message={formError} />
        {!product && (
          <div>
            <ProductPicker value={picked} onChange={(value) => { setPicked(value); setPickError(null); }} />
            {pickError && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
                {pickError}
              </p>
            )}
          </div>
        )}
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">What happened?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["STOCK_IN", "Stock in"],
                ["ADJUSTMENT", "Adjustment"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium ${kind === value ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-surface"}`}
              >
                <input type="radio" value={value} className="sr-only" {...register("kind")} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <TextField
          label={kind === "STOCK_IN" ? "Quantity received" : "Quantity change"}
          inputMode={kind === "STOCK_IN" ? "decimal" : "text"}
          autoComplete="off"
          hint={kind === "STOCK_IN" ? "How much new stock arrived." : "Use a minus sign to remove stock, for example -2."}
          error={errors.quantity?.message}
          {...register("quantity")}
        />
        {kind === "ADJUSTMENT" && (
          <SelectField label="Reason" options={ADJUSTMENT_REASON_OPTIONS} error={errors.reason?.message} {...register("reason")} />
        )}
        <TextField label="Note" optional error={errors.note?.message} {...register("note")} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {kind === "STOCK_IN" ? "Add stock" : "Save adjustment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
