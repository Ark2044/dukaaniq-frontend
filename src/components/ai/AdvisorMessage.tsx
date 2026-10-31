"use client";

import { useId, useState } from "react";
import { ChevronDown, Loader2, Square, Volume2 } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { cn } from "@/lib/utils/format";
import type { PlaybackState } from "@/lib/hooks/useSpeechPlayer";
import type { ChatReply } from "@/types/ai";

export interface UserMessage {
  id: string;
  role: "user";
  text: string;
}

export interface AssistantMessage {
  id: string;
  role: "assistant";
  reply: ChatReply;
}

export interface ErrorMessage {
  id: string;
  role: "error";
  text: string;
  question: string;
}

export type ChatMessage = UserMessage | AssistantMessage | ErrorMessage;

interface ListenProps {
  state: PlaybackState | null;
  error: string | null;
  disabledReason: string | null;
  onPlay: () => void;
  onStop: () => void;
}

function ListenButton({ state, error, disabledReason, onPlay, onStop }: ListenProps) {
  const busy = state === "loading";
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={state ? onStop : onPlay}
        disabled={disabledReason !== null}
        title={disabledReason ?? undefined}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : state === "playing" ? (
          <Square className="h-4 w-4 fill-current" aria-hidden />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden />
        )}
        {busy ? "Preparing audio… (tap to cancel)" : state === "playing" ? "Stop" : "Listen"}
      </button>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function SourceBadge({ reply }: { reply: ChatReply }) {
  return reply.source === "AI" ? (
    <Badge tone="success">AI (checked against your data)</Badge>
  ) : (
    <Badge tone="neutral">From your records</Badge>
  );
}

interface AdvisorMessageProps {
  message: ChatMessage;
  listen: Pick<ListenProps, "state" | "error" | "disabledReason">;
  onPlay: (id: string, text: string) => void;
  onStop: () => void;
  onRetry: (question: string) => void;
  retryDisabled: boolean;
}

export function AdvisorMessage({ message, listen, onPlay, onStop, onRetry, retryDisabled }: AdvisorMessageProps) {
  const factsId = useId();
  const [showFacts, setShowFacts] = useState(false);

  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-navy-900 px-4 py-3 text-base text-white">{message.text}</p>
      </li>
    );
  }

  if (message.role === "error") {
    return (
      <li className="flex justify-start">
        <div role="alert" className="max-w-[90%] space-y-2 rounded-2xl rounded-bl-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p className="font-medium">{message.text}</p>
          <button
            type="button"
            onClick={() => onRetry(message.question)}
            disabled={retryDisabled}
            className="min-h-11 rounded-lg border border-danger/40 bg-surface px-3 font-medium disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      </li>
    );
  }

  const { reply } = message;
  return (
    <li className="flex justify-start" lang={reply.language}>
      <article aria-label="Advisor answer" className="max-w-[92%] space-y-3 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3">
        <div>
          <SourceBadge reply={reply} />
        </div>
        <p className="whitespace-pre-wrap text-base">{reply.answer}</p>
        {reply.notes.length > 0 && (
          <ul aria-label="Notes" className="list-disc space-y-1 pl-5 text-sm text-warning">
            {reply.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        {reply.facts.length > 0 && (
          <div>
            <button
              type="button"
              aria-expanded={showFacts}
              aria-controls={factsId}
              onClick={() => setShowFacts((open) => !open)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-navy-700 hover:underline"
            >
              Based on ({reply.facts.length})
              <ChevronDown className={cn("h-4 w-4 transition-transform", showFacts && "rotate-180")} aria-hidden />
            </button>
            {showFacts && (
              <dl id={factsId} className="mt-1 divide-y divide-line rounded-xl bg-background px-3 text-sm">
                {reply.facts.map((fact) => (
                  <div key={`${fact.label}-${fact.value}`} className="flex justify-between gap-4 py-2">
                    <dt className="text-muted">{fact.label}</dt>
                    <dd className="text-right font-semibold">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
        <ListenButton
          state={listen.state}
          error={listen.error}
          disabledReason={listen.disabledReason}
          onPlay={() => onPlay(message.id, reply.answer)}
          onStop={onStop}
        />
      </article>
    </li>
  );
}
