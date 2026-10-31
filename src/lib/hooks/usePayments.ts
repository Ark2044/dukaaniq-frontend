"use client";

import { useEffect, useRef } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  createPaytmQr,
  getPaymentConfig,
  getPaymentStatus,
  getReconciliation,
  listPayments,
  openSalePayment,
  paymentKeys,
  reconcilePayment,
  simulatePayment,
} from "@/lib/api/payments";
import { CUSTOMER_PAYMENT_AREAS, invalidateAreas } from "./invalidate";
import { PAYMENT_POLL_INTERVAL_MS, isPaymentInProgress } from "@/lib/payments/status";
import type { CreatePaytmQrInput, PaymentListParams, PaymentOutcome, PaymentView } from "@/types/payment";

export const usePaymentConfig = (enabled = true) =>
  useQuery({ queryKey: paymentKeys.config, queryFn: ({ signal }) => getPaymentConfig(signal), enabled });

export const usePaymentList = (params: PaymentListParams) =>
  useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: ({ signal }) => listPayments(params, signal),
    placeholderData: keepPreviousData,
  });

export const useReconciliation = () =>
  useQuery({ queryKey: paymentKeys.reconciliation, queryFn: ({ signal }) => getReconciliation(signal) });

/** Stores the server's latest view of a payment and refreshes everything a settled payment touches. */
async function applyPayment(queryClient: QueryClient, payment: PaymentView) {
  queryClient.setQueryData(paymentKeys.status(payment.id), payment);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: paymentKeys.views }),
    payment.status === "SUCCESS" ? invalidateAreas(queryClient, CUSTOMER_PAYMENT_AREAS) : undefined,
  ]);
}

function usePaymentMutation<TInput>(request: (input: TInput) => Promise<PaymentView>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: request, onSuccess: (payment) => applyPayment(queryClient, payment) });
}

export const useCreatePaytmQr = () => usePaymentMutation((input: CreatePaytmQrInput) => createPaytmQr(input));

/** Creates the QR for a waiting sale, or reopens the one already in flight (`reuseExisting`). */
export const useOpenSalePayment = () =>
  usePaymentMutation(({ saleId, reuseExisting }: { saleId: string; reuseExisting: boolean }) => openSalePayment(saleId, reuseExisting));

/** Forces a provider status check; use for PENDING/UNKNOWN payments. */
export const useReconcilePayment = () => usePaymentMutation((id: string) => reconcilePayment(id));

/** MOCK provider only. */
export const useSimulatePayment = (id: string) =>
  usePaymentMutation((outcome: PaymentOutcome) => simulatePayment(id, outcome));

/**
 * Polls GET /payments/{id}/status every few seconds while the server reports the payment as in progress.
 * The interval belongs to the query observer, so it stops on SUCCESS/FAILED/REFUNDED and when the
 * component unmounts. Sales, customers and analytics are refreshed once when the payment turns SUCCESS.
 */
export function usePaymentStatus(id: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: paymentKeys.status(id ?? ""),
    queryFn: ({ signal }) => getPaymentStatus(id as string, signal),
    enabled: id !== null,
    staleTime: PAYMENT_POLL_INTERVAL_MS,
    refetchInterval: (q) => (isPaymentInProgress(q.state.data?.status) ? PAYMENT_POLL_INTERVAL_MS : false),
  });

  const refreshedFor = useRef<string | null>(null);
  const settled = query.data?.status === "SUCCESS" ? query.data.id : null;
  useEffect(() => {
    if (!settled || refreshedFor.current === settled) return;
    refreshedFor.current = settled;
    void invalidateAreas(queryClient, CUSTOMER_PAYMENT_AREAS);
  }, [settled, queryClient]);

  return query;
}
