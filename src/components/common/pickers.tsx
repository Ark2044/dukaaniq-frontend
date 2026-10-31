"use client";

import { SearchPicker, type PickerOption, type PickerResult } from "@/components/common/SearchPicker";
import { UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { useCustomerList } from "@/lib/hooks/useCustomers";
import { useProductList } from "@/lib/hooks/useProducts";
import { formatINR } from "@/lib/utils/format";

function useCustomerOptions(query: string, enabled: boolean): PickerResult {
  const { data, isFetching, isError } = useCustomerList({ q: query || undefined, size: 8, active: true }, enabled);
  return {
    options: (data?.items ?? []).map((c) => ({ id: c.id, label: c.name, description: c.phone ?? undefined })),
    isFetching,
    isError,
  };
}

function useProductOptions(query: string, enabled: boolean): PickerResult {
  const { data, isFetching, isError } = useProductList({ q: query || undefined, size: 8 }, enabled);
  return {
    options: (data?.items ?? []).map((p) => ({
      id: p.id,
      label: p.name,
      description: [p.brand, `${formatINR(p.sellingPrice)}/${UNIT_SHORT_LABELS[p.unit]}`].filter(Boolean).join(" · "),
    })),
    isFetching,
    isError,
  };
}

interface PickerProps {
  value: PickerOption | null;
  onChange: (value: PickerOption | null) => void;
  label?: string;
}

export function CustomerPicker({ value, onChange, label = "Customer" }: PickerProps) {
  return (
    <SearchPicker
      label={label}
      placeholder="Search by name or phone"
      value={value}
      onChange={onChange}
      useOptions={useCustomerOptions}
      emptyText="No customers found"
    />
  );
}

export function ProductPicker({ value, onChange, label = "Product" }: PickerProps) {
  return (
    <SearchPicker
      label={label}
      placeholder="Search products"
      value={value}
      onChange={onChange}
      useOptions={useProductOptions}
      emptyText="No products found"
    />
  );
}
