"use client";

import { useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, Mic, RotateCcw, Send, Square } from "lucide-react";
import { AiNotConfigured } from "./AiNotConfigured";
import { AdvisorMessage, type ChatMessage } from "./AdvisorMessage";
import { RecordingStatus } from "./RecordingStatus";
import { Card } from "@/components/common/Card";
import { SelectField } from "@/components/forms/Fields";
import { validateRecording, voiceErrorMessage } from "@/lib/ai/audio";
import { AI_LANGUAGE_OPTIONS, useAdvisorLanguage } from "@/lib/ai/language";
import { useAiCapability, useAiChat, useTranscribeAudio } from "@/lib/hooks/useAi";
import { useAudioRecorder, type RecordedAudio } from "@/lib/hooks/useAudioRecorder";
import { useSpeechPlayer } from "@/lib/hooks/useSpeechPlayer";
import { cn } from "@/lib/utils/format";
import type { AiLanguage } from "@/types/ai";

export const MESSAGE_MAX = 300;

export const SUGGESTED_QUESTIONS = [
  "Today's sales",
  "Top products this week",
  "What is low on stock?",
  "Who owes me money?",
  "Today's collections",
] as const;

const TTS_UNAVAILABLE = "Listening needs the Sarvam API key on the server.";

export function Advisor() {
  const [language, setLanguage] = useAdvisorLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Bumped by "New conversation" so an answer that arrives afterwards is dropped.
  const conversation = useRef(0);

  const chatCapability = useAiCapability("chat");
  const speechCapability = useAiCapability("speech");
  const ttsCapability = useAiCapability("tts");
  const chat = useAiChat();
  const transcribe = useTranscribeAudio();
  const player = useSpeechPlayer();

  const notConfigured = chatCapability.notConfigured && speechCapability.notConfigured;
  const canAsk = chatCapability.available && !chat.isPending;

  const ask = async (question: string, isRetry = false) => {
    const message = question.trim().slice(0, MESSAGE_MAX);
    if (!message || !chatCapability.available || chat.isPending) return;
    const mine = conversation.current;
    const id = crypto.randomUUID();
    setText("");
    // A retry replaces the error bubble; the question is already in the conversation.
    setMessages((current) => [
      ...current.filter((m) => m.role !== "error"),
      ...(isRetry ? [] : [{ id, role: "user" as const, text: message }]),
    ]);
    try {
      const reply = await chat.mutateAsync({ message, language });
      if (mine !== conversation.current) return;
      setMessages((current) => [...current, { id: reply.interactionId || `${id}-reply`, role: "assistant", reply }]);
    } catch (error) {
      if (mine !== conversation.current) return;
      setMessages((current) => [...current, { id: `${id}-error`, role: "error", text: voiceErrorMessage(error), question: message }]);
    }
  };

  const transcribeRecording = async ({ blob }: RecordedAudio) => {
    const problem = validateRecording(blob);
    if (problem) {
      setMicError(problem);
      return;
    }
    setMicError(null);
    setTranscribing(true);
    try {
      const result = await transcribe.mutateAsync({ audio: blob, language });
      // The transcript only fills the box; the merchant reads it and decides whether to send.
      setText(result.transcript.slice(0, MESSAGE_MAX));
      inputRef.current?.focus();
    } catch (error) {
      setMicError(voiceErrorMessage(error));
    } finally {
      setTranscribing(false);
    }
  };

  const recorder = useAudioRecorder({ onComplete: transcribeRecording });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(text);
  };

  const newConversation = () => {
    conversation.current += 1;
    player.stop();
    setMessages([]);
    setText("");
    setMicError(null);
  };

  const micBlocked = !speechCapability.available || !recorder.supported || transcribing || chat.isPending;
  const micLabel = recorder.isRecording ? "Stop recording" : "Speak your question";
  const remaining = MESSAGE_MAX - text.length;
  const listenReason = ttsCapability.available ? null : ttsCapability.checking ? "Checking voice setup…" : TTS_UNAVAILABLE;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {notConfigured && (
        <AiNotConfigured>Your sales, stock and dues are still available in the rest of the app.</AiNotConfigured>
      )}

      <Card className="flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="min-w-44 flex-1">
          <SelectField
            label="Answer language"
            value={language}
            onChange={(e) => {
              player.stop();
              setLanguage(e.target.value as AiLanguage);
            }}
            options={AI_LANGUAGE_OPTIONS}
          />
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={newConversation}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-background"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> New conversation
          </button>
        )}
      </Card>

      <section aria-label="Conversation" className="min-h-48 space-y-3">
        {messages.length === 0 ? (
          <Card className="flex flex-col items-center px-6 py-8 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted">
              <Bot className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="text-base font-semibold">Ask about your shop</h2>
            <p className="mt-1 max-w-sm text-sm text-muted">
              I answer only from your own sales, stock and credit records. I cannot tell you profit, because it is not tracked.
            </p>
          </Card>
        ) : (
          <ul role="log" aria-live="polite" aria-label="Messages" className="space-y-3">
            {messages.map((message) => (
              <AdvisorMessage
                key={message.id}
                message={message}
                listen={{
                  state: player.active?.id === message.id ? player.active.state : null,
                  error: player.error?.id === message.id ? player.error.message : null,
                  disabledReason: listenReason,
                }}
                onPlay={(id, answer) => void player.play(id, answer, language)}
                onStop={player.stop}
                onRetry={(question) => void ask(question, true)}
                retryDisabled={!canAsk}
              />
            ))}
          </ul>
        )}
        {chat.isPending && (
          <p role="status" className="flex items-center gap-2 px-1 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Looking at your records…
          </p>
        )}
      </section>

      <div role="group" aria-label="Suggested questions" className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => void ask(question)}
            disabled={!canAsk}
            className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-2 rounded-2xl border border-line bg-surface p-3">
        <label htmlFor="advisor-input" className="sr-only">
          Your question
        </label>
        <div className="flex items-center gap-2">
          <input
            id="advisor-input"
            ref={inputRef}
            type="text"
            value={text}
            maxLength={MESSAGE_MAX}
            autoComplete="off"
            disabled={!chatCapability.available}
            placeholder="Ask about sales, stock or dues…"
            onChange={(e) => setText(e.target.value)}
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base disabled:cursor-not-allowed disabled:bg-background"
          />
          <button
            type="button"
            onClick={recorder.isRecording ? recorder.stop : recorder.start}
            disabled={recorder.isRecording ? false : micBlocked}
            aria-label={micLabel}
            title={!speechCapability.available && !speechCapability.checking ? "Voice needs the Sarvam API key on the server." : undefined}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-navy-900 disabled:cursor-not-allowed disabled:opacity-50",
              recorder.isRecording ? "border-danger bg-danger text-white" : "border-line bg-surface hover:bg-background",
            )}
          >
            {recorder.isRecording ? <Square className="h-5 w-5 fill-current" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
          </button>
          <button
            type="submit"
            disabled={!canAsk || text.trim() === ""}
            aria-label="Send question"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-h-5 flex-1 text-xs">
            <RecordingStatus status={recorder.status} secondsLeft={recorder.secondsLeft} maxSeconds={recorder.maxSeconds} />
            {transcribing && (
              <p role="status" className="flex items-center gap-2 text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Turning your voice into text…
              </p>
            )}
            {(micError || recorder.error) && !notConfigured && (
              <p role="alert" className="font-medium text-danger">
                {micError ?? recorder.error}
              </p>
            )}
          </div>
          <p className={cn("shrink-0 text-xs", remaining <= 20 ? "font-semibold text-warning" : "text-muted")} aria-label={`${text.length} of ${MESSAGE_MAX} characters used`}>
            {text.length}/{MESSAGE_MAX}
          </p>
        </div>
      </form>
    </div>
  );
}
