"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/common/Button";
import { TextField } from "@/components/forms/Fields";
import { PasswordField } from "@/components/forms/PasswordField";
import { FormAlert } from "@/components/forms/FormAlert";
import { applyApiError } from "@/lib/forms/apiErrors";
import { loginSchema, toLoginPayload, type LoginFormValues } from "@/lib/validation/auth";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(toLoginPayload(values));
      router.replace("/");
    } catch (error) {
      setFormError(applyApiError(error, setError, ["email", "password"]));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <TextField label="Email" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")} />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" loading={isSubmitting} className="w-full">
        Sign in
      </Button>
      <p className="text-center text-sm text-muted">
        New to DukaanIQ?{" "}
        <Link href="/register" className="font-semibold text-navy-900 underline">
          Create your shop
        </Link>
      </p>
    </form>
  );
}
