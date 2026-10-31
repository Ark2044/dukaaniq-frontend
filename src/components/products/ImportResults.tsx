import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { ImportResult, ImportRowStatus } from "@/types/product";

const STATUS: Record<ImportRowStatus, { label: string; tone: "success" | "neutral" | "danger" }> = {
  IMPORTED: { label: "Imported", tone: "success" },
  VALID: { label: "Valid", tone: "success" },
  SKIPPED: { label: "Skipped", tone: "danger" },
};

export function ImportResults({ result }: { result: ImportResult }) {
  return (
    <div aria-live="polite">
      <Card>
        <h2 className="text-lg font-semibold">{result.dryRun ? "Preview (nothing was saved)" : "Import complete"}</h2>
        <p className="mt-1 text-sm text-muted">
          {result.totalRows} {result.totalRows === 1 ? "row" : "rows"} ·{" "}
          {result.dryRun ? `${result.importedCount} ready to import` : `${result.importedCount} imported`} ·{" "}
          {result.skippedCount} skipped
        </p>
        <ul className="mt-4 divide-y divide-line" aria-label="Row results">
          {result.rows.map((row) => {
            const status = STATUS[row.status];
            return (
              <li key={row.row} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <span className="text-muted">Row {row.row}</span> · {row.name || "(no name)"}
                  </p>
                  {row.errors.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-xs text-danger">
                      {row.errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <Badge tone={status.tone}>{status.label}</Badge>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
