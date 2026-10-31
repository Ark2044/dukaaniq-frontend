import type { PaymentRecordStatus } from "./sale";

export type PaymentProvider = "MOCK" | "PAYTM_SANDBOX" | "PAYTM_PRODUCTION";
/** Server-supplied trust label: demo money, Paytm test money, or real Paytm money. */
export type PaymentLabel = "SIMULATED" | "PAYTM SANDBOX" | "PAYTM";
export type PaymentReviewReason = "AMOUNT_MISMATCH" | "NOT_APPLIED_TO_SALE" | "LATE_SUCCESS" | "CONFLICTING_STATUS";
export type PaymentOutcome = "SUCCESS" | "FAILED";

export interface PaymentConfig {
  provider: PaymentProvider;
  simulated: boolean;
  /** Credentials present (always true for MOCK). */
  configured: boolean;
  environment: string;
  webhookPath: string;
  webhookActive: boolean;
}

export interface PaymentView {
  id: string;
  saleId: string;
  saleNumber: string;
  amount: number;
  status: PaymentRecordStatus;
  provider: PaymentProvider;
  simulated: boolean;
  verified: boolean;
  label: PaymentLabel;
  orderId: string;
  qrData: string | null;
  /** Optional Base64 PNG supplied by Paytm; preferred over rendering qrData ourselves. */
  qrImage: string | null;
  expiresAt: string | null;
  createdAt: string;
  verifiedAt: string | null;
  providerTxnId: string | null;
  failureReason: string | null;
  needsReview: boolean;
  reviewReason: PaymentReviewReason | null;
}

export interface CreatePaytmQrInput {
  saleId: string;
  /** Omitted = everything still due and not already in progress. */
  amount?: number;
}

export interface PaymentListParams {
  status?: PaymentRecordStatus;
  simulated?: boolean;
  page?: number;
  size?: number;
}

export interface Reconciliation {
  provider: PaymentProvider;
  simulated: boolean;
  windowDays: number;
  counts: Partial<Record<PaymentRecordStatus, number>>;
  collected: { verified: number; simulated: number };
  attention: PaymentView[];
  notes: string[];
}
