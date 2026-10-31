import { ApiClientError } from "@/lib/api/client";
import type { CartLine } from "./cart";

export interface SaleErrorMapping {
  /** Messages keyed by productId, taken from `items[i].…` detail fields. */
  lineErrors: Record<string, string>;
  message: string;
}

/** Attaches `items[i].*` problems to the cart line at index i; everything else becomes a form-level message. */
export function mapSaleError(error: unknown, lines: CartLine[]): SaleErrorMapping {
  if (!(error instanceof ApiClientError)) {
    return { lineErrors: {}, message: "Something went wrong. Please try again." };
  }
  if (error.code === "PAYMENT_NOT_CONFIGURED") {
    return {
      lineErrors: {},
      message:
        "Paytm QR is not set up for this shop yet (payment credentials are missing). Nothing was saved. Choose another way to pay, or ask whoever set up DukaanIQ to add the Paytm credentials.",
    };
  }
  const lineErrors: Record<string, string> = {};
  const rest: string[] = [];
  for (const detail of error.details) {
    const index = /^items\[(\d+)\]/.exec(detail.field ?? "")?.[1];
    const line = index === undefined ? undefined : lines[Number(index)];
    if (line) lineErrors[line.productId] = detail.message;
    else rest.push(detail.message);
  }
  if (Object.keys(lineErrors).length > 0 && rest.length === 0) {
    return {
      lineErrors,
      message:
        error.code === "INSUFFICIENT_STOCK"
          ? "Not enough stock for some items. Nothing was saved — fix the highlighted items."
          : "Some items need attention. Nothing was saved.",
    };
  }
  return { lineErrors, message: rest.length > 0 ? rest.join(" ") : error.message };
}
