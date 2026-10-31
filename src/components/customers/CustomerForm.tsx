"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/common/Button";
import { TextField } from "@/components/forms/Fields";
import { FormAlert } from "@/components/forms/FormAlert";
import { ApiClientError } from "@/lib/api/client";
import { applyApiError } from "@/lib/forms/apiErrors";
import { useCreateCustomer } from "@/lib/hooks/useCustomers";
import {
  CUSTOMER_CREATE_FIELDS,
  customerCreateSchema,
  toCustomerCreateInput,
  type CustomerCreateFormValues,
} from "@/lib/validation/customer";
import type { Customer } from "@/types/customer";

export const PHONE_PRIVACY_HINT = "Phone is optional and only used, with your approval, to remind this customer about dues.";

interface CustomerFormProps {
  submitLabel?: string;
  /** Tighter layout for use inside another flow (quick sale). */
  compact?: boolean;
  onCreated: (customer: Customer) => void;
  onCancel?: () => void;
}

export function CustomerForm({ submitLabel = "Add customer", compact = false, onCreated, onCancel }: CustomerFormProps) {
  const create = useCreateCustomer();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CustomerCreateFormValues>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: { name: "", phone: "" },
  });

  const submit = async (values: CustomerCreateFormValues) => {
    setFormError(null);
    try {
      const customer = await create.mutateAsync(toCustomerCreateInput(values));
      reset();
      onCreated(customer);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "DUPLICATE_CUSTOMER") {
        const message = error.details.find((d) => d.field === "phone")?.message ?? error.message;
        setError("phone", { type: "server", message });
        return;
      }
      setFormError(applyApiError(error, setError, CUSTOMER_CREATE_FIELDS));
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate aria-label="Add customer" className="space-y-4">
      <FormAlert message={formError} />
      <div className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        <TextField label="Name" autoComplete="off" error={errors.name?.message} {...register("name")} />
        <TextField
          label="Phone"
          optional
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          hint={PHONE_PRIVACY_HINT}
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={create.isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
