"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { voiceErrorMessage } from "@/lib/ai/audio";
import { useSynthesize } from "./useAi";
import type { AiLanguage } from "@/types/ai";

export type PlaybackState = "loading" | "playing";

const MAX_SPEECH_CHARS = 700;

/** Plays one spoken answer at a time. Audio is fetched per tap (never autoplayed) and held only in memory. */
export function useSpeechPlayer() {
  const synthesize = useSynthesize();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Bumped by stop/unmount so late results of an abandoned request are ignored.
  const token = useRef(0);
  const [active, setActive] = useState<{ id: string; state: PlaybackState } | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  const release = useCallback(() => {
    token.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
    }
    audioRef.current = null;
  }, []);

  const stop = useCallback(() => {
    release();
    setActive(null);
  }, [release]);

  const play = useCallback(
    async (id: string, text: string, language: AiLanguage) => {
      release();
      const mine = token.current;
      setError(null);
      setActive({ id, state: "loading" });
      try {
        const result = await synthesize.mutateAsync({ text: text.slice(0, MAX_SPEECH_CHARS), language });
        if (mine !== token.current) return;
        const audio = new Audio(`data:${result.mimeType};base64,${result.audioBase64}`);
        audioRef.current = audio;
        const finish = () => {
          if (mine !== token.current) return;
          audioRef.current = null;
          setActive(null);
        };
        audio.onended = finish;
        audio.onerror = () => {
          finish();
          setError({ id, message: "This audio could not be played." });
        };
        try {
          await audio.play();
        } catch {
          if (mine !== token.current) return;
          audioRef.current = null;
          setActive(null);
          setError({ id, message: "This audio could not be played." });
          return;
        }
        if (mine === token.current) setActive({ id, state: "playing" });
      } catch (caught) {
        if (mine !== token.current) return;
        audioRef.current = null;
        setActive(null);
        setError({ id, message: voiceErrorMessage(caught) });
      }
    },
    // mutateAsync is referentially stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [release],
  );

  useEffect(() => release, [release]);

  return { active, error, play, stop };
}
