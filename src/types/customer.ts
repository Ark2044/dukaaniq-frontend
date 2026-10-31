import type { PaymentMethod } from "./sale";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  active: boolean;
  outstandingBalance: number;
  lastPurchaseAt: string | null;
  totalSales: number;
  totalPurchased: number;
  createdAt: string;
}

export type CustomerSort = "name" | "outstandingBalance" | "lastPurchaseAt" | "createdAt";

export interface CustomerListParams {
  q?: string;
  hasBalance?: boolean;
  inactiveDays?: number;
  active?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CustomerCreateInput {
  name: string;
  phone: string | null;
  notes: string | null;
}

export interface CustomerUpdateInput extends CustomerCreateInput {
  active: boolean;
}

export type LedgerEntryType = "SALE" | "PAYMENT" | "RETURN" | "REFUND" | "CANCELLATION";

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  saleId: string | null;
  saleNumber: string | null;
  method: PaymentMethod | null;
}

export interface CustomerLedger {
  customer: Customer;
  entries: LedgerEntry[];
}

export interface CustomerPaymentInput {
  amount: number;
  method: PaymentMethod;
  note?: string;
  clientRequestId?: string;
}

export interface CustomerPaymentResult {
  paymentGroupId: string;
  amount: number;
  method: PaymentMethod;
  applied: Array<{ saleId: string; saleNumber: string; amount: number }>;
  outstandingBalance: number;
}
