export type BusinessCategory = "KIRANA" | "GENERAL_STORE" | "OTHER";
export type Language = "EN" | "HI" | "MR";

export interface MerchantProfile {
  id: string;
  shopName: string;
  businessCategory: BusinessCategory;
  preferredLanguage: Language;
  contactPhone: string | null;
  contactEmail: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  demo: boolean;
  createdAt: string;
}

/** Body of PUT /merchant/profile (full replace; omitted optional fields are cleared). */
export interface MerchantProfileInput {
  shopName: string;
  businessCategory: BusinessCategory;
  preferredLanguage: Language;
  contactPhone: string | null;
  contactEmail: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
}
