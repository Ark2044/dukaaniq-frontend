import type { Product, Unit } from "./product";

export interface LowStockItem {
  id: string;
  name: string;
  brand: string | null;
  unit: Unit;
  stockQuantity: number;
  reorderLevel: number;
}

export interface InventorySummary {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockValueAtCost: number;
  stockValueAtSellingPrice: number;
  costCoverage: { productsWithCost: number; activeProducts: number };
  lowStockItems: LowStockItem[];
}

export type MovementType = "IN" | "OUT" | "ADJUSTMENT" | "RETURN" | "PURCHASE";
export type AdjustmentReason = "DAMAGE" | "LOSS" | "COUNT_CORRECTION" | "OTHER";

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  type: MovementType;
  reason: string | null;
  quantityChange: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
}

export interface MovementListParams {
  productId?: string;
  type?: MovementType;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface AdjustmentInput {
  productId: string;
  type: "PURCHASE" | "ADJUSTMENT";
  quantity: number;
  reason: "PURCHASE" | AdjustmentReason;
  note?: string;
}

export interface AdjustmentResult {
  movement: StockMovement;
  product: Product;
}
