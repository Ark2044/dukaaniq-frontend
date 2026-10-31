import type { PaymentLabel } from "./payment";
import type { Unit } from "./product";

export type PaymentMethod = "CASH" | "UPI" | "CARD";
/** PENDING_PAYMENT: a Paytm QR sale that holds its stock but is not complete until Paytm confirms the money. */
export type SaleStatus = "COMPLETED" | "CANCELLED" | "PENDING_PAYMENT";
export type PaymentStatus = "PAID" | "PARTIAL" | "UNPAID";
export type SaleSource = "MANUAL" | "VOICE";
export type PaymentKind = "SALE_PAYMENT" | "CREDIT_SETTLEMENT" | "REFUND";
export type PaymentRecordStatus = "CREATED" | "PENDING" | "SUCCESS" | "FAILED" | "UNKNOWN" | "REFUNDED";

export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  brand: string | null;
  unit: Unit;
  packSize: number | null;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SalePayment {
  id: string;
  kind: PaymentKind;
  /** Manual payments are CASH/UPI/CARD; provider payments (M4) may carry other methods. */
  method: string;
  amount: number;
  status: PaymentRecordStatus;
  provider: string | null;
  /** SIMULATED / PAYTM SANDBOX / PAYTM for provider payments; absent or null for manual ones. */
  label?: PaymentLabel | null;
  simulated: boolean;
  verified: boolean;
  orderId: string | null;
  createdAt: string;
  note: string | null;
}

export interface Sale {
  id: string;
  saleNumber: string;
  status: SaleStatus;
  createdAt: string;
  customer: { id: string; name: string } | null;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  returnedAmount: number;
  netAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: PaymentStatus | null;
  payments: SalePayment[];
  note: string | null;
  source: SaleSource;
  voiceTranscript: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface SaleSummary {
  id: string;
  saleNumber: string;
  createdAt: string;
  status: SaleStatus;
  customerName: string | null;
  itemCount: number;
  totalAmount: number;
  netAmount: number;
  dueAmount: number;
  paymentStatus: PaymentStatus | null;
  source: SaleSource;
}

export interface SaleListParams {
  from?: string;
  to?: string;
  customerId?: string;
  status?: SaleStatus;
  paymentStatus?: PaymentStatus;
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  /** Only sent when the merchant overrides the catalogue price. */
  unitPrice?: number;
}

export interface CreateSaleInput {
  clientRequestId: string;
  customerId?: string;
  items: CreateSaleItemInput[];
  discountAmount?: number;
  payments: Array<{ method: PaymentMethod; amount: number }>;
  note?: string;
  /** The confirmed voice draft this sale comes from; a draft can back exactly one sale. */
  voiceInteractionId?: string;
  /** Pay by Paytm QR at confirmation; `payments` must then be empty. */
  collectViaPaytm?: boolean;
}

export interface RecordPaymentInput {
  method: PaymentMethod;
  amount: number;
  note?: string;
}

export interface ReturnSaleInput {
  items: Array<{ saleItemId: string; quantity: number }>;
  refundMethod?: PaymentMethod;
  reason?: string;
}

export interface CancelSaleInput {
  reason?: string;
  refundMethod?: PaymentMethod;
}
