import { z } from "zod";
import type { FieldPath, UseFormSetError } from "react-hook-form";
import { ApiClientError } from "@/lib/api/client";
import { blankToNull, numberProblem, textToNumberOrNull } from "./fields";
import type { CsvRow } from "@/lib/scan/csv";
import type { BillConfirmLine, BillConfirmRequest, BillScanResult } from "@/types/billScan";
import type { Unit } from "@/types/product";

const UNITS = ["PIECE", "PACKET", "KG", "GRAM", "LITRE", "ML", "DOZEN", "BOX", "BOTTLE"] as const satisfies readonly Unit[];

export const reviewLineSchema = z
  .object({
    action: z.enum(["CREATE", "RESTOCK", "SKIP"]),
    name: z.string(),
    brand: z.string(),
    category: z.string(),
    quantity: z.string(),
    unit: z.union([z.enum(UNITS), z.literal("")]),
    packSize: z.string(),
    costPrice: z.string(),
    sellingPrice: z.string(),
    reorderLevel: z.string(),
    productId: z.string(),
  })
  .superRefine((line, ctx) => {
    const fail = (path: keyof typeof line, message: string | null) => {
      if (message) ctx.addIssue({ code: "custom", path: [path], message });
    };

    if (line.action === "RESTOCK") {
      fail("productId", line.productId.trim() === "" ? "Choose which product to restock" : null);
      fail("quantity", numberProblem(line.quantity, "Quantity", { required: true, exclusiveMin: 0, maxDecimals: 3 }));
      return;
    }
    if (line.action !== "CREATE") return;

    const name = line.name.trim();
    fail("name", name === "" ? "Product name is required" : name.length > 150 ? "Product name must be at most 150 characters" : null);
    fail("brand", line.brand.trim().length > 80 ? "Brand must be at most 80 characters" : null);
    fail("category", line.category.trim().length > 80 ? "Category must be at most 80 characters" : null);
    fail("unit", line.unit === "" ? "Choose a unit" : null);
    fail("sellingPrice", numberProblem(line.sellingPrice, "Selling price", { required: true, min: 0, maxDecimals: 2 }));
    fail("costPrice", numberProblem(line.costPrice, "Cost price", { min: 0, maxDecimals: 2 }));
    fail("packSize", numberProblem(line.packSize, "Pack size", { exclusiveMin: 0, maxDecimals: 3 }));
    fail("quantity", numberProblem(line.quantity, "Quantity", { min: 0, maxDecimals: 3 }));
    fail("reorderLevel", numberProblem(line.reorderLevel, "Reorder level", { min: 0, maxDecimals: 3 }));
  });

export const reviewFormSchema = z.object({
  lines: z.array(reviewLineSchema).min(1, "There are no lines to confirm").max(200, "A bill can have at most 200 lines"),
});

export type ReviewLineValues = z.infer<typeof reviewLineSchema>;
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

const asText = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

/**
 * Pre-fills the review form from the extraction. The selling price is only ever the printed MRP
 * suggestion; when the bill has none it stays empty so the merchant must enter it.
 */
export function billResultToFormValues(result: BillScanResult): ReviewFormValues {
  return {
    lines: result.lines.map((line) => {
      const candidates = line.match?.candidates ?? [];
      const restockTarget = line.suggestedAction === "RESTOCK" ? candidates[0] : undefined;
      return {
        action: line.suggestedAction === "RESTOCK" && !restockTarget ? "CREATE" : line.suggestedAction,
        name: line.name ?? "",
        brand: line.brand ?? "",
        category: "",
        quantity: asText(line.quantity),
        unit: line.unit ?? "",
        packSize: asText(line.packSize),
        costPrice: asText(line.costPrice),
        sellingPrice: asText(line.suggestedSellingPrice),
        reorderLevel: "",
        productId: restockTarget?.id ?? "",
      };
    }),
  };
}

function toConfirmLine(line: ReviewLineValues): BillConfirmLine {
  if (line.action === "RESTOCK") {
    return { action: "RESTOCK", productId: line.productId, quantity: Number(line.quantity) };
  }
  if (line.action === "SKIP") return { action: "SKIP" };
  return {
    action: "CREATE",
    name: line.name.trim(),
    brand: blankToNull(line.brand) ?? undefined,
    category: blankToNull(line.category) ?? undefined,
    unit: line.unit as Unit,
    packSize: textToNumberOrNull(line.packSize) ?? undefined,
    sellingPrice: Number(line.sellingPrice),
    costPrice: textToNumberOrNull(line.costPrice) ?? undefined,
    quantity: textToNumberOrNull(line.quantity) ?? undefined,
    reorderLevel: textToNumberOrNull(line.reorderLevel) ?? undefined,
  };
}

/** Indexes line-for-line with the form so backend `lines[i]` errors map back to the right row. */
export const toConfirmRequest = (values: ReviewFormValues): BillConfirmRequest => ({
  lines: values.lines.map(toConfirmLine),
});

export function countActions(lines: ReadonlyArray<Pick<ReviewLineValues, "action">>) {
  const totals = { create: 0, restock: 0, skip: 0 };
  for (const { action } of lines) {
    if (action === "CREATE") totals.create += 1;
    else if (action === "RESTOCK") totals.restock += 1;
    else totals.skip += 1;
  }
  return totals;
}

/** CSV rows (import-template format) for the lines currently set to CREATE. */
export const toCsvRows = (lines: ReadonlyArray<ReviewLineValues>): Partial<CsvRow>[] =>
  lines
    .filter((line) => line.action === "CREATE")
    .map((line) => ({
      name: line.name.trim(),
      brand: line.brand.trim(),
      category: line.category.trim(),
      unit: line.unit,
      pack_size: line.packSize.trim(),
      selling_price: line.sellingPrice.trim(),
      cost_price: line.costPrice.trim(),
      stock_quantity: line.quantity.trim(),
      reorder_level: line.reorderLevel.trim(),
    }));

const LINE_FIELD_PATH = /^lines\[(\d+)\]\.(\w+)$/;
const LINE_FIELDS = new Set(Object.keys(reviewLineSchema.shape));

/**
 * Maps backend `lines[i].field` validation details onto the matching form inputs. Returns a form-level
 * message for anything that cannot be attached to a field, or null if everything was mapped.
 */
export function applyConfirmError(
  error: unknown,
  setError: UseFormSetError<ReviewFormValues>,
  lineCount: number,
): string | null {
  if (!(error instanceof ApiClientError)) return "Something went wrong. Please try again.";

  const unmatched: string[] = [];
  for (const detail of error.details) {
    const match = detail.field ? LINE_FIELD_PATH.exec(detail.field) : null;
    const index = match ? Number(match[1]) : -1;
    if (match && index < lineCount && LINE_FIELDS.has(match[2])) {
      setError(`lines.${index}.${match[2]}` as FieldPath<ReviewFormValues>, { type: "server", message: detail.message });
    } else {
      unmatched.push(detail.message);
    }
  }

  if (error.code === "VALIDATION_FAILED" && error.details.length > 0) {
    return unmatched.length === 0 ? null : unmatched.join(" ");
  }
  return error.message;
}

export const attentionLabel = (count: number) => `${count} ${count === 1 ? "line needs" : "lines need"} attention`;
