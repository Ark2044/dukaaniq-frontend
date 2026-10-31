"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Card } from "@/components/common/Card";
import { CONTROL_CLASSES } from "@/components/forms/Fields";
import { Skeleton } from "@/components/common/States";
import { formatStock } from "@/components/products/ProductStatus";
import { UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useProductList } from "@/lib/hooks/useProducts";
import { cn, formatINR } from "@/lib/utils/format";
import type { Product } from "@/types/product";

interface ProductSearchProps {
  onAdd: (product: Product) => void;
  /** Product ids already in the cart, shown as added. */
  inCart: ReadonlySet<string>;
  /** Unique when several searches are on one page. */
  inputId?: string;
  label?: string;
  initialQuery?: string;
  /** Renders without its own card, for use inside another card. */
  embedded?: boolean;
}

export function ProductSearch({
  onAdd,
  inCart,
  inputId = "sale-product-search",
  label = "Search products to add",
  initialQuery = "",
  embedded = false,
}: ProductSearchProps) {
  const [text, setText] = useState(initialQuery);
  const query = useDebouncedValue(text.trim(), 300);
  const { data, isPending, isError, refetch } = useProductList({ q: query || undefined, active: true, size: 20 });
  const Wrapper = embedded ? "div" : Card;

  return (
    <Wrapper className={embedded ? "space-y-3" : "space-y-3 p-4"}>
      <div className="relative">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search product, brand or alias"
          className={cn(CONTROL_CLASSES, "border-line pl-10")}
        />
      </div>
      {isPending ? (
        <div data-testid="sale-products-loading" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p role="alert" className="text-sm text-danger">
          Could not load products.{" "}
          <button type="button" onClick={() => refetch()} className="font-semibold underline">
            Try again
          </button>
        </p>
      ) : data.items.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted">
          {query ? `No active products match “${query}”.` : "No active products yet. Add products in Inventory first."}
        </p>
      ) : (
        <ul aria-label="Product results" className="max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {data.items.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onAdd(product)}
                aria-label={`Add ${product.name}`}
                className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left active:bg-background"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{product.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {[product.brand, UNIT_SHORT_LABELS[product.unit]].filter(Boolean).join(" · ")} · Stock {formatStock(product)}
                  </span>
                </span>
                <span className="text-sm font-semibold">{formatINR(product.sellingPrice)}</span>
                <span
                  aria-hidden
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    inCart.has(product.id) ? "bg-success-soft text-success" : "bg-navy-900 text-white",
                  )}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Wrapper>
  );
}
