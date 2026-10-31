"use client";

import { useId } from "react";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";
import { UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { allowsDecimals, exceedsStock, isPriceOverridden, lineProblem, lineTotal, stepFor, type CartLine } from "@/lib/sales/cart";
import { cn, formatINR, formatQuantity } from "@/lib/utils/format";

interface CartLineRowProps {
  line: CartLine;
  serverError?: string;
  onStep: (direction: 1 | -1) => void;
  onQuantity: (value: string) => void;
  onPrice: (value: string) => void;
  onRemove: () => void;
}

const STEP_BUTTON = "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface active:bg-background disabled:opacity-40";

export function CartLineRow({ line, serverError, onStep, onQuantity, onPrice, onRemove }: CartLineRowProps) {
  const id = useId();
  const problem = lineProblem(line);
  const overridden = isPriceOverridden(line);
  const lowStock = exceedsStock(line);
  const unit = UNIT_SHORT_LABELS[line.unit];

  return (
    <li className={cn("rounded-2xl border bg-surface p-4", serverError ? "border-danger" : "border-line")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{line.name}</p>
          <p className="text-xs text-muted">
            {[line.brand, `Catalogue ${formatINR(line.catalogPrice)}/${unit}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${line.name}`}
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-background hover:text-danger"
        >
          <Trash2 className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3">
        <div>
          <label htmlFor={`${id}-qty`} className="mb-1 block text-xs font-medium text-muted">
            Quantity ({unit})
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={STEP_BUTTON}
              aria-label={`Decrease ${line.name} quantity`}
              onClick={() => onStep(-1)}
              disabled={Number(line.quantity) <= stepFor(line.unit)}
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <input
              id={`${id}-qty`}
              aria-label={`${line.name} quantity`}
              inputMode={allowsDecimals(line.unit) ? "decimal" : "numeric"}
              value={line.quantity}
              onChange={(e) => onQuantity(e.target.value)}
              aria-invalid={problem ? true : undefined}
              className="h-12 w-20 rounded-xl border border-line bg-surface text-center text-base font-semibold"
            />
            <button type="button" className={STEP_BUTTON} aria-label={`Increase ${line.name} quantity`} onClick={() => onStep(1)}>
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor={`${id}-price`} className="mb-1 block text-xs font-medium text-muted">
            Price (₹ per {unit})
          </label>
          <input
            id={`${id}-price`}
            aria-label={`${line.name} price`}
            inputMode="decimal"
            value={line.unitPrice}
            onChange={(e) => onPrice(e.target.value)}
            className={cn("h-12 w-28 rounded-xl border bg-surface px-3 text-base", overridden ? "border-warning" : "border-line")}
          />
        </div>

        <p className="ml-auto text-right text-base font-semibold">{formatINR(lineTotal(line))}</p>
      </div>

      {overridden && <p className="mt-2 text-xs font-medium text-warning">Price changed for this sale</p>}
      {problem && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">
          {problem}
        </p>
      )}
      {lowStock && !serverError && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Only {formatQuantity(line.stock)} {unit} in stock. The shop may not be able to complete this sale.
        </p>
      )}
      {serverError && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-danger">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {serverError}
        </p>
      )}
    </li>
  );
}
