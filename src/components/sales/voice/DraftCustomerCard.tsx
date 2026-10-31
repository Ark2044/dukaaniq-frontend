"use client";

import { useState, type Dispatch } from "react";
import { UserPlus, UserRound } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { CustomerPicker } from "@/components/common/pickers";
import type { PickerOption } from "@/components/common/SearchPicker";
import { CustomerForm } from "@/components/customers/CustomerForm";
import type { ReviewAction } from "@/lib/voice/review";
import type { DraftCustomer } from "@/types/ai";

interface DraftCustomerCardProps {
  spoken: DraftCustomer | null;
  customer: PickerOption | null;
  skipped: boolean;
  dispatch: Dispatch<ReviewAction>;
}

/** A spoken name is only ever a suggestion: the merchant picks, skips or creates, nothing is auto-selected. */
export function DraftCustomerCard({ spoken, customer, skipped, dispatch }: DraftCustomerCardProps) {
  const [creating, setCreating] = useState(false);
  const setCustomer = (next: PickerOption | null) => dispatch({ type: "setCustomer", customer: next });
  const unresolved = spoken !== null && spoken.status !== "MATCHED" && !customer && !skipped;

  return (
    <Card className="space-y-3 p-4">
      <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold">
        <UserRound className="h-5 w-5 text-muted" aria-hidden /> Who is buying?
        {spoken?.status === "MATCHED" && customer && <Badge tone="success">Matched</Badge>}
        {unresolved && spoken?.status === "AMBIGUOUS" && <Badge tone="warning">Choose customer</Badge>}
        {unresolved && spoken?.status === "NOT_FOUND" && <Badge tone="danger">Not found</Badge>}
        {!spoken && <span className="text-xs font-normal text-muted">Optional</span>}
      </h2>

      {spoken && spoken.status === "MATCHED" && customer && (
        <p className="text-sm text-muted">
          You said “{spoken.spokenName}”. Matched to <span className="font-semibold text-foreground">{customer.label}</span>.
        </p>
      )}

      {unresolved && spoken?.status === "AMBIGUOUS" && (
        <div role="group" aria-label={`Choose the customer for ${spoken.spokenName}`} className="space-y-2">
          <p className="text-sm text-muted">
            You said “{spoken.spokenName}”. More than one customer fits. Who do you mean?
          </p>
          {spoken.options.map((option) => (
            <button
              key={option.customerId}
              type="button"
              aria-label={`Use customer ${option.name}`}
              onClick={() => setCustomer({ id: option.customerId, label: option.name })}
              className="flex min-h-14 w-full items-center rounded-xl border border-line px-3 text-left text-sm font-semibold active:bg-background"
            >
              {option.name}
            </button>
          ))}
        </div>
      )}

      {unresolved && spoken?.status === "NOT_FOUND" && (
        <p className="text-sm text-muted">
          You said “{spoken.spokenName}”, but no customer with that name was found. Search again, add them as a new customer,
          or skip to sell to a walk-in.
        </p>
      )}

      {creating ? (
        <CustomerForm
          compact
          submitLabel="Save and select"
          onCancel={() => setCreating(false)}
          onCreated={(created) => {
            setCustomer({ id: created.id, label: created.name, description: created.phone ?? undefined });
            setCreating(false);
          }}
        />
      ) : (
        <>
          {!customer && !unresolved && (
            <p className="text-sm text-muted">
              {skipped ? "Selling to a walk-in customer." : "Walk-in customer. Select or add one to record credit."}
            </p>
          )}
          <CustomerPicker value={customer} onChange={setCustomer} label="Customer" />
          {!customer && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => setCreating(true)}>
                <UserPlus className="h-4 w-4" aria-hidden /> New customer
              </Button>
              {spoken && !skipped && (
                <Button variant="secondary" onClick={() => dispatch({ type: "skipCustomer" })}>
                  Skip — walk-in customer
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
