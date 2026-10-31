import { z } from "zod";

export const PHONE_REGEX = /^[6-9][0-9]{9}$/;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export const requiredText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

export const optionalPhone = (label = "Phone") =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || PHONE_REGEX.test(v), `${label} must be a valid 10-digit Indian mobile number`);

export const requiredEmail = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email must be at most 254 characters")
  .pipe(z.email("Enter a valid email address"));

export const optionalEmail = z
  .string()
  .trim()
  .max(254, "Email must be at most 254 characters")
  .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address");

interface NumberTextOptions {
  required?: boolean;
  min?: number;
  max?: number;
  /** Value must be strictly greater than this. */
  exclusiveMin?: number;
  maxDecimals: number;
}

/** Validates a numeric form input kept as a string (so empty and partially typed values stay representable). */
export function numberProblem(rawValue: string, label: string, options: NumberTextOptions): string | null {
  const value = rawValue.trim();
  if (value === "") return options.required ? `${label} is required` : null;
  if (!/^-?\d+(\.\d+)?$/.test(value)) return `${label} must be a number`;
  const n = Number(value);
  const decimals = value.split(".")[1]?.length ?? 0;
  if (decimals > options.maxDecimals) {
    return `${label} can have at most ${options.maxDecimals} decimal place${options.maxDecimals === 1 ? "" : "s"}`;
  }
  if (options.exclusiveMin !== undefined && n <= options.exclusiveMin) {
    return `${label} must be greater than ${options.exclusiveMin}`;
  }
  if (options.min !== undefined && n < options.min) return `${label} must be at least ${options.min}`;
  if (options.max !== undefined && n > options.max) return `${label} must be at most ${options.max}`;
  return null;
}

export function numberText(label: string, options: NumberTextOptions) {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const problem = numberProblem(value, label, options);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    });
}

export const blankToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export const textToNumberOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
};
