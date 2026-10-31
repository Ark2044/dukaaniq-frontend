"use client";

import { useEffect, useRef } from "react";
import { getBillScan } from "@/lib/api/billScan";
import { ApiClientError } from "@/lib/api/client";
import type { BillScanFailure, BillScanResult } from "@/types/billScan";

export interface PollConfig {
  intervalMs: number;
  timeoutMs: number;
  /** Consecutive transient errors tolerated; the next one fails the scan. */
  maxTransientErrors: number;
}

export const DEFAULT_POLL_CONFIG: PollConfig = { intervalMs: 1500, timeoutMs: 90_000, maxTransientErrors: 3 };

const TRANSIENT_CODES = new Set(["UPSTREAM_TIMEOUT", "UPSTREAM_ERROR", "NETWORK_ERROR"]);

export const isTransientError = (error: unknown) => error instanceof ApiClientError && TRANSIENT_CODES.has(error.code);

export interface PollHandlers {
  onCompleted: (result: BillScanResult) => void;
  /** The backend reported the scan itself as FAILED. */
  onFailed: (failure: BillScanFailure) => void;
  /** A request failed (non-transient, or too many transient failures in a row). */
  onError: (error: unknown) => void;
  onTimeout: () => void;
}

/** Polls GET /products/bill-scan/{id} until it completes, fails or times out. Pass null to stop. */
export function useBillScanPolling(scanId: string | null, handlers: PollHandlers, config: Partial<PollConfig> = {}) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const intervalMs = config.intervalMs ?? DEFAULT_POLL_CONFIG.intervalMs;
  const timeoutMs = config.timeoutMs ?? DEFAULT_POLL_CONFIG.timeoutMs;
  const maxTransientErrors = config.maxTransientErrors ?? DEFAULT_POLL_CONFIG.maxTransientErrors;

  useEffect(() => {
    if (!scanId) return;
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let transientErrors = 0;

    const tick = async () => {
      try {
        const status = await getBillScan(scanId, controller.signal);
        transientErrors = 0;
        if (status.status === "COMPLETED" && status.result) {
          handlersRef.current.onCompleted(status.result);
          return;
        }
        if (status.status === "FAILED" || status.status === "COMPLETED") {
          handlersRef.current.onFailed(
            status.error ?? { code: "SCAN_FAILED", message: "We could not read this bill." },
          );
          return;
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!isTransientError(error)) {
          handlersRef.current.onError(error);
          return;
        }
        transientErrors += 1;
        if (transientErrors > maxTransientErrors) {
          handlersRef.current.onError(error);
          return;
        }
      }
      if (Date.now() - startedAt >= timeoutMs) {
        handlersRef.current.onTimeout();
        return;
      }
      timer = setTimeout(tick, intervalMs);
    };

    void tick();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [scanId, intervalMs, timeoutMs, maxTransientErrors]);
}
