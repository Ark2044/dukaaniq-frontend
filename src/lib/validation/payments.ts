import { z } from "zod";
import { numberText, numberProblem } from "./fields";

const PAYMENT_METHODS = ["CASH", "UPI", "CARD"] as const;
const methodField = z.enum(PAYMENT_METHODS, { error: "Choose a payment method" });

/** Money received against a sale's due or a customer's outstanding balance; `max` is the most that can be accepted. */
export function receivedPaymentSchema(max: number) {
  return z.object({
    method: methodField,
    amount: numberText("Amount", { required: true, exclusiveMin: 0, max, maxDecimals: 2 }),
    note: z.string().trim().max(200, "Note must be at most 200 characters"),
  });
}
export type ReceivedPaymentFormValues = z.infer<ReturnType<typeof receivedPaymentSchema>>;

export interface ReturnableLine {
  id: string;
  /** Sold minus already returned. */
  max: number;
}

export function returnSchema(lines: ReturnableLine[]) {
  return z
    .object({
      quantities: z.record(z.string(), z.string()),
      refundMethod: z.union([methodField, z.literal("")]),
      reason: z.string().trim().max(200, "Reason must be at most 200 characters"),
    })
    .superRefine((v, ctx) => {
      let entered = 0;
      let problems = 0;
      for (const line of lines) {
        const raw = (v.quantities[line.id] ?? "").trim();
        if (raw === "") continue;
        const problem = quantityProblem(raw, line.max);
        if (problem) {
          problems += 1;
          ctx.addIssue({ code: "custom", path: ["quantities", line.id], message: problem });
        } else entered += 1;
      }
      if (entered === 0 && problems === 0) {
        ctx.addIssue({ code: "custom", path: ["quantities"], message: "Enter a quantity to return for at least one item" });
      }
    });
}
export type ReturnFormValues = z.infer<ReturnType<typeof returnSchema>>;

export const cancelSchema = z.object({
  reason: z.string().trim().max(200, "Reason must be at most 200 characters"),
  refundMethod: z.union([methodField, z.literal("")]),
});
export type CancelFormValues = z.infer<typeof cancelSchema>;

export function quantityProblem(text: string, max: number, label = "Quantity") {
  return numberProblem(text, label, { exclusiveMin: 0, max, maxDecimals: 3 });
}
