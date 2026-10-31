"use client";

import Link from "next/link";
import { ArrowLeft, ReceiptText, UserRound } from "lucide-react";
import { buttonStyles } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/common/States";
import { SaleItemsList } from "../SaleItemsList";
import { SaleStatusBadge, VoiceBadge } from "../SaleBadges";
import { SaleTotalsList } from "../SaleTotalsList";
import { SaleActions } from "./SaleActions";
import { SalePaymentsList } from "./SalePaymentsList";
import { SaleAwaitingPayment } from "@/components/payments/SaleAwaitingPayment";
import { ApiClientError } from "@/lib/api/client";
import { pollWhileWaiting, useSale } from "@/lib/hooks/useSales";
import { formatDateTime } from "@/lib/utils/format";

function SaleSkeleton() {
  return (
    <div data-testid="sale-loading" aria-busy="true" className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function SaleDetails({ id }: { id: string }) {
  const { data: sale, isPending, isError, error, refetch } = useSale(id, { refetchInterval: pollWhileWaiting });

  const back = (
    <Link href="/sales" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-navy-900">
      <ArrowLeft className="h-4 w-4" aria-hidden /> Sales
    </Link>
  );

  if (isPending) {
    return (
      <>
        {back}
        <SaleSkeleton />
      </>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiClientError && error.status === 404;
    return (
      <>
        {back}
        {notFound ? (
          <EmptyState
            icon={ReceiptText}
            title="Sale not found"
            description="It may belong to a different shop."
            action={
              <Link href="/sales" className={buttonStyles("secondary")}>
                Back to sales
              </Link>
            }
          />
        ) : (
          <ErrorState title="Could not load sale" message={error.message} onRetry={() => refetch()} />
        )}
      </>
    );
  }

  return (
    <>
      {back}
      <header className="mb-5 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{sale.saleNumber}</h1>
          <SaleStatusBadge status={sale.status} paymentStatus={sale.paymentStatus} />
          <VoiceBadge source={sale.source} />
        </div>
        <p className="text-sm text-muted">{formatDateTime(sale.createdAt)}</p>
        <p className="flex items-center gap-1.5 text-sm">
          <UserRound className="h-4 w-4 text-muted" aria-hidden />
          {sale.customer ? (
            <span className="font-medium">{sale.customer.name}</span>
          ) : (
            <span className="text-muted">Walk-in customer</span>
          )}
        </p>
      </header>

      <div className="space-y-4">
        {sale.status === "CANCELLED" && (
          <Card className="bg-background">
            <p className="text-sm font-semibold">This sale was cancelled{sale.cancelledAt ? ` on ${formatDateTime(sale.cancelledAt)}` : ""}.</p>
            {sale.cancelReason && <p className="mt-1 text-sm text-muted">Reason: {sale.cancelReason}</p>}
          </Card>
        )}
        <SaleAwaitingPayment sale={sale} startAgainHref="/sales/new" showViewSale={false} />
        <SaleActions sale={sale} />
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Card className="space-y-3">
            <h2 className="text-base font-semibold">Items</h2>
            <SaleItemsList items={sale.items} />
          </Card>
          <Card className="space-y-3">
            <h2 className="text-base font-semibold">Amounts</h2>
            <SaleTotalsList sale={sale} awaitingPayment={sale.status === "PENDING_PAYMENT"} />
          </Card>
          <Card className="space-y-3">
            <h2 className="text-base font-semibold">Payments</h2>
            <SalePaymentsList payments={sale.payments} />
          </Card>
          {sale.voiceTranscript && (
            <Card className="space-y-2">
              <h2 className="text-base font-semibold">Original voice transcript</h2>
              <blockquote className="rounded-xl bg-background px-4 py-3 text-sm italic">{sale.voiceTranscript}</blockquote>
            </Card>
          )}
          {sale.note && (
            <Card className="space-y-2">
              <h2 className="text-base font-semibold">Note</h2>
              <p className="text-sm">{sale.note}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
