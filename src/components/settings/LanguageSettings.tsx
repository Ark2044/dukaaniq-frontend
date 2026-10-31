"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useAuth, useSession } from "@/components/auth/AuthProvider";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { useToast } from "@/components/common/Toast";
import { FormAlert } from "@/components/forms/FormAlert";
import { updateMerchantProfile } from "@/lib/api/merchant";
import { LANGUAGE_OPTIONS } from "@/lib/constants/options";
import { merchantToFormValues, toMerchantProfileInput } from "@/lib/validation/merchant";
import { cn } from "@/lib/utils/format";
import type { Language } from "@/types/merchant";

export function LanguageSettings() {
  const { merchant } = useSession();
  const { setMerchant } = useAuth();
  const toast = useToast();
  const [selected, setSelected] = useState<Language>(merchant.preferredLanguage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // PUT replaces the whole profile, so resend every current field with only the language changed.
      const updated = await updateMerchantProfile({
        ...toMerchantProfileInput(merchantToFormValues(merchant)),
        preferredLanguage: selected,
      });
      setMerchant(updated);
      toast.success("Language preference saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your language.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold">Language</h2>
      <p className="mb-5 mt-1 text-sm text-muted">Choose the language you prefer to use with DukaanIQ.</p>
      <div className="space-y-4">
        <FormAlert message={error} />
        <div role="radiogroup" aria-label="Preferred language" className="grid gap-3 sm:grid-cols-3">
          {LANGUAGE_OPTIONS.map((option) => {
            const checked = selected === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 text-base font-medium",
                  checked ? "border-navy-900 bg-background" : "border-line bg-surface",
                )}
              >
                <input
                  type="radio"
                  name="preferredLanguage"
                  value={option.value}
                  checked={checked}
                  onChange={() => setSelected(option.value)}
                  className="sr-only"
                />
                {option.label}
                {checked && <Check className="h-4 w-4" aria-hidden />}
              </label>
            );
          })}
        </div>
        <Button onClick={save} loading={saving} disabled={selected === merchant.preferredLanguage} className="w-full sm:w-auto">
          Save language
        </Button>
      </div>
    </Card>
  );
}
