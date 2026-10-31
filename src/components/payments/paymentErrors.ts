import { ApiClientError } from "@/lib/api/client";

const NOT_CONFIGURED_MESSAGE =
  "Paytm is not set up for this shop yet: payment credentials are missing, so a QR cannot be created.";

/** Plain-language text for any payment API failure. */
export function messageOf(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.code === "PAYMENT_NOT_CONFIGURED" ? NOT_CONFIGURED_MESSAGE : error.message;
  }
  return "Something went wrong. Please try again.";
}

/** Splits a create-QR failure into an amount-field problem or a general message. */
export function createQrProblem(error: unknown): { field: "amount" | null; message: string; hint: string | null } {
  if (!(error instanceof ApiClientError)) return { field: null, message: messageOf(error), hint: null };
  const amountDetail = error.details.find((detail) => detail.field === "amount");
  if (amountDetail) return { field: "amount", message: amountDetail.message, hint: null };
  const rejected = error.status === 409 || error.status === 400;
  return {
    field: null,
    message: messageOf(error),
    hint: rejected ? "Amounts already waiting on another Paytm QR for this sale cannot be collected again until that one finishes." : null,
  };
}
