import type { QueryClient } from "@tanstack/react-query";
import { ANALYTICS_SUMMARY_KEY } from "@/lib/api/analytics";
import { customerKeys } from "@/lib/api/customers";
import { inventoryKeys } from "@/lib/api/inventory";
import { productKeys } from "@/lib/api/products";
import { saleKeys } from "@/lib/api/sales";

type Area = "sales" | "products" | "customers" | "inventory" | "analytics";

const KEYS: Record<Area, readonly unknown[]> = {
  sales: saleKeys.all,
  products: productKeys.all,
  customers: customerKeys.all,
  inventory: inventoryKeys.all,
  analytics: ANALYTICS_SUMMARY_KEY,
};

export const SALE_AREAS: Area[] = ["sales", "products", "customers", "inventory", "analytics"];
export const STOCK_AREAS: Area[] = ["products", "inventory", "analytics"];
export const CUSTOMER_PAYMENT_AREAS: Area[] = ["customers", "sales", "analytics"];

export const invalidateAreas = (queryClient: QueryClient, areas: Area[]) =>
  Promise.all(areas.map((area) => queryClient.invalidateQueries({ queryKey: KEYS[area] })));
