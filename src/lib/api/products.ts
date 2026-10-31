import { apiRequest } from "./client";
import type {
  ImportResult,
  Page,
  Product,
  ProductCreateInput,
  ProductListParams,
  ProductResolution,
  ProductUpdateInput,
} from "@/types/product";

export const IMPORT_TEMPLATE_URL = "/api/v1/products/import/template";

export const productKeys = {
  all: ["products"] as const,
  list: (params: ProductListParams) => ["products", "list", params] as const,
  detail: (id: string) => ["products", "detail", id] as const,
  categories: ["products", "categories"] as const,
};

function toQuery(params: ProductListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const listProducts = (params: ProductListParams, signal?: AbortSignal) =>
  apiRequest<Page<Product>>(`/products${toQuery(params)}`, { signal });

export const getProduct = (id: string, signal?: AbortSignal) =>
  apiRequest<Product>(`/products/${encodeURIComponent(id)}`, { signal });

export const createProduct = (input: ProductCreateInput) =>
  apiRequest<Product>("/products", { method: "POST", body: input });

export const updateProduct = (id: string, input: ProductUpdateInput) =>
  apiRequest<Product>(`/products/${encodeURIComponent(id)}`, { method: "PUT", body: input });

/** Soft-deactivates the product (active=false); it can be re-activated via updateProduct. */
export const deactivateProduct = (id: string) =>
  apiRequest<Product>(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });

export const listProductCategories = (signal?: AbortSignal) =>
  apiRequest<string[]>("/products/categories", { signal });

export const resolveProduct = (q: string, signal?: AbortSignal) =>
  apiRequest<ProductResolution>(`/products/resolve?q=${encodeURIComponent(q)}`, { signal });

export function importProducts(file: File, dryRun: boolean) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<ImportResult>(`/products/import?dryRun=${dryRun}`, { method: "POST", body: form });
}
