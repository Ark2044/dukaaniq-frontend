"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_SUMMARY_KEY, getAnalyticsSummary } from "@/lib/api/analytics";

export const useAnalyticsSummary = () =>
  useQuery({ queryKey: ANALYTICS_SUMMARY_KEY, queryFn: ({ signal }) => getAnalyticsSummary(signal) });
