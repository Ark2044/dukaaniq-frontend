"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentKeys } from "@/lib/api/payments";
import {
  abandonSalePayment,
  cancelSale,
  createSale,
  getSale,
  listSales,
  recordSalePayment,
  returnSaleItems,
  saleKeys,
} from "@/lib/api/sales";
import { SALE_AREAS, invalidateAreas } from "./invalidate";
import type { CancelSaleInput, CreateSaleInput, RecordPaymentInput, ReturnSaleInput, Sale, SaleListParams } from "@/types/sale";

export const useSaleList = (params: SaleListParams) =>
  useQuery({
    queryKey: saleKeys.list(params),
    queryFn: ({ signal }) => listSales(params, signal),
    placeholderData: keepPreviousData,
  });

interface UseSaleOptions {
  enabled?: boolean;
  staleTime?: number;
  /** Milliseconds between refetches for the sale's current data, or false to stop. */
  refetchInterval?: (sale: Sale | undefined) => number | false;
}

export const useSale = (id: string, { enabled, staleTime, refetchInterval }: UseSaleOptions = {}) =>
  useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: ({ signal }) => getSale(id, signal),
    enabled,
    staleTime,
    refetchInterval: refetchInterval ? (query) => refetchInterval(query.state.data) : false,
  });

/** A sale that waits for its Paytm payment is checked again every few seconds until the server settles it. */
export const WAITING_SALE_POLL_MS = 5000;
export const pollWhileWaiting = (sale: Sale | undefined): number | false =>
  sale?.status === "PENDING_PAYMENT" ? WAITING_SALE_POLL_MS : false;

/** Runs a sale mutation, stores the server's Sale as the detail cache and refreshes everything a sale touches. */
function useSaleMutation<TInput>(request: (input: TInput) => Promise<Sale>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: async (sale) => {
      queryClient.setQueryData(saleKeys.detail(sale.id), sale);
      await invalidateAreas(queryClient, SALE_AREAS);
    },
  });
}

export const useCreateSale = () => useSaleMutation((input: CreateSaleInput) => createSale(input));

export const useRecordSalePayment = (id: string) =>
  useSaleMutation((input: RecordPaymentInput) => recordSalePayment(id, input));

export const useReturnSale = (id: string) => useSaleMutation((input: ReturnSaleInput) => returnSaleItems(id, input));

export const useCancelSale = (id: string) => useSaleMutation((input: CancelSaleInput) => cancelSale(id, input));

/**
 * "Cancel payment" on a waiting Paytm sale. On success the sale is CANCELLED and its stock is back; a 409 means
 * the money just arrived, so the sale is refetched to show what the server now says.
 */
export function useAbandonSalePayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => abandonSalePayment(id),
    onSuccess: async (sale) => {
      queryClient.setQueryData(saleKeys.detail(sale.id), sale);
      await Promise.all([invalidateAreas(queryClient, SALE_AREAS), queryClient.invalidateQueries({ queryKey: paymentKeys.views })]);
    },
    onError: () => queryClient.invalidateQueries({ queryKey: saleKeys.detail(id) }),
  });
}
