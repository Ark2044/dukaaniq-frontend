"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/common/Button";
import { SelectField, TextField } from "@/components/forms/Fields";
import { PasswordField } from "@/components/forms/PasswordField";
import { FormAlert } from "@/components/forms/FormAlert";
import { applyApiError } from "@/lib/forms/apiErrors";
import { BUSINESS_CATEGORY_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants/options";
import { registerSchema, toRegisterPayload, type RegisterFormValues } from "@/lib/validation/auth";

const FIELDS = [
  "ownerName",
  "email",
  "password",
  "phone",
  "shopName",
  "businessCategory",
  "preferredLanguage",
  "city",
] as const;

export function RegisterForm() {
  const { register: registerAccount } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      ownerName: "",
      email: "",
      password: "",
      phone: "",
      shopName: "",
      businessCategory: "KIRANA",
      preferredLanguage: "EN",
      city: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    try {
      await registerAccount(toRegisterPayload(values));
      router.replace("/");
    } catch (error) {
      setFormError(applyApiError(error, setError, FIELDS));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <fieldset className="space-y-4">
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">About you</legend>
        <TextField label="Your name" autoComplete="name" error={errors.ownerName?.message} {...register("ownerName")} />
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")} />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint="8–72 characters with at least one letter and one digit."
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          optional
          placeholder="9876543210"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Your shop</legend>
        <TextField label="Shop name" autoComplete="organization" error={errors.shopName?.message} {...register("shopName")} />
        <SelectField
          label="Business category"
          options={BUSINESS_CATEGORY_OPTIONS}
          error={errors.businessCategory?.message}
          {...register("businessCategory")}
        />
        <SelectField
          label="Preferred language"
          options={LANGUAGE_OPTIONS}
          error={errors.preferredLanguage?.message}
          {...register("preferredLanguage")}
        />
        <TextField label="City" autoComplete="address-level2" optional error={errors.city?.message} {...register("city")} />
      </fieldset>
      <Button type="submit" loading={isSubmitting} className="w-full">
        Create account
      </Button>
      <p className="text-center text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-navy-900 underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
