import { apiRequest } from "./client";
import { audioFileName } from "@/lib/ai/audio";
import type {
  AiStatus,
  ChatInput,
  ChatReply,
  ParseTextInput,
  SpeechLanguage,
  SynthesizeInput,
  SynthesizedAudio,
  Transcription,
  VoiceDraft,
} from "@/types/ai";

export const aiKeys = {
  status: ["ai", "status"] as const,
};

export const getAiStatus = (signal?: AbortSignal) => apiRequest<AiStatus>("/ai/status", { signal });

function audioForm(audio: Blob, language: SpeechLanguage) {
  const form = new FormData();
  form.append("file", audio, audioFileName(audio.type));
  form.append("language", language);
  return form;
}

/** Uploads one recording; the server transcribes it and builds a draft. It never creates a sale. */
export const parseVoiceAudio = (audio: Blob, language: SpeechLanguage, signal?: AbortSignal) =>
  apiRequest<VoiceDraft>("/sales/voice/parse", { method: "POST", body: audioForm(audio, language), signal });

export const parseVoiceText = (input: ParseTextInput, signal?: AbortSignal) =>
  apiRequest<VoiceDraft>("/sales/voice/parse-text", { method: "POST", body: input, signal });

export const transcribeAudio = (audio: Blob, language: SpeechLanguage, signal?: AbortSignal) =>
  apiRequest<Transcription>("/ai/voice/transcribe", { method: "POST", body: audioForm(audio, language), signal });

export const sendChat = (input: ChatInput, signal?: AbortSignal) =>
  apiRequest<ChatReply>("/ai/chat", { method: "POST", body: input, signal });

export const synthesizeSpeech = (input: SynthesizeInput, signal?: AbortSignal) =>
  apiRequest<SynthesizedAudio>("/ai/voice/synthesize", { method: "POST", body: input, signal });
