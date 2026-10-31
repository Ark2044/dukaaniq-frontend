"use client";

import { Check } from "lucide-react";
import { Card } from "@/components/common/Card";
import { AI_LANGUAGE_OPTIONS, useAdvisorLanguage } from "@/lib/ai/language";
import { cn } from "@/lib/utils/format";
import type { AiLanguage } from "@/types/ai";

/** Applies on this device only; it is the same choice as the language selector on the Advisor page. */
export function AdvisorLanguageSettings() {
  const [language, setLanguage] = useAdvisorLanguage();

  return (
    <Card>
      <h2 className="text-lg font-semibold">Advisor language</h2>
      <p className="mb-5 mt-1 text-sm text-muted">
        The language the Advisor answers and speaks in. It is remembered on this device.
      </p>
      <div role="radiogroup" aria-label="Advisor language" className="grid gap-3 sm:grid-cols-3">
        {AI_LANGUAGE_OPTIONS.map((option) => {
          const checked = language === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 text-base font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy-700",
                checked ? "border-navy-900 bg-background" : "border-line bg-surface",
              )}
            >
              <input
                type="radio"
                name="advisorLanguage"
                value={option.value}
                checked={checked}
                onChange={() => setLanguage(option.value as AiLanguage)}
                className="sr-only"
              />
              {option.label}
              {checked && <Check className="h-4 w-4" aria-hidden />}
            </label>
          );
        })}
      </div>
    </Card>
  );
}
