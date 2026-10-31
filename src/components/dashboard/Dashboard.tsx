"use client";

import Link from "next/link";
import { BarChart3, Plus } from "lucide-react";
import { buttonStyles } from "@/components/common/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/common/States";
import { CreditGivenCard, LowStockCard, OutstandingCreditCard } from "./AttentionCards";
import { CollectionsCard } from "./CollectionsCard";
import { PeriodCards } from "./PeriodCards";
import { QuickActions } from "./QuickActions";
import { SalesChart } from "./SalesChart";
import { SystemStatusSection } from "./SystemStatusSection";
import { TodayHero } from "./TodayHero";
import { useAnalyticsSummary } from "@/lib/hooks/useAnalytics";
import type { AnalyticsSummary } from "@/types/analytics";

const hasNoSales = (s: AnalyticsSummary) =>
  s.monthToDateStats.transactions === 0 && s.last7DaysStats.transactions === 0 && s.dailySales.every((d) => d.transactions === 0);

function DashboardSkeleton() {
  return (
    <div data-testid="dashboard-loading" aria-busy="true" className="space-y-4">
      <Skeleton className="h-44 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function Dashboard() {
  const { data, isPending, isError, error, refetch } = useAnalyticsSummary();

  return (
    <div className="space-y-4">
      <QuickActions />
      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <ErrorState title="Could not load your numbers" message={error.message} onRetry={() => refetch()} />
      ) : (
        <>
          {hasNoSales(data) ? (
            <EmptyState
              icon={BarChart3}
              title="No sales yet"
              description="Your sales, collections and trends will show up here as soon as you record a sale."
              action={
                <Link href="/sales/new" className={buttonStyles("primary", "min-h-14")}>
                  <Plus className="h-5 w-5" aria-hidden /> Record your first sale
                </Link>
              }
            />
          ) : (
            <>
              <TodayHero summary={data} />
              <PeriodCards last7Days={data.last7DaysStats} monthToDate={data.monthToDateStats} />
              <SalesChart data={data.dailySales} />
            </>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <CollectionsCard collections={data.collectionsToday} />
            <div className="space-y-3">
              <CreditGivenCard amount={data.creditGivenToday} />
              <OutstandingCreditCard credit={data.outstandingCredit} />
              <LowStockCard count={data.lowStockCount} />
            </div>
          </div>
          {data.dataNotes.length > 0 && (
            <aside aria-label="About these numbers" className="rounded-xl bg-background px-4 py-3 text-xs text-muted">
              <p className="mb-1 font-semibold">About these numbers</p>
              <ul className="list-disc space-y-1 pl-4">
                {data.dataNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </aside>
          )}
        </>
      )}
      <SystemStatusSection />
    </div>
  );
}
