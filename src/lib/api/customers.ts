import { apiRequest } from "./client";
import { toQuery } from "./query";
import type {
  Customer,
  CustomerCreateInput,
  CustomerLedger,
  CustomerListParams,
  CustomerPaymentInput,
  CustomerPaymentResult,
  CustomerUpdateInput,
} from "@/types/customer";
import type { Page } from "@/types/product";

export const customerKeys = {
  all: ["customers"] as const,
  list: (params: CustomerListParams) => ["customers", "list", params] as const,
  detail: (id: string) => ["customers", "detail", id] as const,
  ledger: (id: string) => ["customers", "ledger", id] as const,
};

export const listCustomers = (params: CustomerListParams, signal?: AbortSignal) =>
  apiRequest<Page<Customer>>(`/customers${toQuery(params)}`, { signal });

export const getCustomer = (id: string, signal?: AbortSignal) =>
  apiRequest<Customer>(`/customers/${encodeURIComponent(id)}`, { signal });

export const createCustomer = (input: CustomerCreateInput) =>
  apiRequest<Customer>("/customers", { method: "POST", body: input });

export const updateCustomer = (id: string, input: CustomerUpdateInput) =>
  apiRequest<Customer>(`/customers/${encodeURIComponent(id)}`, { method: "PUT", body: input });

export const getCustomerLedger = (id: string, signal?: AbortSignal) =>
  apiRequest<CustomerLedger>(`/customers/${encodeURIComponent(id)}/ledger`, { signal });

export const recordCustomerPayment = (id: string, input: CustomerPaymentInput) =>
  apiRequest<CustomerPaymentResult>(`/customers/${encodeURIComponent(id)}/payments`, { method: "POST", body: input });
