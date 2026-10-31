import { apiRequest } from "./client";
import { toQuery } from "./query";
import type { AdjustmentInput, AdjustmentResult, InventorySummary, MovementListParams, StockMovement } from "@/types/inventory";
import type { Page } from "@/types/product";

export const inventoryKeys = {
  all: ["inventory"] as const,
  summary: ["inventory", "summary"] as const,
  movements: (params: MovementListParams) => ["inventory", "movements", params] as const,
};

export const getInventorySummary = (signal?: AbortSignal) =>
  apiRequest<InventorySummary>("/inventory/summary", { signal });

export const listMovements = (params: MovementListParams, signal?: AbortSignal) =>
  apiRequest<Page<StockMovement>>(`/inventory/movements${toQuery(params)}`, { signal });

export const adjustStock = (input: AdjustmentInput) =>
  apiRequest<AdjustmentResult>("/inventory/adjustments", { method: "POST", body: input });
