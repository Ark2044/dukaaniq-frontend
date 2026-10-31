import { ApiClientError } from "@/lib/api/client";

export const MAX_RECORDING_SECONDS = 30;
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Array<[string, string]> = [
  ["webm", "webm"],
  ["mp4", "mp4"],
  ["m4a", "mp4"],
  ["aac", "aac"],
  ["ogg", "ogg"],
  ["wav", "wav"],
  ["mpeg", "mp3"],
];

/** The server checks the bytes, not the name; the extension only keeps the upload tidy. */
export function audioFileName(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  const match = EXTENSIONS.find(([key]) => lower.includes(key));
  return `voice.${match ? match[1] : "webm"}`;
}

/** Returns a plain-language problem when a recording must not be uploaded, otherwise null. */
export function validateRecording(audio: Blob): string | null {
  if (audio.size === 0) return "Nothing was recorded. Please try again and speak after you tap the mic.";
  if (audio.size > MAX_AUDIO_BYTES) return "That recording is too large (over 5 MB). Please record a shorter message.";
  return null;
}

export const NOT_CONFIGURED_MESSAGE = "Voice and AI need the Sarvam API key on the server.";

/** Friendly wording for failures of the voice and AI endpoints; the server's own message is preferred when present. */
export function voiceErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "AI_NOT_CONFIGURED" || error.status === 503) return error.message || NOT_CONFIGURED_MESSAGE;
    if (error.status === 429) return error.message || "Too many requests right now. Please wait a moment and try again.";
    if (error.status === 413) return error.message || "That recording is too large. Please record a shorter message.";
    if (error.status === 415) return error.message || "That audio format is not supported. Please try recording again.";
    if (error.status === 504) return error.message || "The voice service took too long. Please try again.";
    if (error.status === 502) return error.message || "The voice service had a problem. Please try again in a moment.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
