"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adjustStock, getInventorySummary, inventoryKeys, listMovements } from "@/lib/api/inventory";
import { STOCK_AREAS, invalidateAreas } from "./invalidate";
import type { AdjustmentInput, MovementListParams } from "@/types/inventory";

export const useInventorySummary = () =>
  useQuery({ queryKey: inventoryKeys.summary, queryFn: ({ signal }) => getInventorySummary(signal) });

export const useMovements = (params: MovementListParams) =>
  useQuery({
    queryKey: inventoryKeys.movements(params),
    queryFn: ({ signal }) => listMovements(params, signal),
    placeholderData: keepPreviousData,
  });

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustmentInput) => adjustStock(input),
    onSuccess: () => invalidateAreas(queryClient, STOCK_AREAS),
  });
}
