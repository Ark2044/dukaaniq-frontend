import Link from "next/link";
import { CheckCircle2, ScanLine } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button, buttonStyles } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import type { BillConfirmLineResult, BillConfirmResult, BillOutcomeStatus } from "@/types/billScan";

const OUTCOME: Record<BillOutcomeStatus, { label: string; tone: "success" | "neutral" | "danger" }> = {
  CREATED: { label: "Created", tone: "success" },
  RESTOCKED: { label: "Restocked", tone: "success" },
  SKIPPED: { label: "Skipped", tone: "neutral" },
  FAILED: { label: "Failed", tone: "danger" },
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-background px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-2xl font-semibold">{value}</dd>
    </div>
  );
}

function OutcomeRow({ line }: { line: BillConfirmLineResult }) {
  const outcome = OUTCOME[line.status];
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          <span className="text-muted">Line {line.index + 1}</span> · {line.name || "(no name)"}
        </p>
        {line.error && <p className="mt-1 text-xs text-danger">{line.error}</p>}
      </div>
      <Badge tone={outcome.tone}>{outcome.label}</Badge>
    </li>
  );
}

/** `result` is null when the backend reported the scan was already applied (DUPLICATE_REQUEST). */
export function ConfirmResult({ result, onScanAnother }: { result: BillConfirmResult | null; onScanAnother: () => void }) {
  return (
    <Card className="space-y-5">
      <div role="status" className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold">{result ? "Bill applied to your inventory" : "Already applied"}</h2>
          <p className="mt-1 text-sm text-muted">
            {result
              ? result.failed > 0
                ? "Most lines were applied. Some could not be, see below."
                : "Your products and stock levels are up to date."
              : "This bill was already added to your inventory, so nothing was changed again."}
          </p>
        </div>
      </div>

      {result && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Created" value={result.created} />
            <Stat label="Restocked" value={result.restocked} />
            <Stat label="Skipped" value={result.skipped} />
            <Stat label="Failed" value={result.failed} />
          </dl>
          <ul aria-label="Line results" className="divide-y divide-line">
            {result.lines.map((line) => (
              <OutcomeRow key={line.index} line={line} />
            ))}
          </ul>
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/inventory" className={buttonStyles("primary")}>
          View inventory
        </Link>
        <Button variant="secondary" onClick={onScanAnother}>
          <ScanLine className="h-4 w-4" aria-hidden /> Scan another bill
        </Button>
      </div>
    </Card>
  );
}
