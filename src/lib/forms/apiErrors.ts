import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import { ApiClientError } from "@/lib/api/client";

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

/**
 * Maps backend `details[].field` entries onto form fields (nested paths such as `aliases[2]` map to their
 * root field). Returns a form-level message for anything that could not be attached to a field, or null
 * when every problem is now shown next to its field.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly FieldPath<T>[],
): string | null {
  if (!(error instanceof ApiClientError)) return GENERIC_MESSAGE;

  const unmatched: string[] = [];
  for (const detail of error.details) {
    const root = detail.field?.split(/[.[]/)[0];
    const match = fields.find((f) => f === root);
    if (match) setError(match, { type: "server", message: detail.message });
    else unmatched.push(detail.message);
  }

  if (error.code === "VALIDATION_FAILED") {
    if (error.details.length === 0) return error.message;
    return unmatched.length === 0 ? null : unmatched.join(" ");
  }
  return error.message;
}
