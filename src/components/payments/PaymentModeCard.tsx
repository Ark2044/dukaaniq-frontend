"use client";

import { Card } from "@/components/common/Card";
import { Skeleton } from "@/components/common/States";
import { usePaymentConfig } from "@/lib/hooks/usePayments";
import { PROVIDER_MODE_DESCRIPTIONS, PROVIDER_MODE_LABELS } from "@/lib/payments/status";

/** Which payment provider is active, so demo and real money are never confused. */
export function PaymentModeCard() {
  const { data: config, isPending, isError } = usePaymentConfig();

  return (
    <Card className="space-y-2">
      <h2 className="text-base font-semibold">Payment mode</h2>
      {isPending && <Skeleton className="h-10 w-2/3" />}
      {isError && <p className="text-sm text-muted">Could not load the payment mode.</p>}
      {config && (
        <>
          <p className="text-lg font-semibold">{PROVIDER_MODE_LABELS[config.provider]}</p>
          <p className="text-sm text-muted">{PROVIDER_MODE_DESCRIPTIONS[config.provider]}</p>
          {!config.configured && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              Paytm credentials are missing, so QR payments cannot be created until they are set up.
            </p>
          )}
          {config.provider !== "MOCK" && (
            <p className="text-xs text-muted">
              Paytm notifications (webhook): {config.webhookActive ? "active" : "not active"}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
