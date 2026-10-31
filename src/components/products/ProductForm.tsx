"use client";

import { useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AliasEditor } from "./AliasEditor";
import { Button, buttonStyles } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { SelectField, TextField } from "@/components/forms/Fields";
import { FormAlert } from "@/components/forms/FormAlert";
import { UNIT_OPTIONS } from "@/lib/constants/options";
import { applyApiError } from "@/lib/forms/apiErrors";
import { PRODUCT_FORM_FIELDS, productSchema, type ProductFormValues } from "@/lib/validation/product";

interface ProductFormProps {
  mode: "create" | "edit";
  initialValues: ProductFormValues;
  categories?: string[];
  /** Shown in edit mode in place of the stock input. */
  currentStock?: string;
  submitLabel: string;
  cancelHref: string;
  /** Rejections that are ApiClientError are mapped onto fields / the form alert. */
  onSubmit: (values: ProductFormValues) => Promise<void>;
}

export function ProductForm({
  mode,
  initialValues,
  categories = [],
  currentStock,
  submitLabel,
  cancelHref,
  onSubmit,
}: ProductFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialValues,
  });
  const editing = mode === "edit";

  const submit = async (values: ProductFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(applyApiError(error, setError, PRODUCT_FORM_FIELDS));
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-6">
      <FormAlert message={formError} />

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Product details</h2>
        <TextField label="Product name" error={errors.name?.message} {...register("name")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Brand" optional error={errors.brand?.message} {...register("brand")} />
          <TextField
            label="Category"
            optional
            list="product-categories"
            autoComplete="off"
            error={errors.category?.message}
            {...register("category")}
          />
          <datalist id="product-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="SKU"
            optional
            hint={editing ? undefined : "Leave blank to generate one automatically."}
            error={errors.sku?.message}
            {...register("sku")}
          />
          <TextField label="Barcode" optional inputMode="numeric" error={errors.barcode?.message} {...register("barcode")} />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Pricing and stock</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Unit" options={UNIT_OPTIONS} error={errors.unit?.message} {...register("unit")} />
          <TextField label="Pack size" optional inputMode="decimal" error={errors.packSize?.message} {...register("packSize")} />
          <TextField
            label="Selling price (₹)"
            inputMode="decimal"
            error={errors.sellingPrice?.message}
            {...register("sellingPrice")}
          />
          <TextField label="Cost price (₹)" optional inputMode="decimal" error={errors.costPrice?.message} {...register("costPrice")} />
          <TextField
            label="Reorder level"
            optional
            inputMode="decimal"
            hint="You will see a low-stock warning at or below this quantity."
            error={errors.reorderLevel?.message}
            {...register("reorderLevel")}
          />
          {editing ? (
            <div role="note" className="rounded-xl border border-line bg-background px-4 py-3 text-sm">
              <p className="font-medium">Current stock{currentStock ? `: ${currentStock}` : ""}</p>
              <p className="mt-1 text-muted">Stock changes through inventory adjustments, not by editing the product.</p>
            </div>
          ) : (
            <TextField
              label="Opening stock"
              optional
              inputMode="decimal"
              hint="Quantity you have right now."
              error={errors.stockQuantity?.message}
              {...register("stockQuantity")}
            />
          )}
        </div>
      </Card>

      <Card>
        <Controller
          control={control}
          name="aliases"
          render={({ field }) => (
            <AliasEditor value={field.value} onChange={field.onChange} error={errors.aliases?.message} />
          )}
        />
      </Card>

      {editing && (
        <Card>
          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Active</span>
              <span className="block text-xs text-muted">Inactive products are hidden from sales and searches.</span>
            </span>
            <input type="checkbox" role="switch" className="h-6 w-6 accent-navy-900" {...register("active")} />
          </label>
        </Card>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className={buttonStyles("secondary")}>
          Cancel
        </Link>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
