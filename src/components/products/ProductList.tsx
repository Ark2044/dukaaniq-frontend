"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Camera, PackagePlus, Upload } from "lucide-react";
import { PageHeader } from "@/components/common/Card";
import { Button, buttonStyles } from "@/components/common/Button";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/common/States";
import { AdjustStockDialog } from "@/components/inventory/AdjustStockDialog";
import { InventoryTabs } from "@/components/inventory/InventoryTabs";
import { ProductCard } from "./ProductCard";
import { ProductFilters, type ProductFilterState } from "./ProductFilters";
import { ProductTable } from "./ProductTable";
import { useProductCategories, useProductList } from "@/lib/hooks/useProducts";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { Product, ProductListParams } from "@/types/product";

const PAGE_SIZE = 20;
const DEFAULT_FILTERS: ProductFilterState = { search: "", category: "", active: "active", lowStock: false };

/** Scanning a bill is the primary way to add products; manual entry and CSV import are secondary. */
function AddProductActions() {
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap">
      <Link href="/inventory/scan" className={buttonStyles("primary", "col-span-2 min-h-14 sm:min-h-12")}>
        <Camera className="h-5 w-5" aria-hidden /> Scan bill
      </Link>
      <Link href="/inventory/new" className={buttonStyles("secondary")}>
        <PackagePlus className="h-4 w-4" aria-hidden /> Add product
      </Link>
      <Link href="/inventory/import" className={buttonStyles("secondary")}>
        <Upload className="h-4 w-4" aria-hidden /> Import CSV
      </Link>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div data-testid="products-loading" aria-busy="true" className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function ProductList() {
  const [filters, setFilters] = useState<ProductFilterState>(DEFAULT_FILTERS);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search.trim(), 300);

  // The page belongs to the filter set it was chosen for; any filter change implicitly returns to page 1.
  const filterKey = JSON.stringify([debouncedSearch, filters.category, filters.active, filters.lowStock]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 0 });
  const page = pageState.key === filterKey ? pageState.page : 0;

  const params: ProductListParams = {
    q: debouncedSearch || undefined,
    category: filters.category || undefined,
    active: filters.active === "all" ? undefined : filters.active === "active",
    lowStock: filters.lowStock || undefined,
    page,
    size: PAGE_SIZE,
  };

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useProductList(params);
  const categories = useProductCategories().data ?? [];

  const hasFilters =
    filters.search.trim() !== "" || filters.category !== "" || filters.active !== "active" || filters.lowStock;

  let content: ReactNode;
  if (isPending) {
    content = <ListSkeleton />;
  } else if (isError) {
    content = <ErrorState title="Could not load products" message={error.message} onRetry={() => refetch()} />;
  } else if (data.items.length === 0) {
    content = hasFilters ? (
      <EmptyState
        title="No products match your filters"
        description="Try a different search or clear the filters."
        action={<Button variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</Button>}
      />
    ) : (
      <EmptyState
        icon={Camera}
        title="Scan a bill to add products"
        description="Take a photo of a supplier bill and we'll read the items for you. You can also add products manually or import a CSV file."
        action={<AddProductActions />}
      />
    );
  } else {
    content = (
      <div className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
        <ul className="space-y-3 md:hidden">
          {data.items.map((product) => (
            <ProductCard key={product.id} product={product} onAdjust={setAdjusting} />
          ))}
        </ul>
        <div className="hidden md:block">
          <ProductTable products={data.items} onAdjust={setAdjusting} />
        </div>
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          totalItems={data.totalItems}
          itemLabel={data.totalItems === 1 ? "product" : "products"}
          onPageChange={(next) => setPageState({ key: filterKey, page: next })}
        />
      </div>
    );
  }

  const emptyCatalogue = !isPending && !isError && data.items.length === 0 && !hasFilters;

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Your product catalogue and stock levels."
        actions={emptyCatalogue ? undefined : <AddProductActions />}
      />
      <InventoryTabs />
      <ProductFilters value={filters} categories={categories} onChange={setFilters} />
      {content}
      {adjusting && <AdjustStockDialog open onClose={() => setAdjusting(null)} product={adjusting} />}
    </>
  );
}
