"use client";

import { useState } from "react";
import { FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { BillHeader } from "./BillHeader";
import { ReviewLine, SCAN_CATEGORY_LIST_ID } from "./ReviewLine";
import { Button } from "@/components/common/Button";
import { FormAlert } from "@/components/forms/FormAlert";
import { ApiClientError } from "@/lib/api/client";
import { confirmBillScan } from "@/lib/api/billScan";
import { productKeys } from "@/lib/api/products";
import { useProductCategories } from "@/lib/hooks/useProducts";
import { buildProductsCsv, downloadTextFile } from "@/lib/scan/csv";
import {
  applyConfirmError,
  attentionLabel,
  billResultToFormValues,
  countActions,
  reviewFormSchema,
  toConfirmRequest,
  toCsvRows,
  type ReviewFormValues,
} from "@/lib/validation/billScan";
import type { BillConfirmResult, BillScanResult } from "@/types/billScan";

interface ReviewStepProps {
  scanId: string;
  result: BillScanResult;
  /** Called with null when the scan had already been applied (DUPLICATE_REQUEST). */
  onApplied: (result: BillConfirmResult | null) => void;
  onDiscard: () => void;
}

function Total({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <strong className="font-semibold">{value}</strong> {label}
    </span>
  );
}

export function ReviewStep({ scanId, result, onApplied, onDiscard }: ReviewStepProps) {
  const queryClient = useQueryClient();
  const categories = useProductCategories().data ?? [];
  const [formError, setFormError] = useState<string | null>(null);

  const methods = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: billResultToFormValues(result),
  });
  const { control, handleSubmit, setError, getValues, formState } = methods;
  const { fields } = useFieldArray({ control, name: "lines" });
  const watched = useWatch({ control, name: "lines" }) ?? [];
  const totals = countActions(watched);
  const attention = Array.isArray(formState.errors.lines) ? formState.errors.lines.filter(Boolean).length : 0;
  const nothingToApply = totals.create + totals.restock === 0;

  const onSubmit = async (values: ReviewFormValues) => {
    setFormError(null);
    try {
      const outcome = await confirmBillScan(scanId, toConfirmRequest(values));
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      onApplied(outcome);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "DUPLICATE_REQUEST") {
        await queryClient.invalidateQueries({ queryKey: productKeys.all });
        onApplied(null);
        return;
      }
      setFormError(applyConfirmError(error, setError, values.lines.length));
    }
  };

  const downloadCsv = () => {
    downloadTextFile("bill-products.csv", buildProductsCsv(toCsvRows(getValues("lines"))));
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <BillHeader result={result} />

        <p className="text-sm text-muted">
          Check each line, fix anything that looks wrong, then confirm. Nothing is saved until you confirm.
        </p>

        <datalist id={SCAN_CATEGORY_LIST_ID}>
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <ul aria-label="Bill lines" className="space-y-4">
          {fields.map((field, index) => (
            <ReviewLine key={field.id} index={index} source={result.lines[index]} />
          ))}
        </ul>

        <div className="sticky bottom-20 z-10 space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-lg md:bottom-4">
          <FormAlert message={formError} />
          {attention > 0 && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {attentionLabel(attention)}
            </p>
          )}
          <p aria-live="polite" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <Total value={totals.create} label="to create" />
            <Total value={totals.restock} label="to restock" />
            <Total value={totals.skip} label="skipped" />
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" loading={formState.isSubmitting} disabled={nothingToApply}>
              Confirm and update inventory
            </Button>
            <Button variant="secondary" onClick={downloadCsv} disabled={totals.create === 0}>
              <Download className="h-4 w-4" aria-hidden /> Download CSV
            </Button>
            <Button variant="ghost" onClick={onDiscard} disabled={formState.isSubmitting}>
              Start over
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
