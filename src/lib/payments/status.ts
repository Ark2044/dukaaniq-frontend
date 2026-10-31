import type { PaymentConfig, PaymentProvider, PaymentReviewReason } from "@/types/payment";
import type { PaymentRecordStatus } from "@/types/sale";

/** How often the browser asks the server to re-check a payment that is still in progress. */
export const PAYMENT_POLL_INTERVAL_MS = 3000;

const IN_PROGRESS: ReadonlySet<PaymentRecordStatus> = new Set(["CREATED", "PENDING", "UNKNOWN"]);

/** Only the server decides when a payment is final; these three states can still change. */
export const isPaymentInProgress = (status: PaymentRecordStatus | undefined): boolean =>
  status !== undefined && IN_PROGRESS.has(status);

export const PAYMENT_STATUS_LABELS: Record<PaymentRecordStatus, string> = {
  CREATED: "Created",
  PENDING: "Waiting for payment",
  SUCCESS: "Paid",
  FAILED: "Failed",
  UNKNOWN: "Not confirmed",
  REFUNDED: "Refunded",
};

export const PAYMENT_STATUS_OPTIONS = (Object.keys(PAYMENT_STATUS_LABELS) as PaymentRecordStatus[]).map((value) => ({
  value,
  label: PAYMENT_STATUS_LABELS[value],
}));

export const REVIEW_TITLES: Record<PaymentReviewReason, string> = {
  AMOUNT_MISMATCH: "Amount does not match",
  NOT_APPLIED_TO_SALE: "Not applied to the sale",
  LATE_SUCCESS: "Payment arrived late",
  CONFLICTING_STATUS: "Conflicting status",
};

export const REVIEW_EXPLANATIONS: Record<PaymentReviewReason, string> = {
  AMOUNT_MISMATCH:
    "Paytm reported a different amount than this QR was created for. Nothing was applied to the sale automatically. Check the amount in your Paytm dashboard before counting this money.",
  NOT_APPLIED_TO_SALE:
    "The payment was confirmed but could not be added to the sale (for example, the sale changed in the meantime). Check the sale and record the money yourself if it reached you.",
  LATE_SUCCESS:
    "The payment arrived after the QR had already expired or failed. Check your Paytm dashboard, and settle the sale manually if the money really reached you.",
  CONFLICTING_STATUS:
    "Paytm gave conflicting answers about this payment, so we are not sure what happened. Press “Check status” again, and if it keeps conflicting, check your Paytm dashboard before counting it.",
};

const FALLBACK_REVIEW = {
  title: "Needs your review",
  explanation: "This payment needs your attention. Check its status, or look at your Paytm dashboard.",
};

export const reviewNotice = (reason: PaymentReviewReason | null) =>
  reason && REVIEW_EXPLANATIONS[reason]
    ? { title: REVIEW_TITLES[reason], explanation: REVIEW_EXPLANATIONS[reason] }
    : FALLBACK_REVIEW;

export const PROVIDER_MODE_LABELS: Record<PaymentProvider, string> = {
  MOCK: "Mock demo",
  PAYTM_SANDBOX: "Paytm sandbox",
  PAYTM_PRODUCTION: "Paytm production",
};

export const PROVIDER_MODE_DESCRIPTIONS: Record<PaymentProvider, string> = {
  MOCK: "Demo mode. QR codes are not payable and no real money moves. Payments are simulated.",
  PAYTM_SANDBOX: "Paytm test environment. Payments use test money, not real money.",
  PAYTM_PRODUCTION: "Live Paytm. Verified payments are real money.",
};

/** The simulate buttons exist only for the mock provider, as reported by the server. */
export const canSimulate = (config: PaymentConfig | undefined): boolean => config?.provider === "MOCK";
