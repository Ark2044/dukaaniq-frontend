"use client";

import { useState } from "react";
import { UserPlus, UserRound } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { CustomerPicker } from "@/components/common/pickers";
import type { PickerOption } from "@/components/common/SearchPicker";
import { CustomerForm } from "@/components/customers/CustomerForm";

interface CustomerSectionProps {
  customer: PickerOption | null;
  onChange: (customer: PickerOption | null) => void;
}

/** Walk-in by default; a customer is only needed to put an unpaid balance on credit. */
export function CustomerSection({ customer, onChange }: CustomerSectionProps) {
  const [creating, setCreating] = useState(false);

  return (
    <Card className="space-y-3 p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <UserRound className="h-5 w-5 text-muted" aria-hidden /> Who is buying?
        <span className="text-xs font-normal text-muted">Optional</span>
      </h2>
      {creating ? (
        <CustomerForm
          compact
          submitLabel="Save and select"
          onCancel={() => setCreating(false)}
          onCreated={(created) => {
            onChange({ id: created.id, label: created.name, description: created.phone ?? undefined });
            setCreating(false);
          }}
        />
      ) : (
        <>
          {!customer && <p className="text-sm text-muted">Walk-in customer. Select or add one to record credit.</p>}
          <CustomerPicker value={customer} onChange={onChange} label="Customer" />
          {!customer && (
            <Button variant="secondary" className="w-full" onClick={() => setCreating(true)}>
              <UserPlus className="h-4 w-4" aria-hidden /> New customer
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
