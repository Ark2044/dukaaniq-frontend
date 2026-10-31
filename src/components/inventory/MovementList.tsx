import { MOVEMENT_REASON_LABELS, MOVEMENT_TYPE_OPTIONS, UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { formatDateTime, formatQuantity } from "@/lib/utils/format";
import type { StockMovement } from "@/types/inventory";

const TYPE_LABELS: Record<string, string> = Object.fromEntries(MOVEMENT_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export const reasonLabel = (m: Pick<StockMovement, "reason" | "type">) =>
  (m.reason && MOVEMENT_REASON_LABELS[m.reason]) || m.reason || TYPE_LABELS[m.type] || m.type;

const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatQuantity(Math.abs(value))}`;

function Change({ movement }: { movement: StockMovement }) {
  const tone = movement.quantityChange > 0 ? "text-success" : movement.quantityChange < 0 ? "text-danger" : "";
  return (
    <span className={`font-semibold ${tone}`}>
      {signed(movement.quantityChange)} {UNIT_SHORT_LABELS[movement.unit]}
    </span>
  );
}

/** Newest first. Cards on phones, a table on wider screens. */
export function MovementList({ movements }: { movements: StockMovement[] }) {
  return (
    <>
      <ul aria-label="Stock movements" className="space-y-3 md:hidden">
        {movements.map((m) => (
          <li key={m.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate text-base font-semibold">{m.productName}</p>
              <Change movement={m} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {reasonLabel(m)} · Balance {formatQuantity(m.balanceAfter)} {UNIT_SHORT_LABELS[m.unit]}
            </p>
            {m.note && <p className="mt-1 text-sm">{m.note}</p>}
            <p className="mt-1 text-xs text-muted">{formatDateTime(m.createdAt)}</p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Stock movements</caption>
          <thead className="border-b border-line bg-background text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Date</th>
              <th scope="col" className="px-4 py-3 font-semibold">Product</th>
              <th scope="col" className="px-4 py-3 font-semibold">Reason</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Change</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Balance</th>
              <th scope="col" className="px-4 py-3 font-semibold">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {movements.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 text-muted">{formatDateTime(m.createdAt)}</td>
                <td className="px-4 py-3 font-medium">{m.productName}</td>
                <td className="px-4 py-3">{reasonLabel(m)}</td>
                <td className="px-4 py-3 text-right">
                  <Change movement={m} />
                </td>
                <td className="px-4 py-3 text-right">
                  {formatQuantity(m.balanceAfter)} {UNIT_SHORT_LABELS[m.unit]}
                </td>
                <td className="px-4 py-3 text-muted">{m.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
