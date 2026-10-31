import { ApiClientError, apiRequest } from "./client";
import { toQuery } from "./query";
import type { Page } from "@/types/product";
import type {
  CreatePaytmQrInput,
  PaymentConfig,
  PaymentListParams,
  PaymentOutcome,
  PaymentView,
  Reconciliation,
} from "@/types/payment";

export const paymentKeys = {
  /** Lists and reconciliation; invalidated together whenever a payment changes. */
  views: ["payments"] as const,
  list: (params: PaymentListParams) => ["payments", "list", params] as const,
  reconciliation: ["payments", "reconciliation"] as const,
  status: (id: string) => ["payment-status", id] as const,
  config: ["payment-config"] as const,
};

const paymentPath = (id: string) => `/payments/${encodeURIComponent(id)}`;

export const getPaymentConfig = (signal?: AbortSignal) => apiRequest<PaymentConfig>("/payments/config", { signal });

export const createPaytmQr = (input: CreatePaytmQrInput) =>
  apiRequest<PaymentView>("/payments/paytm/qr", { method: "POST", body: input });

/** Triggers a server-side status check with the provider (throttled by the server). */
export const getPaymentStatus = (id: string, signal?: AbortSignal) =>
  apiRequest<PaymentView>(`${paymentPath(id)}/status`, { signal });

export const reconcilePayment = (id: string) => apiRequest<PaymentView>(`${paymentPath(id)}/reconcile`, { method: "POST" });

/** MOCK provider only; the server rejects it in real modes. */
export const simulatePayment = (id: string, outcome: PaymentOutcome) =>
  apiRequest<PaymentView>(`${paymentPath(id)}/simulate`, { method: "POST", body: { outcome } });

export const listPayments = (params: PaymentListParams, signal?: AbortSignal) =>
  apiRequest<Page<PaymentView>>(`/payments${toQuery(params)}`, { signal });

export const getReconciliation = (signal?: AbortSignal) =>
  apiRequest<Reconciliation>("/payments/reconciliation", { signal });

const IN_FLIGHT_STATUSES = ["PENDING", "CREATED", "UNKNOWN"] as const;

/** The sale's payment that is still open at the provider, if any (the list endpoint has no sale filter). */
export async function findInFlightPayment(saleId: string): Promise<PaymentView | null> {
  for (const status of IN_FLIGHT_STATUSES) {
    const result = await listPayments({ status, size: 50 });
    const match = result.items.find((payment) => payment.saleId === saleId);
    if (match) return match;
  }
  return null;
}

/**
 * Gets the QR payment for a waiting sale. Only one payment can be in progress per sale, so an existing one is
 * reopened instead of creating another (the server answers 409 if one is already running).
 */
export async function openSalePayment(saleId: string, reuseExisting: boolean): Promise<PaymentView> {
  if (reuseExisting) {
    const existing = await findInFlightPayment(saleId);
    if (existing) return existing;
  }
  try {
    return await createPaytmQr({ saleId });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 409) {
      const existing = await findInFlightPayment(saleId);
      if (existing) return existing;
    }
    throw error;
  }
}
