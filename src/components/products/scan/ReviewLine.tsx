"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/common/Badge";
import { SelectField, TextField } from "@/components/forms/Fields";
import { MatchPicker } from "./MatchPicker";
import { UNIT_OPTIONS } from "@/lib/constants/options";
import type { ReviewFormValues } from "@/lib/validation/billScan";
import type { BillLine } from "@/types/billScan";

export const SCAN_CATEGORY_LIST_ID = "scan-categories";

const UNIT_CHOICES = [{ value: "", label: "Choose unit" }, ...UNIT_OPTIONS];

/** One editable bill line. A single responsive layout: stacked fields on phones, a multi-column grid on wide screens. */
export function ReviewLine({ index, source }: { index: number; source: BillLine }) {
  const { register, control, trigger, formState } = useFormContext<ReviewFormValues>();
  const action = useWatch({ control, name: `lines.${index}.action` });
  const errors = formState.errors.lines?.[index];
  const field = <K extends keyof ReviewFormValues["lines"][number]>(name: K) => `lines.${index}.${name}` as const;
  const creating = action === "CREATE";
  const candidates = source.match?.candidates ?? [];
  const reasons = source.reviewReasons ?? [];

  const actionField = register(field("action"), {
    // Hidden fields drop out of validation when the action changes, so refresh stale errors after a failed submit.
    onChange: () => {
      if (formState.isSubmitted) void trigger("lines");
    },
  });

  return (
    <li className="list-none">
      <div
        role="group"
        aria-label={`Line ${source.lineNo}: ${source.name || "unnamed item"}`}
        className="space-y-4 rounded-2xl border border-line bg-surface p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Line {source.lineNo} on bill</p>
            <p className="break-words text-base font-semibold">{source.name || "Unnamed item"}</p>
          </div>
          {source.needsReview && <Badge tone="warning">Needs review</Badge>}
        </div>

        {source.needsReview && reasons.length > 0 && (
          <ul className="list-disc space-y-0.5 rounded-xl bg-warning-soft py-2 pl-8 pr-3 text-xs text-warning">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}

        <MatchPicker index={index} source={source} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Action"
            options={[
              { value: "CREATE", label: "Create new product" },
              { value: "RESTOCK", label: "Restock existing", disabled: candidates.length === 0 },
              { value: "SKIP", label: "Skip this line" },
            ]}
            error={errors?.action?.message}
            {...actionField}
          />

          {action === "SKIP" && (
            <p className="self-end pb-3 text-sm text-muted sm:col-span-1 lg:col-span-2">
              This line will not be added to your inventory.
            </p>
          )}

          {creating && (
            <>
              <TextField label="Product name" error={errors?.name?.message} {...register(field("name"))} />
              <TextField label="Brand" optional error={errors?.brand?.message} {...register(field("brand"))} />
              <TextField
                label="Category"
                optional
                list={SCAN_CATEGORY_LIST_ID}
                autoComplete="off"
                error={errors?.category?.message}
                {...register(field("category"))}
              />
            </>
          )}

          {action !== "SKIP" && (
            <TextField
              label={creating ? "Quantity (opening stock)" : "Quantity received"}
              optional={creating}
              inputMode="decimal"
              error={errors?.quantity?.message}
              {...register(field("quantity"))}
            />
          )}

          {creating && (
            <>
              <SelectField label="Unit" options={UNIT_CHOICES} error={errors?.unit?.message} {...register(field("unit"))} />
              <TextField label="Pack size" optional inputMode="decimal" error={errors?.packSize?.message} {...register(field("packSize"))} />
              <TextField
                label="Cost price (₹)"
                optional
                inputMode="decimal"
                hint={source.costDerived ? "Derived from amount ÷ quantity on the bill." : undefined}
                error={errors?.costPrice?.message}
                {...register(field("costPrice"))}
              />
              <TextField
                label="Selling price (₹)"
                inputMode="decimal"
                hint={
                  source.suggestedSellingPrice === null
                    ? "Not printed on the bill — enter your own selling price."
                    : "Prefilled from the printed MRP. Change it if needed."
                }
                error={errors?.sellingPrice?.message}
                {...register(field("sellingPrice"))}
              />
              <TextField
                label="Reorder level"
                optional
                inputMode="decimal"
                error={errors?.reorderLevel?.message}
                {...register(field("reorderLevel"))}
              />
            </>
          )}
        </div>
      </div>
    </li>
  );
}
