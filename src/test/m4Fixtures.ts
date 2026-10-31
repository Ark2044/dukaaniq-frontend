import { sale } from "./m3Fixtures";
import type { PaymentConfig, PaymentView, Reconciliation } from "@/types/payment";
import type { Sale } from "@/types/sale";

export const paymentConfig = (overrides: Partial<PaymentConfig> = {}): PaymentConfig => ({
  provider: "MOCK",
  simulated: true,
  configured: true,
  environment: "MOCK",
  webhookPath: "/api/v1/webhooks/paytm",
  webhookActive: false,
  ...overrides,
});

export const paymentView = (overrides: Partial<PaymentView> = {}): PaymentView => ({
  id: "pay-1",
  saleId: "s-1",
  saleNumber: "S-000123",
  amount: 120,
  status: "PENDING",
  provider: "MOCK",
  simulated: true,
  verified: false,
  label: "SIMULATED",
  orderId: "DQ1K9X4T2AB7",
  qrData: "SIMULATED|DUKAANIQ|DQ1K9X4T2AB7|120.00",
  qrImage: null,
  expiresAt: "2026-10-31T09:40:00Z",
  createdAt: "2026-10-31T09:25:00Z",
  verifiedAt: null,
  providerTxnId: null,
  failureReason: null,
  needsReview: false,
  reviewReason: null,
  ...overrides,
});

/** A real, server-verified Paytm payment. */
export const verifiedPayment = (overrides: Partial<PaymentView> = {}): PaymentView =>
  paymentView({
    id: "pay-v",
    status: "SUCCESS",
    provider: "PAYTM_PRODUCTION",
    simulated: false,
    verified: true,
    label: "PAYTM",
    qrData: null,
    orderId: "DQREAL000001",
    providerTxnId: "TXN-1",
    verifiedAt: "2026-10-31T09:30:00Z",
    ...overrides,
  });

export const reconciliation = (overrides: Partial<Reconciliation> = {}): Reconciliation => ({
  provider: "MOCK",
  simulated: true,
  windowDays: 30,
  counts: { SUCCESS: 4, PENDING: 1, FAILED: 1, UNKNOWN: 0, CREATED: 0, REFUNDED: 0 },
  collected: { verified: 0, simulated: 480 },
  attention: [],
  notes: ["Simulated payments are demo data and are never counted as verified collections."],
  ...overrides,
});

/** A Paytm QR sale that holds its stock but is not complete until the payment arrives. */
export const pendingSale = (overrides: Partial<Sale> = {}): Sale =>
  sale({
    status: "PENDING_PAYMENT",
    customer: null,
    subtotal: 120,
    discountAmount: 0,
    totalAmount: 120,
    netAmount: 120,
    paidAmount: 0,
    dueAmount: 120,
    paymentStatus: "UNPAID",
    payments: [],
    ...overrides,
  });
