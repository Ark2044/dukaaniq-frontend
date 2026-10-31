"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AiLanguage, SpeechLanguage } from "@/types/ai";

export const AI_LANGUAGE_OPTIONS: ReadonlyArray<{ value: AiLanguage; label: string }> = [
  { value: "en-IN", label: "English" },
  { value: "hi-IN", label: "हिन्दी" },
  { value: "mr-IN", label: "मराठी" },
];

export const SPEECH_LANGUAGE_OPTIONS: ReadonlyArray<{ value: SpeechLanguage; label: string }> = [
  { value: "unknown", label: "Auto-detect" },
  ...AI_LANGUAGE_OPTIONS,
];

export const ADVISOR_LANGUAGE_KEY = "dukaaniq.advisorLanguage";
export const VOICE_LANGUAGE_KEY = "dukaaniq.voiceLanguage";

const isAiLanguage = (value: unknown): value is AiLanguage => AI_LANGUAGE_OPTIONS.some((o) => o.value === value);
const isSpeechLanguage = (value: unknown): value is SpeechLanguage => value === "unknown" || isAiLanguage(value);

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

function read<T extends string>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return valid(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode); the choice then lasts only until the next reload.
  }
  listeners.forEach((listener) => listener());
}

/** The advisor's language (chat answers, listening, and the mic hint), remembered on this device. */
export function useAdvisorLanguage(): [AiLanguage, (language: AiLanguage) => void] {
  const language = useSyncExternalStore(
    subscribe,
    () => read(ADVISOR_LANGUAGE_KEY, "en-IN", isAiLanguage),
    () => "en-IN" as AiLanguage,
  );
  const setLanguage = useCallback((next: AiLanguage) => write(ADVISOR_LANGUAGE_KEY, next), []);
  return [language, setLanguage];
}

/** The language hint for "Speak a sale"; defaults to auto-detect because shopkeepers often mix languages. */
export function useVoiceLanguage(): [SpeechLanguage, (language: SpeechLanguage) => void] {
  const language = useSyncExternalStore(
    subscribe,
    () => read(VOICE_LANGUAGE_KEY, "unknown", isSpeechLanguage),
    () => "unknown" as SpeechLanguage,
  );
  const setLanguage = useCallback((next: SpeechLanguage) => write(VOICE_LANGUAGE_KEY, next), []);
  return [language, setLanguage];
}
