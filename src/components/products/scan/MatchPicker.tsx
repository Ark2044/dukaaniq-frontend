"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { SelectField } from "@/components/forms/Fields";
import { UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { formatQuantity } from "@/lib/utils/format";
import type { ReviewFormValues } from "@/lib/validation/billScan";
import type { BillLine, BillMatchCandidate } from "@/types/billScan";

const CREATE_VALUE = "__create__";

const stockText = (c: BillMatchCandidate) =>
  c.stockQuantity === null ? "stock unknown" : `stock ${formatQuantity(c.stockQuantity)}${c.unit ? ` ${UNIT_SHORT_LABELS[c.unit]}` : ""}`;

const candidateLabel = (c: BillMatchCandidate) => `${c.name}${c.brand ? ` · ${c.brand}` : ""} — ${stockText(c)}`;

/** Shows the existing product a bill line matched, or lets the merchant resolve an ambiguous match. */
export function MatchPicker({ index, source }: { index: number; source: BillLine }) {
  const { control, setValue, trigger, formState } = useFormContext<ReviewFormValues>();
  const action = useWatch({ control, name: `lines.${index}.action` });
  const productId = useWatch({ control, name: `lines.${index}.productId` });
  const candidates = source.match?.candidates ?? [];
  const error = formState.errors.lines?.[index]?.productId?.message;

  if (candidates.length === 0) return null;

  if (source.match.status === "MATCHED") {
    return (
      <p className="rounded-xl bg-background px-4 py-3 text-sm">
        Matches <strong>{candidates[0].name}</strong> — {stockText(candidates[0])}
      </p>
    );
  }
  if (source.match.status !== "AMBIGUOUS") return null;

  const change = (value: string) => {
    const options = { shouldDirty: true };
    if (value === CREATE_VALUE) {
      setValue(`lines.${index}.action`, "CREATE", options);
      setValue(`lines.${index}.productId`, "", options);
    } else if (value === "") {
      setValue(`lines.${index}.action`, "SKIP", options);
      setValue(`lines.${index}.productId`, "", options);
    } else {
      setValue(`lines.${index}.productId`, value, options);
      setValue(`lines.${index}.action`, "RESTOCK", options);
    }
    if (formState.isSubmitted) void trigger("lines");
  };

  return (
    <SelectField
      label="Which product is this?"
      hint="Several products look similar. Choosing one restocks it; or create this as a new product."
      error={error}
      value={action === "CREATE" ? CREATE_VALUE : productId}
      onChange={(e) => change(e.target.value)}
      options={[
        { value: "", label: "Choose a product…" },
        ...candidates.map((c) => ({ value: c.id, label: candidateLabel(c) })),
        { value: CREATE_VALUE, label: "Create as new product" },
      ]}
    />
  );
}
