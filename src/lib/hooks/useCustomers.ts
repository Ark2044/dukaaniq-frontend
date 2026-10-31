"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomer,
  customerKeys,
  getCustomer,
  getCustomerLedger,
  listCustomers,
  recordCustomerPayment,
  updateCustomer,
} from "@/lib/api/customers";
import { CUSTOMER_PAYMENT_AREAS, invalidateAreas } from "./invalidate";
import type { CustomerCreateInput, CustomerListParams, CustomerPaymentInput, CustomerUpdateInput } from "@/types/customer";

export const useCustomerList = (params: CustomerListParams, enabled = true) =>
  useQuery({
    queryKey: customerKeys.list(params),
    queryFn: ({ signal }) => listCustomers(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useCustomer = (id: string) =>
  useQuery({ queryKey: customerKeys.detail(id), queryFn: ({ signal }) => getCustomer(id, signal) });

export const useCustomerLedger = (id: string) =>
  useQuery({ queryKey: customerKeys.ledger(id), queryFn: ({ signal }) => getCustomerLedger(id, signal) });

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerCreateInput) => createCustomer(input),
    onSuccess: () => invalidateAreas(queryClient, ["customers", "analytics"]),
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerUpdateInput) => updateCustomer(id, input),
    onSuccess: () => invalidateAreas(queryClient, ["customers", "analytics"]),
  });
}

export function useRecordCustomerPayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerPaymentInput) => recordCustomerPayment(id, input),
    onSuccess: () => invalidateAreas(queryClient, CUSTOMER_PAYMENT_AREAS),
  });
}
