"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Keyboard, Loader2, Mic, Square } from "lucide-react";
import { AiNotConfigured } from "@/components/ai/AiNotConfigured";
import { RecordingStatus } from "@/components/ai/RecordingStatus";
import { Button, buttonStyles } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { SelectField } from "@/components/forms/Fields";
import { QUICK_SALE_HREF } from "@/components/layout/nav";
import { DraftReview } from "./DraftReview";
import { validateRecording, voiceErrorMessage } from "@/lib/ai/audio";
import { SPEECH_LANGUAGE_OPTIONS, useVoiceLanguage } from "@/lib/ai/language";
import { useAiCapability, useParseVoiceAudio, useParseVoiceText } from "@/lib/hooks/useAi";
import { useAudioRecorder, type RecordedAudio } from "@/lib/hooks/useAudioRecorder";
import type { SpeechLanguage, VoiceDraft } from "@/types/ai";

type Step = { name: "record" } | { name: "understanding" } | { name: "review"; draft: VoiceDraft; version: number };

export function VoiceSale() {
  const [step, setStep] = useState<Step>({ name: "record" });
  const [problem, setProblem] = useState<string | null>(null);
  const [recheckError, setRecheckError] = useState<string | null>(null);
  const [language, setLanguage] = useVoiceLanguage();
  const capability = useAiCapability("speech");
  const parseAudio = useParseVoiceAudio();
  const parseText = useParseVoiceText();
  // Bumped when the merchant cancels, so a slow answer for an abandoned recording is ignored.
  const attempt = useRef(0);

  const upload = async ({ blob }: RecordedAudio) => {
    const tooBig = validateRecording(blob);
    if (tooBig) {
      setProblem(tooBig);
      return;
    }
    const mine = ++attempt.current;
    setProblem(null);
    setStep({ name: "understanding" });
    try {
      const draft = await parseAudio.mutateAsync({ audio: blob, language });
      if (mine === attempt.current) setStep({ name: "review", draft, version: 0 });
    } catch (error) {
      if (mine !== attempt.current) return;
      setProblem(voiceErrorMessage(error));
      setStep({ name: "record" });
    }
  };

  const recorder = useAudioRecorder({ onComplete: upload });

  const cancelUnderstanding = () => {
    attempt.current += 1;
    setStep({ name: "record" });
  };

  const startOver = () => {
    attempt.current += 1;
    setProblem(null);
    setRecheckError(null);
    setStep({ name: "record" });
  };

  const recheck = async (draft: VoiceDraft, version: number, transcript: string) => {
    setRecheckError(null);
    try {
      const next = await parseText.mutateAsync({ interactionId: draft.interactionId, transcript });
      setStep({ name: "review", draft: next, version: version + 1 });
    } catch (error) {
      setRecheckError(voiceErrorMessage(error));
    }
  };

  if (step.name === "review") {
    return (
      <DraftReview
        key={`${step.draft.interactionId}-${step.version}`}
        draft={step.draft}
        rechecking={parseText.isPending}
        recheckError={recheckError}
        onRecheck={(transcript) => recheck(step.draft, step.version, transcript)}
        onStartOver={startOver}
      />
    );
  }

  if (step.name === "understanding") {
    return (
      <Card className="mx-auto max-w-xl space-y-4 text-center">
        <p role="status" aria-live="polite" className="flex items-center justify-center gap-2 text-lg font-semibold">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Understanding…
        </p>
        <p className="text-sm text-muted">Turning your voice into a draft sale. This usually takes a few seconds.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={cancelUnderstanding}>
            Cancel
          </Button>
          <Link href={QUICK_SALE_HREF} className={buttonStyles("secondary")}>
            Type instead
          </Link>
        </div>
      </Card>
    );
  }

  const blocked = capability.checking || capability.notConfigured || !recorder.supported;
  const recording = recorder.isRecording;

  return (
    <Card className="mx-auto max-w-xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Say what the customer bought</h2>
        <p className="mt-1 text-sm text-muted">
          For example: “2 kilo chini aur ek packet maggi, Ramesh ko udhaar”. You will check everything before anything is saved.
        </p>
      </div>

      {capability.notConfigured && <AiNotConfigured>You can still record a sale by typing it.</AiNotConfigured>}
      {capability.statusFailed && (
        <p className="text-xs text-muted">We could not check whether voice is set up. You can still try.</p>
      )}
      {!capability.notConfigured && recorder.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {recorder.error}
        </p>
      )}
      {problem && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {problem}
        </p>
      )}

      <div className="flex flex-col items-center gap-3">
        {recording ? (
          <button
            type="button"
            onClick={recorder.stop}
            aria-label="Stop recording"
            className="flex h-28 w-28 items-center justify-center rounded-full bg-danger text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy-700"
          >
            <Square className="h-10 w-10 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={recorder.start}
            disabled={blocked || recorder.status === "requesting"}
            aria-label="Speak a sale"
            className="flex h-28 w-28 items-center justify-center rounded-full bg-navy-900 text-white shadow-lg hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mic className="h-12 w-12" aria-hidden />
          </button>
        )}
        <p className="text-sm font-medium">{recording ? "Tap to stop" : "Tap the mic and speak"}</p>
        <RecordingStatus status={recorder.status} secondsLeft={recorder.secondsLeft} maxSeconds={recorder.maxSeconds} className="min-h-10 w-full max-w-xs" />
        <p className="text-xs text-muted">Recording stops by itself after {recorder.maxSeconds} seconds. Audio is not kept.</p>
      </div>

      <SelectField
        label="Language you will speak"
        value={language}
        disabled={recorder.isBusy}
        onChange={(e) => setLanguage(e.target.value as SpeechLanguage)}
        options={SPEECH_LANGUAGE_OPTIONS}
      />

      <Link href={QUICK_SALE_HREF} className={buttonStyles("secondary", "w-full")}>
        <Keyboard className="h-4 w-4" aria-hidden /> Type instead
      </Link>
    </Card>
  );
}
