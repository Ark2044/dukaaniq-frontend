"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, PackageCheck, PackagePlus } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/common/States";
import { AdjustStockDialog, type AdjustableProduct } from "./AdjustStockDialog";
import { UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { useInventorySummary } from "@/lib/hooks/useInventory";
import { formatINR, formatQuantity } from "@/lib/utils/format";
import type { InventorySummary } from "@/types/inventory";

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warning" | "danger" }) {
  const color = tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "";
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

function StockValueCard({ summary }: { summary: InventorySummary }) {
  const { productsWithCost, activeProducts } = summary.costCoverage;
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">Stock value at cost</p>
      <p className="mt-1 text-2xl font-bold">{formatINR(summary.stockValueAtCost)}</p>
      <p className="mt-1 text-xs text-muted">
        Based on {productsWithCost} of {activeProducts} products that have a cost price
      </p>
      <p className="mt-0.5 text-xs text-muted">At selling price: {formatINR(summary.stockValueAtSellingPrice)}</p>
    </Card>
  );
}

export function StockOverview() {
  const { data, isPending, isError, error, refetch } = useInventorySummary();
  const [adding, setAdding] = useState<AdjustableProduct | null>(null);

  if (isPending) {
    return (
      <div data-testid="overview-loading" aria-busy="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState title="Could not load stock overview" message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <section aria-label="Stock summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Products" value={String(data.totalProducts)} sub={`${data.activeProducts} active`} />
        <Stat label="Low stock" value={String(data.lowStockCount)} tone={data.lowStockCount > 0 ? "warning" : undefined} />
        <Stat label="Out of stock" value={String(data.outOfStockCount)} tone={data.outOfStockCount > 0 ? "danger" : undefined} />
        <StockValueCard summary={data} />
      </section>

      <section aria-labelledby="low-stock-heading" className="space-y-3">
        <h2 id="low-stock-heading" className="flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className="h-5 w-5 text-warning" aria-hidden /> Low stock
        </h2>
        {data.lowStockItems.length === 0 ? (
          <EmptyState icon={PackageCheck} title="Nothing is running low" description="Products at or below their reorder level will show up here." />
        ) : (
          <ul className="space-y-3">
            {data.lowStockItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/inventory/${item.id}`} className="block truncate text-base font-semibold hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {item.brand ? `${item.brand} · ` : ""}
                    <span className="font-medium text-warning">
                      {formatQuantity(item.stockQuantity)} {UNIT_SHORT_LABELS[item.unit]}
                    </span>{" "}
                    left · reorder at {formatQuantity(item.reorderLevel)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  aria-label={`Add stock for ${item.name}`}
                  onClick={() => setAdding({ id: item.id, name: item.name, unit: item.unit, stockQuantity: item.stockQuantity })}
                >
                  <PackagePlus className="h-4 w-4" aria-hidden /> Add stock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {adding && <AdjustStockDialog open onClose={() => setAdding(null)} product={adding} defaultKind="STOCK_IN" />}
    </div>
  );
}
