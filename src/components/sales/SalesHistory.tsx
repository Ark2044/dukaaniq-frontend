"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { buttonStyles } from "@/components/common/Button";
import { Button } from "@/components/common/Button";
import { PageHeader } from "@/components/common/Card";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/common/States";
import { DEFAULT_SALE_FILTERS, SaleFilters, type SaleFilterState } from "./SaleFilters";
import { SaleCard } from "./SaleCard";
import { SaleTable } from "./SaleTable";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useSaleList } from "@/lib/hooks/useSales";
import type { SaleListParams } from "@/types/sale";

const PAGE_SIZE = 20;

function ListSkeleton() {
  return (
    <div data-testid="sales-loading" aria-busy="true" className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function SalesHistory() {
  const [filters, setFilters] = useState<SaleFilterState>(DEFAULT_SALE_FILTERS);
  const debouncedQ = useDebouncedValue(filters.q.trim(), 300);

  const filterKey = JSON.stringify([debouncedQ, filters.from, filters.to, filters.status, filters.paymentStatus, filters.customer?.id]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 0 });
  const page = pageState.key === filterKey ? pageState.page : 0;

  const params: SaleListParams = {
    q: debouncedQ || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    status: filters.status || undefined,
    paymentStatus: filters.paymentStatus || undefined,
    customerId: filters.customer?.id,
    page,
    size: PAGE_SIZE,
    sort: "createdAt,desc",
  };

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useSaleList(params);
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_SALE_FILTERS);

  let content: ReactNode;
  if (isPending) content = <ListSkeleton />;
  else if (isError) content = <ErrorState title="Could not load sales" message={error.message} onRetry={() => refetch()} />;
  else if (data.items.length === 0) {
    content = hasFilters ? (
      <EmptyState
        icon={Receipt}
        title="No sales match your filters"
        description="Try a different date range or clear the filters."
        action={<Button variant="secondary" onClick={() => setFilters(DEFAULT_SALE_FILTERS)}>Clear filters</Button>}
      />
    ) : (
      <EmptyState
        icon={Receipt}
        title="No sales yet"
        description="Sales you record will appear here."
        action={
          <Link href="/sales/new" className={buttonStyles("primary")}>
            <Plus className="h-4 w-4" aria-hidden /> Record your first sale
          </Link>
        }
      />
    );
  } else {
    content = (
      <div className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
        <ul className="space-y-3 md:hidden">
          {data.items.map((sale) => (
            <SaleCard key={sale.id} sale={sale} />
          ))}
        </ul>
        <div className="hidden md:block">
          <SaleTable sales={data.items} />
        </div>
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          totalItems={data.totalItems}
          itemLabel={data.totalItems === 1 ? "sale" : "sales"}
          onPageChange={(next) => setPageState({ key: filterKey, page: next })}
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Sales"
        description="Every sale you have recorded."
        actions={
          <Link href="/sales/new" className={buttonStyles("primary", "min-h-12")}>
            <Plus className="h-4 w-4" aria-hidden /> Quick sale
          </Link>
        }
      />
      <SaleFilters value={filters} onChange={setFilters} />
      {content}
    </>
  );
}
