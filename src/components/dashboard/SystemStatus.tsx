"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, Mic, Server } from "lucide-react";
import { Card } from "@/components/common/Card";
import { Badge, SimulatedBadge } from "@/components/common/Badge";
import { ErrorState, Skeleton } from "@/components/common/States";
import { getSystemInfo } from "@/lib/api/system";

const PAYMENT_LABELS = {
  MOCK: "Mock provider",
  PAYTM_SANDBOX: "Paytm sandbox",
  PAYTM_PRODUCTION: "Paytm production",
} as const;

export function SystemStatus() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["system-info"],
    queryFn: ({ signal }) => getSystemInfo(signal),
  });

  if (isPending) {
    return (
      <div data-testid="system-status-loading" className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-32" />
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState title="Backend unavailable" message={error.message} onRetry={() => refetch()} />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Server className="h-4 w-4" aria-hidden /> Backend
        </div>
        <p className="mt-2 text-lg font-semibold">Connected</p>
        <p className="text-xs text-muted">
          v{data.version} · {data.environment}
        </p>
      </Card>
      <Card>
        <div className="flex items-center gap-2 text-sm text-muted">
          <CreditCard className="h-4 w-4" aria-hidden /> Payments
        </div>
        <p className="mt-2 text-lg font-semibold">{PAYMENT_LABELS[data.payments.provider]}</p>
        <div className="mt-1">
          {data.payments.simulated ? <SimulatedBadge /> : <Badge tone="success">Live integration</Badge>}
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Mic className="h-4 w-4" aria-hidden /> Sarvam AI
        </div>
        <p className="mt-2 text-lg font-semibold">
          {data.ai.sarvamConfigured ? "Configured" : "Not configured"}
        </p>
        <div className="mt-1">
          {data.ai.sarvamConfigured ? (
            <Badge tone="success">Ready</Badge>
          ) : (
            <Badge tone="warning">Voice &amp; AI disabled</Badge>
          )}
        </div>
      </Card>
    </div>
  );
}
