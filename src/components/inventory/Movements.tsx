"use client";

import { useState, type ReactNode } from "react";
import { History, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Pagination } from "@/components/common/Pagination";
import { ProductPicker } from "@/components/common/pickers";
import type { PickerOption } from "@/components/common/SearchPicker";
import { EmptyState, ErrorState, Skeleton } from "@/components/common/States";
import { SelectField, TextField } from "@/components/forms/Fields";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { MovementList } from "./MovementList";
import { MOVEMENT_TYPE_OPTIONS } from "@/lib/constants/options";
import { useMovements } from "@/lib/hooks/useInventory";
import type { MovementListParams, MovementType } from "@/types/inventory";

const PAGE_SIZE = 20;
const TYPE_CHOICES = [{ value: "", label: "All types" }, ...MOVEMENT_TYPE_OPTIONS];

interface Filters {
  product: PickerOption | null;
  type: MovementType | "";
  from: string;
  to: string;
}
const DEFAULT_FILTERS: Filters = { product: null, type: "", from: "", to: "" };

export function Movements() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [adjusting, setAdjusting] = useState(false);

  const filterKey = JSON.stringify([filters.product?.id, filters.type, filters.from, filters.to]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 0 });
  const page = pageState.key === filterKey ? pageState.page : 0;

  const params: MovementListParams = {
    productId: filters.product?.id,
    type: filters.type || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page,
    size: PAGE_SIZE,
  };
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useMovements(params);
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  let content: ReactNode;
  if (isPending) {
    content = (
      <div data-testid="movements-loading" aria-busy="true" className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  } else if (isError) {
    content = <ErrorState title="Could not load movements" message={error.message} onRetry={() => refetch()} />;
  } else if (data.items.length === 0) {
    content = (
      <EmptyState
        icon={History}
        title={hasFilters ? "No movements match your filters" : "No stock movements yet"}
        description={hasFilters ? "Try a different product, type or date range." : "Sales, purchases and adjustments will be listed here."}
        action={hasFilters ? <Button variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</Button> : undefined}
      />
    );
  } else {
    content = (
      <div className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
        <MovementList movements={data.items} />
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          totalItems={data.totalItems}
          itemLabel={data.totalItems === 1 ? "movement" : "movements"}
          onPageChange={(next) => setPageState({ key: filterKey, page: next })}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setAdjusting(true)}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Adjust stock
        </Button>
      </div>
      <form role="search" aria-label="Filter movements" onSubmit={(e) => e.preventDefault()} className="mb-4 space-y-3">
        <ProductPicker value={filters.product} onChange={(product) => set({ product })} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <SelectField
            label="Type"
            options={TYPE_CHOICES}
            value={filters.type}
            onChange={(e) => set({ type: e.target.value as Filters["type"] })}
          />
          <TextField label="From" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} />
          <TextField label="To" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} />
        </div>
      </form>
      {content}
      {adjusting && <AdjustStockDialog open onClose={() => setAdjusting(false)} defaultKind="STOCK_IN" />}
    </>
  );
}
