import { ApiClientError, apiRequest } from "./client";
import { toQuery } from "./query";
import type { Page } from "@/types/product";
import type {
  CancelSaleInput,
  CreateSaleInput,
  RecordPaymentInput,
  ReturnSaleInput,
  Sale,
  SaleListParams,
  SaleSummary,
} from "@/types/sale";

export const saleKeys = {
  all: ["sales"] as const,
  list: (params: SaleListParams) => ["sales", "list", params] as const,
  detail: (id: string) => ["sales", "detail", id] as const,
};

export const listSales = (params: SaleListParams, signal?: AbortSignal) =>
  apiRequest<Page<SaleSummary>>(`/sales${toQuery(params)}`, { signal });

export const getSale = (id: string, signal?: AbortSignal) =>
  apiRequest<Sale>(`/sales/${encodeURIComponent(id)}`, { signal });

/** A replayed clientRequestId answers 200 with the original sale; the client treats it like 201. */
export async function createSale(input: CreateSaleInput): Promise<Sale> {
  const sale = await apiRequest<Sale>("/sales", { method: "POST", body: input });
  // A server that predates Paytm-at-confirmation ignores the request and saves a plain, unpaid sale. Showing that as
  // success would leave an unpaid sale and no QR, so say so clearly instead.
  if (input.collectViaPaytm && sale.status === "COMPLETED" && sale.dueAmount > 0) {
    throw new ApiClientError(200, {
      code: "SERVER_OUT_OF_DATE",
      message: `The server is out of date and does not support Paytm QR, so sale ${sale.saleNumber} was saved as unpaid with no QR. Restart the backend, then open sale ${sale.saleNumber} and cancel it.`,
      details: [],
    });
  }
  return sale;
}

export const recordSalePayment = (id: string, input: RecordPaymentInput) =>
  apiRequest<Sale>(`/sales/${encodeURIComponent(id)}/payments`, { method: "POST", body: input });

export const returnSaleItems = (id: string, input: ReturnSaleInput) =>
  apiRequest<Sale>(`/sales/${encodeURIComponent(id)}/return`, { method: "POST", body: input });

/**
 * The shop gives up on a Paytm QR sale. 409 means the money just arrived (or the sale already resolved):
 * callers must then refetch and show what the server says.
 */
export const abandonSalePayment = (id: string) =>
  apiRequest<Sale>(`/sales/${encodeURIComponent(id)}/abandon-payment`, { method: "POST" });

export const cancelSale = (id: string, input: CancelSaleInput) =>
  apiRequest<Sale>(`/sales/${encodeURIComponent(id)}/cancel`, { method: "POST", body: input });
