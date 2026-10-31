"use client";

import Link from "next/link";
import { ArrowLeft, FlaskConical, ShieldCheck } from "lucide-react";
import { Card, PageHeader } from "@/components/common/Card";
import { SimulatedBadge } from "@/components/common/Badge";
import { ErrorState, Skeleton } from "@/components/common/States";
import { PaymentModeCard } from "./PaymentModeCard";
import { PaymentRow } from "./PaymentRow";
import { useReconciliation } from "@/lib/hooks/usePayments";
import { PAYMENT_STATUS_LABELS, PROVIDER_MODE_LABELS } from "@/lib/payments/status";
import { formatINR } from "@/lib/utils/format";
import type { PaymentRecordStatus } from "@/types/sale";

const STATUS_ORDER: PaymentRecordStatus[] = ["SUCCESS", "PENDING", "CREATED", "UNKNOWN", "FAILED", "REFUNDED"];

export function Reconciliation() {
  const { data, isPending, isError, error, refetch } = useReconciliation();

  const back = (
    <Link href="/payments" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-navy-900">
      <ArrowLeft className="h-4 w-4" aria-hidden /> Payments
    </Link>
  );

  if (isPending) {
    return (
      <>
        {back}
        <div data-testid="reconciliation-loading" aria-busy="true" className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        {back}
        <ErrorState title="Could not load reconciliation" message={error.message} onRetry={() => refetch()} />
      </>
    );
  }

  return (
    <>
      {back}
      <PageHeader
        title="Payment reconciliation"
        description={`Last ${data.windowDays} days · ${PROVIDER_MODE_LABELS[data.provider]}${data.simulated ? " (simulated)" : ""}`}
      />
      <div className="space-y-4">
        <PaymentModeCard />

        <section aria-label="Money collected" className="grid gap-4 sm:grid-cols-2">
          <Card className="space-y-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden /> Verified by Paytm
            </h2>
            <p data-testid="collected-verified" className="text-2xl font-semibold">
              {formatINR(data.collected.verified)}
            </p>
            <p className="text-xs text-muted">Real money Paytm confirmed to us.</p>
          </Card>
          <Card className="space-y-1 border-dashed border-warning/60 bg-warning-soft/40">
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
              <FlaskConical className="h-4 w-4 text-warning" aria-hidden /> Demo money (simulated) <SimulatedBadge />
            </h2>
            <p data-testid="collected-simulated" className="text-2xl font-semibold">
              {formatINR(data.collected.simulated)}
            </p>
            <p className="text-xs text-muted">Demo data only. It is not real money and is never counted as verified.</p>
          </Card>
        </section>

        <Card className="space-y-3">
          <h2 className="text-base font-semibold">Payments by status</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="rounded-xl bg-background px-3 py-2.5">
                <dt className="text-xs text-muted">{PAYMENT_STATUS_LABELS[status]}</dt>
                <dd className="text-lg font-semibold">{data.counts[status] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <section aria-labelledby="attention-heading" className="space-y-3">
          <h2 id="attention-heading" className="text-base font-semibold">
            Needs your attention
          </h2>
          {data.attention.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">Nothing needs your attention right now.</p>
          ) : (
            <ul aria-label="Payments needing attention" className="space-y-3">
              {data.attention.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} attention />
              ))}
            </ul>
          )}
        </section>

        {data.notes.length > 0 && (
          <aside aria-label="About these numbers" className="rounded-2xl border border-line bg-background p-4">
            <h2 className="mb-2 text-sm font-semibold">About these numbers</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {data.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </>
  );
}
