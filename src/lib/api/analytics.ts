import { apiRequest } from "./client";
import type { AnalyticsSummary } from "@/types/analytics";

export const ANALYTICS_SUMMARY_KEY = ["analytics-summary"] as const;

export const getAnalyticsSummary = (signal?: AbortSignal) =>
  apiRequest<AnalyticsSummary>("/analytics/summary", { signal });
