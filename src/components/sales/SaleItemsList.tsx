import { UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { formatINR, formatQuantity } from "@/lib/utils/format";
import type { SaleItem } from "@/types/sale";

/** Line items at their historical (sale-time) prices, with returned quantities when any. */
export function SaleItemsList({ items }: { items: SaleItem[] }) {
  return (
    <ul aria-label="Items" className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{item.name}</p>
            <p className="text-xs text-muted">
              {formatQuantity(item.quantity)} {UNIT_SHORT_LABELS[item.unit]} × {formatINR(item.unitPrice)}
              {item.returnedQuantity > 0 && (
                <span className="ml-2 font-medium text-warning">
                  Returned {formatQuantity(item.returnedQuantity)} {UNIT_SHORT_LABELS[item.unit]}
                </span>
              )}
            </p>
          </div>
          <p className="text-sm font-semibold">{formatINR(item.lineTotal)}</p>
        </li>
      ))}
    </ul>
  );
}
