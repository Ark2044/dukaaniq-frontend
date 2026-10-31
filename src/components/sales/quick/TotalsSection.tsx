"use client";

import { useState, type Dispatch } from "react";
import { Percent } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { percentToAmount, type CartTotals } from "@/lib/sales/cart";
import type { QuickSaleAction } from "@/lib/sales/quickSaleState";
import { formatINR } from "@/lib/utils/format";

interface TotalsSectionProps {
  totals: CartTotals;
  discount: string;
  dispatch: Dispatch<QuickSaleAction>;
}

const INPUT = "min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base";

/** Discount entry (₹, with a % helper that converts to ₹) and the display-only totals. */
export function TotalsSection({ totals, discount, dispatch }: TotalsSectionProps) {
  const [percent, setPercent] = useState("");
  const percentAmount = percentToAmount(totals.subtotal, percent);

  return (
    <Card className="space-y-4 p-4">
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <div>
          <label htmlFor="sale-discount" className="mb-1 block text-sm font-medium">
            Discount (₹)
          </label>
          <input
            id="sale-discount"
            inputMode="decimal"
            placeholder="0"
            value={discount}
            onChange={(e) => dispatch({ type: "setDiscount", value: e.target.value })}
            className={INPUT}
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="w-20">
            <label htmlFor="sale-discount-percent" className="mb-1 block text-sm font-medium">
              <Percent className="mr-1 inline h-3.5 w-3.5" aria-hidden />%
            </label>
            <input
              id="sale-discount-percent"
              inputMode="decimal"
              placeholder="10"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className={INPUT}
            />
          </div>
          <Button
            variant="secondary"
            disabled={percentAmount === null}
            onClick={() => {
              if (percentAmount === null) return;
              dispatch({ type: "setDiscount", value: String(percentAmount) });
              setPercent("");
            }}
          >
            Apply
          </Button>
        </div>
      </div>

      <dl aria-label="Sale totals" className="space-y-1.5 border-t border-line pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>{formatINR(totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Discount</dt>
          <dd>{totals.discount > 0 ? `− ${formatINR(totals.discount)}` : formatINR(0)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-2">
          <dt className="text-base font-semibold">Total</dt>
          <dd className="text-2xl font-bold" data-testid="sale-total">
            {formatINR(totals.total)}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted">Totals are for guidance. The final amounts are confirmed when the sale is saved.</p>
    </Card>
  );
}
