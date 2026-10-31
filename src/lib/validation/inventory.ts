import { z } from "zod";
import { numberProblem } from "./fields";

export const adjustmentSchema = z
  .object({
    kind: z.enum(["STOCK_IN", "ADJUSTMENT"]),
    quantity: z.string().trim(),
    reason: z.enum(["DAMAGE", "LOSS", "COUNT_CORRECTION", "OTHER"]),
    note: z.string().trim().max(255, "Note must be at most 255 characters"),
  })
  .superRefine((v, ctx) => {
    const raw = v.quantity;
    if (v.kind === "STOCK_IN") {
      const problem = numberProblem(raw, "Quantity", { required: true, exclusiveMin: 0, maxDecimals: 3 });
      if (problem) ctx.addIssue({ code: "custom", path: ["quantity"], message: problem });
      return;
    }
    // Adjustments are signed: "-2" removes stock, "2.5" adds it.
    const unsigned = raw.startsWith("-") || raw.startsWith("+") ? raw.slice(1) : raw;
    const problem = numberProblem(unsigned, "Quantity", { required: true, maxDecimals: 3 });
    if (problem) ctx.addIssue({ code: "custom", path: ["quantity"], message: problem });
    else if (Number(unsigned) === 0) ctx.addIssue({ code: "custom", path: ["quantity"], message: "Quantity cannot be zero" });
  });
export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;
export const ADJUSTMENT_FIELDS = ["kind", "quantity", "reason", "note"] as const;
