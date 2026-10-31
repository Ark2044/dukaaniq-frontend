"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MAX_RECORDING_SECONDS } from "@/lib/ai/audio";

export type RecorderStatus = "idle" | "requesting" | "recording" | "denied" | "error";

export interface RecordedAudio {
  blob: Blob;
  mimeType: string;
}

interface Options {
  maxSeconds?: number;
  /** Called once per finished recording (stopped by the user or by the time limit); never after cancel/unmount. */
  onComplete: (audio: RecordedAudio) => void;
}

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];

/** Picks the first container the browser can record (Chrome: webm, Safari: mp4); undefined lets the browser decide. */
export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

const isSupported = () =>
  typeof window !== "undefined" &&
  typeof MediaRecorder !== "undefined" &&
  typeof navigator !== "undefined" &&
  typeof navigator.mediaDevices?.getUserMedia === "function";

const noopSubscribe = () => () => {};

export const UNSUPPORTED_MESSAGE =
  "Recording is not available in this browser, or the page is not on a secure (https) connection. Please type instead.";
export const DENIED_MESSAGE =
  "Microphone access is blocked. Allow the microphone in your browser settings, then try again — or type instead.";

function messageFor(error: unknown): { status: "denied" | "error"; message: string } {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
    return { status: "denied", message: DENIED_MESSAGE };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return { status: "error", message: "No microphone was found on this device." };
  }
  if (name === "NotReadableError") {
    return { status: "error", message: "The microphone is being used by another app. Close it and try again." };
  }
  return { status: "error", message: "Could not start recording. Please try again." };
}

/** Records one voice clip with MediaRecorder. Audio lives only in memory and the microphone is always released. */
export function useAudioRecorder({ maxSeconds = MAX_RECORDING_SECONDS, onComplete }: Options) {
  const supported = useSyncExternalStore(noopSubscribe, isSupported, () => true);
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [secondsLeft, setSecondsLeft] = useState(maxSeconds);
  const [error, setError] = useState<string | null>(null);

  const onCompleteRef = useRef(onComplete);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped by cancel/unmount so a late getUserMedia or onstop result is thrown away.
  const sessionRef = useRef(0);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const release = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (limitRef.current) clearTimeout(limitRef.current);
    tickRef.current = null;
    limitRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const cancel = useCallback(() => {
    sessionRef.current += 1;
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    chunksRef.current = [];
    release();
    setStatus("idle");
    setSecondsLeft(maxSeconds);
  }, [maxSeconds, release]);

  const start = useCallback(async () => {
    if (status === "requesting" || status === "recording") return;
    setError(null);
    if (!isSupported()) {
      setStatus("error");
      setError(UNSUPPORTED_MESSAGE);
      return;
    }
    const session = ++sessionRef.current;
    setStatus("requesting");
    setSecondsLeft(maxSeconds);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (caught) {
      if (session !== sessionRef.current) return;
      const failure = messageFor(caught);
      setStatus(failure.status);
      setError(failure.message);
      return;
    }
    if (session !== sessionRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    try {
      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        if (session !== sessionRef.current) return;
        sessionRef.current += 1;
        chunksRef.current = [];
        release();
        setStatus("error");
        setError("Recording stopped unexpectedly. Please try again.");
      };
      recorder.onstop = () => {
        if (session !== sessionRef.current) return;
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        release();
        setStatus("idle");
        setSecondsLeft(maxSeconds);
        onCompleteRef.current({ blob, mimeType: type });
      };

      const startedAt = Date.now();
      recorder.start();
      setStatus("recording");
      tickRef.current = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        setSecondsLeft(Math.max(0, Math.ceil(maxSeconds - elapsed)));
      }, 250);
      limitRef.current = setTimeout(() => stop(), maxSeconds * 1000);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      release();
      setStatus("error");
      setError("Could not start recording. Please try again.");
    }
  }, [maxSeconds, release, status, stop]);

  useEffect(
    () => () => {
      sessionRef.current += 1;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      if (tickRef.current) clearInterval(tickRef.current);
      if (limitRef.current) clearTimeout(limitRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  return {
    status,
    supported,
    secondsLeft,
    elapsedSeconds: maxSeconds - secondsLeft,
    maxSeconds,
    error: !supported ? UNSUPPORTED_MESSAGE : error,
    isRecording: status === "recording",
    isBusy: status === "requesting" || status === "recording",
    start,
    stop,
    cancel,
  };
}
