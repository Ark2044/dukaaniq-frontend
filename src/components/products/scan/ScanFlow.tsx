"use client";

import { useCallback, useRef, useState } from "react";
import { ConfirmResult } from "./ConfirmResult";
import { CaptureStep } from "./CaptureStep";
import { ProcessingStep } from "./ProcessingStep";
import { ReviewStep } from "./ReviewStep";
import { ScanProblem } from "./ScanProblem";
import {
  EMPTY_PROBLEM,
  TIMEOUT_PROBLEM,
  problemFromError,
  problemFromFailure,
  type ScanProblem as ScanProblemInfo,
} from "./problems";
import { startBillScan } from "@/lib/api/billScan";
import { useBillScanPolling, type PollConfig } from "@/lib/hooks/useBillScanPolling";
import { prepareBillFile, validateBillSize, validateBillType } from "@/lib/scan/image";
import type { BillConfirmResult, BillScanResult } from "@/types/billScan";

type Step =
  | { name: "capture" }
  | { name: "uploading" }
  | { name: "reading"; scanId: string }
  | { name: "problem"; problem: ScanProblemInfo }
  | { name: "review"; scanId: string; result: BillScanResult }
  | { name: "done"; result: BillConfirmResult | null };

export function ScanFlow({ polling }: { polling?: Partial<PollConfig> }) {
  const [step, setStep] = useState<Step>({ name: "capture" });
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const uploadController = useRef<AbortController | null>(null);

  const pickFile = useCallback(async (raw: File) => {
    setFileError(null);
    setFile(null);
    const typeProblem = validateBillType(raw);
    if (typeProblem) {
      setFileError(typeProblem);
      return;
    }
    setPreparing(true);
    const prepared = await prepareBillFile(raw);
    setPreparing(false);
    const sizeProblem = validateBillSize(prepared);
    if (sizeProblem) {
      setFileError(sizeProblem);
      return;
    }
    setFile(prepared);
  }, []);

  const startScan = async () => {
    if (!file) return;
    const controller = new AbortController();
    uploadController.current = controller;
    setStep({ name: "uploading" });
    try {
      const started = await startBillScan(file, controller.signal);
      setStep({ name: "reading", scanId: started.scanId });
    } catch (error) {
      if (controller.signal.aborted) return;
      setStep({ name: "problem", problem: problemFromError(error) });
    }
  };

  const backToCapture = () => {
    uploadController.current?.abort();
    setStep({ name: "capture" });
  };

  const scanAnother = () => {
    setFile(null);
    setFileError(null);
    setStep({ name: "capture" });
  };

  const readingScanId = step.name === "reading" ? step.scanId : null;
  useBillScanPolling(
    readingScanId,
    {
      onCompleted: (result) =>
        setStep(
          result.lines.length === 0
            ? { name: "problem", problem: EMPTY_PROBLEM }
            : { name: "review", scanId: readingScanId ?? "", result },
        ),
      onFailed: (failure) => setStep({ name: "problem", problem: problemFromFailure(failure) }),
      onError: (error) => setStep({ name: "problem", problem: problemFromError(error) }),
      onTimeout: () => setStep({ name: "problem", problem: TIMEOUT_PROBLEM }),
    },
    polling,
  );

  switch (step.name) {
    case "capture":
      return (
        <CaptureStep
          file={file}
          preparing={preparing}
          error={fileError}
          onPick={pickFile}
          onClear={() => setFile(null)}
          onScan={startScan}
        />
      );
    case "uploading":
      return <ProcessingStep stage="uploading" onCancel={backToCapture} />;
    case "reading":
      return <ProcessingStep stage="reading" onCancel={backToCapture} />;
    case "problem":
      return <ScanProblem problem={step.problem} onRetry={backToCapture} />;
    case "review":
      return (
        <ReviewStep
          scanId={step.scanId}
          result={step.result}
          onApplied={(result) => setStep({ name: "done", result })}
          onDiscard={scanAnother}
        />
      );
    case "done":
      return <ConfirmResult result={step.result} onScanAnother={scanAnother} />;
  }
}
