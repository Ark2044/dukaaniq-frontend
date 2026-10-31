"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ClipboardCheck, Wallet } from "lucide-react";
import { Button, buttonStyles } from "@/components/common/Button";
import { PageHeader } from "@/components/common/Card";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/common/States";
import { SelectField } from "@/components/forms/Fields";
import { PaymentModeCard } from "./PaymentModeCard";
import { PaymentRow } from "./PaymentRow";
import { usePaymentList } from "@/lib/hooks/usePayments";
import { PAYMENT_STATUS_OPTIONS } from "@/lib/payments/status";
import { cn } from "@/lib/utils/format";
import type { PaymentListParams } from "@/types/payment";
import type { PaymentRecordStatus } from "@/types/sale";

const PAGE_SIZE = 20;

type MoneyFilter = "all" | "real" | "demo";

const MONEY_OPTIONS: ReadonlyArray<{ value: MoneyFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "real", label: "Real & sandbox" },
  { value: "demo", label: "Demo (simulated) only" },
];

const STATUS_FILTER_OPTIONS = [{ value: "", label: "All statuses" }, ...PAYMENT_STATUS_OPTIONS];

const simulatedParam = (money: MoneyFilter) => (money === "all" ? undefined : money === "demo");

function ListSkeleton() {
  return (
    <div data-testid="payments-loading" aria-busy="true" className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function PaymentsList() {
  const [status, setStatus] = useState<PaymentRecordStatus | "">("");
  const [money, setMoney] = useState<MoneyFilter>("all");
  const [page, setPage] = useState(0);

  const params: PaymentListParams = { status: status || undefined, simulated: simulatedParam(money), page, size: PAGE_SIZE };
  const { data, isPending, isError, error, refetch, isPlaceholderData } = usePaymentList(params);
  const hasFilters = status !== "" || money !== "all";

  let content: ReactNode;
  if (isPending) content = <ListSkeleton />;
  else if (isError) content = <ErrorState title="Could not load payments" message={error.message} onRetry={() => refetch()} />;
  else if (data.items.length === 0) {
    content = (
      <EmptyState
        icon={Wallet}
        title={hasFilters ? "No payments match your filters" : "No Paytm payments yet"}
        description={
          hasFilters
            ? "Try a different status or clear the filters."
            : "Open a sale and choose “Collect via Paytm QR” to start one."
        }
        action={
          hasFilters ? (
            <Button
              variant="secondary"
              onClick={() => {
                setStatus("");
                setMoney("all");
                setPage(0);
              }}
            >
              Clear filters
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    content = (
      <div className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
        <ul aria-label="Payments" className="space-y-3">
          {data.items.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} />
          ))}
        </ul>
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          totalItems={data.totalItems}
          itemLabel={data.totalItems === 1 ? "payment" : "payments"}
          onPageChange={setPage}
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Payments"
        description="Paytm QR payments, newest first."
        actions={
          <Link href="/payments/reconciliation" className={buttonStyles("secondary", "min-h-12")}>
            <ClipboardCheck className="h-4 w-4" aria-hidden /> Reconciliation
          </Link>
        }
      />
      <div className="space-y-4">
        <PaymentModeCard />
        <form aria-label="Filter payments" onSubmit={(e) => e.preventDefault()} className="space-y-3">
          <SelectField
            label="Status"
            options={STATUS_FILTER_OPTIONS}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PaymentRecordStatus | "");
              setPage(0);
            }}
          />
          <div role="group" aria-label="Type of money" className="flex gap-1 overflow-x-auto rounded-xl bg-background p-1">
            {MONEY_OPTIONS.map((option) => {
              const active = money === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setMoney(option.value);
                    setPage(0);
                  }}
                  className={cn(
                    "flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-lg px-3 text-sm font-medium",
                    active ? "bg-surface text-navy-900 shadow-sm" : "text-muted hover:text-navy-900",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </form>
        {content}
      </div>
    </>
  );
}
