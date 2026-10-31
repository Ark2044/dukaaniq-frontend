"use client";

import { useMemo, useReducer, useState } from "react";
import { RotateCcw, ShoppingCart } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { FormAlert } from "@/components/forms/FormAlert";
import { PaytmCheckout } from "@/components/payments/SaleAwaitingPayment";
import { SaleConfirmation } from "../SaleConfirmation";
import { CartLineRow } from "./CartLineRow";
import { CustomerSection } from "./CustomerSection";
import { PaymentsSection } from "./PaymentsSection";
import { ProductSearch } from "./ProductSearch";
import { TotalsSection } from "./TotalsSection";
import { useCreateSale } from "@/lib/hooks/useSales";
import { buildSaleInput, cartTotals, saleProblems } from "@/lib/sales/cart";
import { mapSaleError } from "@/lib/sales/errors";
import { initialQuickSale, quickSaleReducer } from "@/lib/sales/quickSaleState";
import { formatINR } from "@/lib/utils/format";
import type { Sale } from "@/types/sale";

export function QuickSale() {
  const [state, dispatch] = useReducer(quickSaleReducer, undefined, () => initialQuickSale(crypto.randomUUID()));
  const [completed, setCompleted] = useState<Sale | null>(null);
  // A Paytm QR sale that was created and now waits for the customer to pay.
  const [awaiting, setAwaiting] = useState<Sale | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const createSale = useCreateSale();

  const totals = useMemo(() => cartTotals(state.lines, state.discount, state.payments), [state.lines, state.discount, state.payments]);
  const problems = useMemo(
    () => saleProblems(state.lines, totals, state.discount, state.payments),
    [state.lines, totals, state.discount, state.payments],
  );
  const inCart = useMemo(() => new Set(state.lines.map((l) => l.productId)), [state.lines]);

  const needsUnpaidConfirmation = !state.collectViaPaytm && totals.due > 0 && state.customer === null;
  const unpaidConfirmed = !needsUnpaidConfirmation || state.confirmedUnpaid === totals.due;
  const blocked = problems.length > 0 || !unpaidConfirmed;

  const submit = async () => {
    if (blocked || createSale.isPending) return;
    setFormError(null);
    try {
      const sale = await createSale.mutateAsync(
        buildSaleInput({
          clientRequestId: state.clientRequestId,
          lines: state.lines,
          customerId: state.customer?.id ?? null,
          discountText: state.discount,
          payments: state.payments,
          collectViaPaytm: state.collectViaPaytm,
        }),
      );
      if (state.collectViaPaytm) {
        // The cart stays until the server settles the sale, so "Start again" can bring it back.
        setAwaiting(sale);
        return;
      }
      setCompleted(sale);
      dispatch({ type: "reset", clientRequestId: crypto.randomUUID() });
    } catch (error) {
      const mapped = mapSaleError(error, state.lines);
      dispatch({ type: "setLineErrors", errors: mapped.lineErrors });
      setFormError(mapped.message);
    }
  };

  if (awaiting) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PaytmCheckout
          sale={awaiting}
          onPaid={() => dispatch({ type: "reset", clientRequestId: crypto.randomUUID() })}
          onNewSale={() => setAwaiting(null)}
          onStartAgain={() => {
            dispatch({ type: "renewRequest", clientRequestId: crypto.randomUUID() });
            setAwaiting(null);
          }}
        />
      </div>
    );
  }

  if (completed) {
    return <SaleConfirmation sale={completed} onNewSale={() => setCompleted(null)} />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:items-start">
      <div className="space-y-4">
        <ProductSearch onAdd={(product) => dispatch({ type: "addProduct", product })} inCart={inCart} />

        <section aria-labelledby="cart-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="cart-heading" className="flex items-center gap-2 text-base font-semibold">
              <ShoppingCart className="h-5 w-5 text-muted" aria-hidden /> Cart
              {state.lines.length > 0 && <span className="text-sm font-normal text-muted">({state.lines.length})</span>}
            </h2>
            {state.lines.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "reset", clientRequestId: crypto.randomUUID() });
                  setFormError(null);
                }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:text-navy-900"
              >
                <RotateCcw className="h-4 w-4" aria-hidden /> Clear cart
              </button>
            )}
          </div>
          {state.lines.length === 0 ? (
            <Card className="py-8 text-center text-sm text-muted">Your cart is empty. Search above and tap a product to add it.</Card>
          ) : (
            <ul className="space-y-3">
              {state.lines.map((line) => (
                <CartLineRow
                  key={line.productId}
                  line={line}
                  serverError={state.lineErrors[line.productId]}
                  onStep={(direction) => dispatch({ type: "step", productId: line.productId, direction })}
                  onQuantity={(value) => dispatch({ type: "setQuantity", productId: line.productId, value })}
                  onPrice={(value) => dispatch({ type: "setPrice", productId: line.productId, value })}
                  onRemove={() => dispatch({ type: "removeLine", productId: line.productId })}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <CustomerSection customer={state.customer} onChange={(customer) => dispatch({ type: "setCustomer", customer })} />
        <TotalsSection totals={totals} discount={state.discount} dispatch={dispatch} />
        <PaymentsSection state={state} totals={totals} dispatch={dispatch} />

        <FormAlert message={formError} />
        {problems.length > 0 && state.lines.length > 0 && (
          <ul className="space-y-1 text-sm text-danger" aria-label="Fix before saving">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
        {needsUnpaidConfirmation && !unpaidConfirmed && problems.length === 0 && (
          <p className="text-sm text-warning">Confirm the unpaid amount above to save this sale.</p>
        )}
        <Button className="min-h-14 w-full text-base" onClick={submit} loading={createSale.isPending} disabled={blocked}>
          {createSale.isPending
            ? "Saving sale…"
            : state.collectViaPaytm
              ? `Confirm and show QR · ${formatINR(totals.total)}`
              : `Save sale · ${formatINR(totals.total)}`}
        </Button>
      </div>
    </div>
  );
}
