import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button, buttonStyles } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { SaleItemsList } from "./SaleItemsList";
import { SaleStatusBadge, VoiceBadge } from "./SaleBadges";
import { SaleTotalsList } from "./SaleTotalsList";
import type { Sale } from "@/types/sale";

/** Shows the server's saved Sale (never the client-side estimate). */
export function SaleConfirmation({ sale, onNewSale }: { sale: Sale; onNewSale: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card className="space-y-5">
        <div className="flex flex-col items-center text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </span>
          <h2 role="status" className="text-xl font-semibold">
            Sale recorded
          </h2>
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold text-foreground">{sale.saleNumber}</span> · {sale.customer?.name ?? "Walk-in customer"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <SaleStatusBadge status={sale.status} paymentStatus={sale.paymentStatus} />
            <VoiceBadge source={sale.source} />
          </div>
        </div>
        <SaleItemsList items={sale.items} />
        <SaleTotalsList sale={sale} />
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button className="min-h-14" onClick={onNewSale}>
          New sale
        </Button>
        <Link href={`/sales/${sale.id}`} className={buttonStyles("secondary", "min-h-14")}>
          View sale
        </Link>
      </div>
    </div>
  );
}
