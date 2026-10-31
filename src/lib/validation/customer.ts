import { z } from "zod";
import { blankToNull, optionalPhone, optionalText, requiredText } from "./fields";
import type { Customer, CustomerCreateInput, CustomerUpdateInput } from "@/types/customer";

export const customerCreateSchema = z.object({
  name: requiredText("Name", 2, 100),
  phone: optionalPhone(),
});
export type CustomerCreateFormValues = z.infer<typeof customerCreateSchema>;
export const CUSTOMER_CREATE_FIELDS = ["name", "phone"] as const;

export const toCustomerCreateInput = (v: CustomerCreateFormValues): CustomerCreateInput => ({
  name: v.name.trim(),
  phone: blankToNull(v.phone),
  notes: null,
});

export const customerEditSchema = z.object({
  name: requiredText("Name", 2, 100),
  phone: optionalPhone(),
  notes: optionalText("Notes", 200),
  active: z.boolean(),
});
export type CustomerEditFormValues = z.infer<typeof customerEditSchema>;
export const CUSTOMER_EDIT_FIELDS = ["name", "phone", "notes", "active"] as const;

export const customerToFormValues = (c: Customer): CustomerEditFormValues => ({
  name: c.name,
  phone: c.phone ?? "",
  notes: c.notes ?? "",
  active: c.active,
});

export const toCustomerUpdateInput = (v: CustomerEditFormValues): CustomerUpdateInput => ({
  name: v.name.trim(),
  phone: blankToNull(v.phone),
  notes: blankToNull(v.notes),
  active: v.active,
});
