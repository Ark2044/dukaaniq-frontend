"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth, useSession } from "@/components/auth/AuthProvider";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import { SelectField, TextField } from "@/components/forms/Fields";
import { FormAlert } from "@/components/forms/FormAlert";
import { updateMerchantProfile } from "@/lib/api/merchant";
import { BUSINESS_CATEGORY_OPTIONS } from "@/lib/constants/options";
import { applyApiError } from "@/lib/forms/apiErrors";
import {
  merchantProfileSchema,
  merchantToFormValues,
  toMerchantProfileInput,
  type MerchantProfileFormValues,
} from "@/lib/validation/merchant";

const FIELDS = [
  "shopName",
  "businessCategory",
  "preferredLanguage",
  "contactPhone",
  "contactEmail",
  "addressLine",
  "city",
  "state",
  "pincode",
  "latitude",
  "longitude",
] as const;

export function ShopProfileForm() {
  const { merchant } = useSession();
  const { setMerchant } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<MerchantProfileFormValues>({
    resolver: zodResolver(merchantProfileSchema),
    defaultValues: merchantToFormValues(merchant),
  });

  const onSubmit = async (values: MerchantProfileFormValues) => {
    setFormError(null);
    try {
      // The language is edited separately; always send the latest saved value so this form never reverts it.
      const updated = await updateMerchantProfile({
        ...toMerchantProfileInput(values),
        preferredLanguage: merchant.preferredLanguage,
      });
      setMerchant(updated);
      reset(merchantToFormValues(updated));
      toast.success("Shop profile saved.");
    } catch (error) {
      setFormError(applyApiError(error, setError, FIELDS));
    }
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold">Shop profile</h2>
      <p className="mb-5 mt-1 text-sm text-muted">These details identify your shop across DukaanIQ.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormAlert message={formError} />
        <TextField label="Shop name" error={errors.shopName?.message} {...register("shopName")} />
        <SelectField
          label="Business category"
          options={BUSINESS_CATEGORY_OPTIONS}
          error={errors.businessCategory?.message}
          {...register("businessCategory")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Contact phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            optional
            error={errors.contactPhone?.message}
            {...register("contactPhone")}
          />
          <TextField
            label="Contact email"
            type="email"
            inputMode="email"
            optional
            error={errors.contactEmail?.message}
            {...register("contactEmail")}
          />
        </div>
        <TextField label="Address" optional autoComplete="street-address" error={errors.addressLine?.message} {...register("addressLine")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="City" optional error={errors.city?.message} {...register("city")} />
          <TextField label="State" optional error={errors.state?.message} {...register("state")} />
          <TextField
            label="Pincode"
            optional
            inputMode="numeric"
            maxLength={6}
            error={errors.pincode?.message}
            {...register("pincode")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Latitude" optional inputMode="decimal" error={errors.latitude?.message} {...register("latitude")} />
          <TextField label="Longitude" optional inputMode="decimal" error={errors.longitude?.message} {...register("longitude")} />
        </div>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty} className="w-full sm:w-auto">
          Save profile
        </Button>
      </form>
    </Card>
  );
}
