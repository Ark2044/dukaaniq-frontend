"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { aiKeys, getAiStatus, parseVoiceAudio, parseVoiceText, sendChat, synthesizeSpeech, transcribeAudio } from "@/lib/api/ai";
import type { ChatInput, ParseTextInput, SpeechLanguage, SynthesizeInput } from "@/types/ai";

export const useAiStatus = () =>
  useQuery({
    queryKey: aiKeys.status,
    queryFn: ({ signal }) => getAiStatus(signal),
    staleTime: 60_000,
    retry: false,
  });

/** Whether one AI feature can be used; if the status check itself fails, controls stay usable and real calls report the error. */
export function useAiCapability(feature: "speech" | "chat" | "tts") {
  const { data, isPending, isError } = useAiStatus();
  const notConfigured = data !== undefined && (!data.configured || !data[feature]);
  return { checking: isPending, notConfigured, available: !isPending && !notConfigured, statusFailed: isError };
}

export const useParseVoiceAudio = () =>
  useMutation({ mutationFn: (input: { audio: Blob; language: SpeechLanguage }) => parseVoiceAudio(input.audio, input.language) });

export const useParseVoiceText = () => useMutation({ mutationFn: (input: ParseTextInput) => parseVoiceText(input) });

export const useTranscribeAudio = () =>
  useMutation({ mutationFn: (input: { audio: Blob; language: SpeechLanguage }) => transcribeAudio(input.audio, input.language) });

export const useAiChat = () => useMutation({ mutationFn: (input: ChatInput) => sendChat(input) });

export const useSynthesize = () => useMutation({ mutationFn: (input: SynthesizeInput) => synthesizeSpeech(input) });
