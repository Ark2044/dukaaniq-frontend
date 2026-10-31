import { z } from "zod";
import {
  PINCODE_REGEX,
  blankToNull,
  numberText,
  optionalEmail,
  optionalPhone,
  optionalText,
  requiredText,
  textToNumberOrNull,
} from "./fields";
import type { MerchantProfile, MerchantProfileInput } from "@/types/merchant";

export const merchantProfileSchema = z.object({
  shopName: requiredText("Shop name", 2, 120),
  businessCategory: z.enum(["KIRANA", "GENERAL_STORE", "OTHER"], { error: "Choose a business category" }),
  preferredLanguage: z.enum(["EN", "HI", "MR"], { error: "Choose a language" }),
  contactPhone: optionalPhone("Contact phone"),
  contactEmail: optionalEmail,
  addressLine: optionalText("Address", 200),
  city: optionalText("City", 80),
  state: optionalText("State", 80),
  pincode: z
    .string()
    .trim()
    .refine((v) => v === "" || PINCODE_REGEX.test(v), "Pincode must be a valid 6-digit Indian pincode"),
  latitude: numberText("Latitude", { min: -90, max: 90, maxDecimals: 8 }),
  longitude: numberText("Longitude", { min: -180, max: 180, maxDecimals: 8 }),
});
export type MerchantProfileFormValues = z.infer<typeof merchantProfileSchema>;

export const merchantToFormValues = (m: MerchantProfile): MerchantProfileFormValues => ({
  shopName: m.shopName,
  businessCategory: m.businessCategory,
  preferredLanguage: m.preferredLanguage,
  contactPhone: m.contactPhone ?? "",
  contactEmail: m.contactEmail ?? "",
  addressLine: m.addressLine ?? "",
  city: m.city ?? "",
  state: m.state ?? "",
  pincode: m.pincode ?? "",
  latitude: m.latitude === null ? "" : String(m.latitude),
  longitude: m.longitude === null ? "" : String(m.longitude),
});

export const toMerchantProfileInput = (v: MerchantProfileFormValues): MerchantProfileInput => ({
  shopName: v.shopName.trim(),
  businessCategory: v.businessCategory,
  preferredLanguage: v.preferredLanguage,
  contactPhone: blankToNull(v.contactPhone),
  contactEmail: blankToNull(v.contactEmail),
  addressLine: blankToNull(v.addressLine),
  city: blankToNull(v.city),
  state: blankToNull(v.state),
  pincode: blankToNull(v.pincode),
  latitude: textToNumberOrNull(v.latitude),
  longitude: textToNumberOrNull(v.longitude),
});
