import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/common/Card";
import type { BillScanResult } from "@/types/billScan";

export function BillHeader({ result }: { result: BillScanResult }) {
  const details = [
    { label: "Supplier", value: result.supplierName },
    { label: "Invoice no.", value: result.invoiceNumber },
    { label: "Invoice date", value: result.invoiceDate },
  ];
  const warnings = result.warnings ?? [];
  return (
    <Card className="space-y-4">
      <dl className="grid gap-4 sm:grid-cols-3">
        {details.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
            <dd className="mt-0.5 text-base font-semibold">{value || "Not found on bill"}</dd>
          </div>
        ))}
      </dl>
      {warnings.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm text-warning">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Please double-check
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
