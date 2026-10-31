import { ApiClientError } from "@/lib/api/client";
import type { BillScanFailure } from "@/types/billScan";

export type ScanProblemKind = "not-configured" | "failed" | "timeout" | "empty" | "error";

export interface ScanProblem {
  kind: ScanProblemKind;
  title: string;
  message: string;
}

export const NOT_CONFIGURED_PROBLEM: ScanProblem = {
  kind: "not-configured",
  title: "Bill scanning isn't set up yet",
  message:
    "Bill scanning needs the Sarvam API key to be configured on the server. Until then you can add products manually or import a CSV file.",
};

export const TIMEOUT_PROBLEM: ScanProblem = {
  kind: "timeout",
  title: "This is taking too long",
  message: "We could not finish reading your bill in time. Please try again, ideally with a clearer, well-lit photo.",
};

export const EMPTY_PROBLEM: ScanProblem = {
  kind: "empty",
  title: "No items found",
  message: "We could not find any products on this bill. Make sure the whole item list is visible and try again.",
};

export function problemFromError(error: unknown): ScanProblem {
  if (error instanceof ApiClientError) {
    if (error.code === "AI_NOT_CONFIGURED") return NOT_CONFIGURED_PROBLEM;
    return { kind: "error", title: "Could not scan the bill", message: error.message };
  }
  return { kind: "error", title: "Could not scan the bill", message: "Something went wrong. Please try again." };
}

export const problemFromFailure = (failure: BillScanFailure): ScanProblem =>
  failure.code === "AI_NOT_CONFIGURED"
    ? NOT_CONFIGURED_PROBLEM
    : { kind: "failed", title: "We couldn't read this bill", message: failure.message };
