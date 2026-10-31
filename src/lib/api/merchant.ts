import { apiRequest } from "./client";
import type { MerchantProfile, MerchantProfileInput } from "@/types/merchant";

export const getMerchantProfile = (signal?: AbortSignal) =>
  apiRequest<MerchantProfile>("/merchant/profile", { signal });

export const updateMerchantProfile = (input: MerchantProfileInput) =>
  apiRequest<MerchantProfile>("/merchant/profile", { method: "PUT", body: input });
