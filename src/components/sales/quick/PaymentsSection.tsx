"use client";

import type { Dispatch } from "react";
import { AlertTriangle, Banknote, Plus, QrCode, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { PAYMENT_METHOD_OPTIONS, UPI_EXPLANATION } from "@/lib/constants/options";
import type { CartTotals } from "@/lib/sales/cart";
import type { QuickSaleAction, QuickSaleState } from "@/lib/sales/quickSaleState";
import { roundMoney } from "@/lib/utils/money";
import { cn, formatINR } from "@/lib/utils/format";
import type { PaymentMethod } from "@/types/sale";

interface PaymentsSectionProps {
  state: QuickSaleState;
  totals: CartTotals;
  dispatch: Dispatch<QuickSaleAction>;
}

const newRow = (method: PaymentMethod, amount: number) => ({
  id: crypto.randomUUID(),
  method,
  amount: amount > 0 ? String(amount) : "",
});

/** The credit / unpaid consequence of the remaining due, stated plainly before the merchant submits. */
function DueNotice({ state, due, dispatch }: PaymentsSectionProps & { due: number }) {
  if (due <= 0) return null;
  if (state.customer) {
    return (
      <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
        {formatINR(due)} will be added to {state.customer.label}&apos;s credit.
      </p>
    );
  }
  return (
    <div role="alert" className="space-y-3 rounded-xl border border-warning bg-warning-soft px-4 py-3 text-warning">
      <p className="flex items-start gap-2 text-sm font-semibold">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        No customer selected — {formatINR(due)} will be recorded as unpaid.
      </p>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={state.confirmedUnpaid === due}
          onChange={(e) =>
            dispatch({
              type: "confirmUnpaid",
              due: e.target.checked ? due : null,
            })
          }
          className="h-5 w-5 shrink-0 accent-navy-900"
        />
        Yes, record {formatINR(due)} as unpaid
      </label>
    </div>
  );
}

const CHANNELS = [
  { value: false, label: "Record payment now", icon: Banknote },
  { value: true, label: "Paytm QR", icon: QrCode },
] as const;

/** Cash/UPI/credit are recorded immediately; Paytm QR leaves the sale waiting until the customer pays. */
function PaymentChannelChoice({ state, dispatch }: Pick<PaymentsSectionProps, "state" | "dispatch">) {
  return (
    <div role="radiogroup" aria-label="How will the customer pay?" className="grid grid-cols-2 gap-2">
      {CHANNELS.map(({ value, label, icon: Icon }) => {
        const checked = state.collectViaPaytm === value;
        return (
          <label
            key={label}
            className={cn(
              "flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-center text-sm font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy-700",
              checked ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-surface",
            )}
          >
            <input
              type="radio"
              name="quick-sale-channel"
              checked={checked}
              onChange={() => dispatch({ type: "setCollectViaPaytm", value })}
              className="sr-only"
            />
            <Icon className="h-4 w-4 shrink-0" aria-hidden /> {label}
          </label>
        );
      })}
    </div>
  );
}

export function PaymentsSection({ state, totals, dispatch }: PaymentsSectionProps) {
  const { payments, collectViaPaytm } = state;
  const hasTotal = totals.total > 0;

  return (
    <Card className="space-y-4 p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Banknote className="h-5 w-5 text-muted" aria-hidden /> Payment
      </h2>

      <PaymentChannelChoice state={state} dispatch={dispatch} />
      {collectViaPaytm && (
        <p role="note" className="rounded-xl bg-background px-4 py-3 text-sm">
          The customer scans a Paytm QR on the next screen. The sale is only completed once Paytm confirms the payment. If it is not paid in
          time, the sale is cancelled and the stock is put back. Cash, UPI and credit amounts are turned off for this sale.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          disabled={!hasTotal || collectViaPaytm}
          onClick={() =>
            dispatch({
              type: "setPayments",
              payments: [newRow("CASH", totals.total)],
            })
          }
        >
          Full amount in cash
        </Button>
        <Button
          variant="secondary"
          disabled={!hasTotal || collectViaPaytm}
          onClick={() =>
            dispatch({
              type: "setPayments",
              payments: [newRow("UPI", totals.total)],
            })
          }
        >
          <QrCode className="h-4 w-4" aria-hidden /> Full amount by UPI
        </Button>
      </div>
      <p className="text-xs text-muted">UPI: {UPI_EXPLANATION}</p>

      {payments.length > 0 && (
        <ul className="space-y-3">
          {payments.map((payment, index) => (
            <li key={payment.id} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor={`pay-method-${payment.id}`} className="mb-1 block text-xs font-medium text-muted">
                  Method {index + 1}
                </label>
                <select
                  id={`pay-method-${payment.id}`}
                  value={payment.method}
                  onChange={(e) =>
                    dispatch({
                      type: "setPaymentMethod",
                      id: payment.id,
                      method: e.target.value as PaymentMethod,
                    })
                  }
                  className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base"
                >
                  {PAYMENT_METHOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28 shrink-0">
                <label htmlFor={`pay-amount-${payment.id}`} className="mb-1 block text-xs font-medium text-muted">
                  Amount (₹)
                </label>
                <input
                  id={`pay-amount-${payment.id}`}
                  inputMode="decimal"
                  value={payment.amount}
                  onChange={(e) =>
                    dispatch({
                      type: "setPaymentAmount",
                      id: payment.id,
                      value: e.target.value,
                    })
                  }
                  className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base"
                />
              </div>
              <button
                type="button"
                aria-label={`Remove payment ${index + 1}`}
                onClick={() => dispatch({ type: "removePayment", id: payment.id })}
                className="flex h-12 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:text-danger"
              >
                <Trash2 className="h-5 w-5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="ghost"
        className="w-full border border-dashed border-line"
        disabled={!hasTotal || collectViaPaytm}
        onClick={() =>
          dispatch({
            type: "setPayments",
            payments: [...payments, newRow("CASH", totals.due)],
          })
        }
      >
        <Plus className="h-4 w-4" aria-hidden /> Add payment
      </Button>

      {collectViaPaytm ? (
        <dl className="space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">To collect by Paytm QR</dt>
            <dd className="font-semibold">{formatINR(totals.total)}</dd>
          </div>
        </dl>
      ) : (
        <>
          <dl className="space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Paid now</dt>
              <dd className="font-semibold">{formatINR(totals.paid)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Remaining due</dt>
              <dd className={totals.due > 0 ? "font-semibold text-warning" : "font-semibold"}>{formatINR(roundMoney(totals.due))}</dd>
            </div>
          </dl>
          <DueNotice state={state} totals={totals} dispatch={dispatch} due={totals.due} />
        </>
      )}
    </Card>
  );
}
