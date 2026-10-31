import type { BusinessCategory, Language, MerchantProfile } from "./merchant";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthSession {
  user: AuthUser;
  merchant: MerchantProfile;
}

export interface RegisterPayload {
  ownerName: string;
  email: string;
  password: string;
  phone: string | null;
  shopName: string;
  businessCategory: BusinessCategory;
  preferredLanguage: Language;
  city: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}
