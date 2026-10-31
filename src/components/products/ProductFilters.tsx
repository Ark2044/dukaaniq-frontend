"use client";

import { Search } from "lucide-react";
import { CONTROL_CLASSES } from "@/components/forms/Fields";
import { cn } from "@/lib/utils/format";

export type ActiveFilter = "active" | "inactive" | "all";

export interface ProductFilterState {
  search: string;
  category: string;
  active: ActiveFilter;
  lowStock: boolean;
}

interface ProductFiltersProps {
  value: ProductFilterState;
  categories: string[];
  onChange: (next: ProductFilterState) => void;
}

export function ProductFilters({ value, categories, onChange }: ProductFiltersProps) {
  const set = (patch: Partial<ProductFilterState>) => onChange({ ...value, ...patch });
  return (
    <form role="search" aria-label="Filter products" onSubmit={(e) => e.preventDefault()} className="mb-4 space-y-3">
      <div className="relative">
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id="product-search"
          type="search"
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search by name, brand, SKU, barcode or alias"
          className={cn(CONTROL_CLASSES, "border-line pl-10")}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor="product-category" className="sr-only">
            Category
          </label>
          <select
            id="product-category"
            value={value.category}
            onChange={(e) => set({ category: e.target.value })}
            className={cn(CONTROL_CLASSES, "border-line")}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="product-active" className="sr-only">
            Status
          </label>
          <select
            id="product-active"
            value={value.active}
            onChange={(e) => set({ active: e.target.value as ActiveFilter })}
            className={cn(CONTROL_CLASSES, "border-line")}
          >
            <option value="active">Active products</option>
            <option value="inactive">Inactive products</option>
            <option value="all">All products</option>
          </select>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.lowStock}
          onClick={() => set({ lowStock: !value.lowStock })}
          className={cn(
            "col-span-2 flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 text-sm font-medium md:col-span-1",
            value.lowStock ? "border-warning bg-warning-soft text-warning" : "border-line bg-surface",
          )}
        >
          Low stock only
          <span
            aria-hidden
            className={cn("flex h-6 w-10 items-center rounded-full p-0.5", value.lowStock ? "bg-warning" : "bg-line")}
          >
            <span className={cn("h-5 w-5 rounded-full bg-white transition-transform", value.lowStock && "translate-x-4")} />
          </span>
        </button>
      </div>
    </form>
  );
}
