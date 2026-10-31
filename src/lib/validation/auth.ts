import { z } from "zod";
import { blankToNull, optionalPhone, optionalText, requiredEmail, requiredText } from "./fields";
import type { LoginPayload, RegisterPayload } from "@/types/auth";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must include at least one letter")
  .regex(/\d/, "Password must include at least one digit");

export const loginSchema = z.object({
  email: requiredEmail,
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  ownerName: requiredText("Your name", 2, 100),
  email: requiredEmail,
  password: passwordSchema,
  phone: optionalPhone("Phone"),
  shopName: requiredText("Shop name", 2, 120),
  businessCategory: z.enum(["KIRANA", "GENERAL_STORE", "OTHER"], { error: "Choose a business category" }),
  preferredLanguage: z.enum(["EN", "HI", "MR"], { error: "Choose a language" }),
  city: optionalText("City", 80),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const toLoginPayload = (values: LoginFormValues): LoginPayload => ({
  email: values.email.trim(),
  password: values.password,
});

export const toRegisterPayload = (values: RegisterFormValues): RegisterPayload => ({
  ownerName: values.ownerName.trim(),
  email: values.email.trim(),
  password: values.password,
  phone: blankToNull(values.phone),
  shopName: values.shopName.trim(),
  businessCategory: values.businessCategory,
  preferredLanguage: values.preferredLanguage,
  city: blankToNull(values.city),
});
