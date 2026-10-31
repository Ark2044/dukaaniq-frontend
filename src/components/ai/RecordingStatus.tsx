"use client";

import { Loader2 } from "lucide-react";
import type { RecorderStatus } from "@/lib/hooks/useAudioRecorder";

const clock = (seconds: number) => `0:${String(Math.max(0, seconds)).padStart(2, "0")}`;

interface RecordingStatusProps {
  status: RecorderStatus;
  secondsLeft: number;
  maxSeconds: number;
  className?: string;
}

/** Visible countdown plus a polite live region; the ticking clock itself is hidden from screen readers. */
export function RecordingStatus({ status, secondsLeft, maxSeconds, className }: RecordingStatusProps) {
  const spoken =
    status === "requesting"
      ? "Waiting for microphone permission."
      : status === "recording"
        ? secondsLeft === 10 || secondsLeft === 5
          ? `${secondsLeft} seconds left.`
          : "Recording. Tap stop when you are done."
        : "";

  return (
    <div className={className}>
      <p role="status" aria-live="polite" className="sr-only">
        {spoken}
      </p>
      {status === "requesting" && (
        <p aria-hidden className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Waiting for microphone permission…
        </p>
      )}
      {status === "recording" && (
        <div aria-hidden className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-danger">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
            Recording… <span data-testid="recording-countdown">{clock(secondsLeft)} left</span>
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-danger transition-[width] duration-200"
              style={{ width: `${Math.min(100, ((maxSeconds - secondsLeft) / maxSeconds) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
