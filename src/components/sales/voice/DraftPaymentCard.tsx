"use client";

import type { Dispatch } from "react";
import { Banknote, BookUser, QrCode, ScanQrCode } from "lucide-react";
import { Card } from "@/components/common/Card";
import { UPI_EXPLANATION } from "@/lib/constants/options";
import type { ReviewAction } from "@/lib/voice/review";
import { cn, formatINR } from "@/lib/utils/format";
import type { PaymentChoice } from "@/lib/voice/review";
import type { PaymentHint } from "@/types/ai";

const CHOICES: ReadonlyArray<{ value: PaymentChoice; label: string; icon: typeof Banknote }> = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "UPI", label: "UPI", icon: QrCode },
  { value: "CREDIT", label: "Credit (udhaar)", icon: BookUser },
  { value: "PAYTM_QR", label: "Paytm QR", icon: ScanQrCode },
];

interface DraftPaymentCardProps {
  payment: PaymentChoice | null;
  hint: PaymentHint | null;
  total: number;
  customerName: string | null;
  dispatch: Dispatch<ReviewAction>;
}

export function DraftPaymentCard({ payment, hint, total, customerName, dispatch }: DraftPaymentCardProps) {
  return (
    <Card className="space-y-3 p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Banknote className="h-5 w-5 text-muted" aria-hidden /> How is the customer paying?
      </h2>
      <p className="text-xs text-muted">
        {hint
          ? `We heard “${hint === "CREDIT" ? "credit" : hint.toLowerCase()}”. Change it if that is not right.`
          : "Nothing was said about payment. Choose one."}
      </p>
      <div role="radiogroup" aria-label="Payment" className="grid gap-2 sm:grid-cols-2">
        {CHOICES.map(({ value, label, icon: Icon }) => {
          const checked = payment === value;
          return (
            <label
              key={value}
              className={cn(
                "flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy-700",
                checked ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-surface",
              )}
            >
              <input
                type="radio"
                name="voice-payment"
                value={value}
                checked={checked}
                onChange={() => dispatch({ type: "setPayment", payment: value })}
                className="sr-only"
              />
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </label>
          );
        })}
      </div>
      {payment === "CREDIT" ? (
        <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          {customerName
            ? `${formatINR(total)} will be added to ${customerName}’s credit. Nothing is recorded as paid now.`
            : "Credit needs a customer. Choose or add one above."}
        </p>
      ) : payment === "PAYTM_QR" ? (
        <p role="note" className="rounded-xl bg-background px-4 py-3 text-sm">
          The customer scans a Paytm QR for {formatINR(total)} on the next screen. The sale is only completed once Paytm confirms the payment;
          if it is not paid in time it is cancelled and the stock is put back. No cash, UPI or credit is recorded.
        </p>
      ) : payment === "UPI" ? (
        <p className="text-xs text-muted">{UPI_EXPLANATION} The full {formatINR(total)} is recorded as paid.</p>
      ) : payment === "CASH" ? (
        <p className="text-xs text-muted">The full {formatINR(total)} is recorded as paid in cash.</p>
      ) : null}
    </Card>
  );
}
