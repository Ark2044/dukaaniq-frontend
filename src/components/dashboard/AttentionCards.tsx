import Link from "next/link";
import { ChevronRight, HandCoins, PackageMinus, Users } from "lucide-react";
import { Card } from "@/components/common/Card";
import { formatINR } from "@/lib/utils/format";
import type { AnalyticsSummary } from "@/types/analytics";

function LinkCard({ href, children, label }: { href: string; children: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-surface p-4 active:bg-background"
    >
      {children}
      <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

export function CreditGivenCard({ amount }: { amount: number }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-soft text-warning">
        <HandCoins className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-xs text-muted">Credit given today</p>
        <p className="text-xl font-bold">{formatINR(amount)}</p>
      </div>
    </Card>
  );
}

export function OutstandingCreditCard({ credit }: { credit: AnalyticsSummary["outstandingCredit"] }) {
  return (
    <Card className="flex min-h-20 items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-soft text-warning">
        <Users className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-xs text-muted">Outstanding credit</p>
        <p className="text-xl font-bold text-warning">{formatINR(credit.total)}</p>
        <p className="text-xs text-muted">
          {credit.customersWithBalance} {credit.customersWithBalance === 1 ? "customer owes" : "customers owe"} you
        </p>
      </div>
    </Card>
  );
}

export function LowStockCard({ count }: { count: number }) {
  return (
    <LinkCard href="/inventory/overview" label="Low stock, open stock overview">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-soft text-warning">
        <PackageMinus className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-xs text-muted">Low stock</p>
        <p className="text-xl font-bold">{count}</p>
        <p className="text-xs text-muted">{count === 1 ? "product needs" : "products need"} restocking</p>
      </div>
    </LinkCard>
  );
}
