import { apiRequest } from "./client";
import type {
  BillConfirmRequest,
  BillConfirmResult,
  BillScanStarted,
  BillScanStatusResponse,
} from "@/types/billScan";

/** Uploads the bill as multipart `file`; the backend answers 202 immediately and processes asynchronously. */
export function startBillScan(file: File, signal?: AbortSignal) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<BillScanStarted>("/products/bill-scan", { method: "POST", body: form, signal });
}

export const getBillScan = (scanId: string, signal?: AbortSignal) =>
  apiRequest<BillScanStatusResponse>(`/products/bill-scan/${encodeURIComponent(scanId)}`, { signal });

export const confirmBillScan = (scanId: string, request: BillConfirmRequest) =>
  apiRequest<BillConfirmResult>(`/products/bill-scan/${encodeURIComponent(scanId)}/confirm`, {
    method: "POST",
    body: request,
  });
