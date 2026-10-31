"use client";

import { Search } from "lucide-react";
import { CustomerPicker } from "@/components/common/pickers";
import type { PickerOption } from "@/components/common/SearchPicker";
import { SelectField, TextField, CONTROL_CLASSES } from "@/components/forms/Fields";
import { cn } from "@/lib/utils/format";
import type { PaymentStatus, SaleStatus } from "@/types/sale";

export interface SaleFilterState {
  q: string;
  from: string;
  to: string;
  status: SaleStatus | "";
  paymentStatus: PaymentStatus | "";
  customer: PickerOption | null;
}

export const DEFAULT_SALE_FILTERS: SaleFilterState = { q: "", from: "", to: "", status: "", paymentStatus: "", customer: null };

const STATUS_OPTIONS = [
  { value: "", label: "All sales" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PENDING_PAYMENT", label: "Awaiting payment" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Any payment" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "UNPAID", label: "Unpaid" },
];

export function SaleFilters({ value, onChange }: { value: SaleFilterState; onChange: (next: SaleFilterState) => void }) {
  const set = (patch: Partial<SaleFilterState>) => onChange({ ...value, ...patch });
  return (
    <form role="search" aria-label="Filter sales" onSubmit={(e) => e.preventDefault()} className="mb-4 space-y-3">
      <div className="relative">
        <label htmlFor="sale-search" className="sr-only">
          Search by sale number
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id="sale-search"
          type="search"
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search by sale number, e.g. S-000123"
          className={cn(CONTROL_CLASSES, "border-line pl-10")}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <TextField label="From" type="date" value={value.from} max={value.to || undefined} onChange={(e) => set({ from: e.target.value })} />
        <TextField label="To" type="date" value={value.to} min={value.from || undefined} onChange={(e) => set({ to: e.target.value })} />
        <SelectField
          label="Status"
          options={STATUS_OPTIONS}
          value={value.status}
          onChange={(e) => set({ status: e.target.value as SaleFilterState["status"] })}
        />
        <SelectField
          label="Payment"
          options={PAYMENT_OPTIONS}
          value={value.paymentStatus}
          onChange={(e) => set({ paymentStatus: e.target.value as SaleFilterState["paymentStatus"] })}
        />
      </div>
      <CustomerPicker label="Customer" value={value.customer} onChange={(customer) => set({ customer })} />
    </form>
  );
}
