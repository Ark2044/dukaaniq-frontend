"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { CONTROL_CLASSES } from "@/components/forms/Fields";
import { MAX_ALIASES, MAX_ALIAS_LENGTH } from "@/lib/validation/product";
import { cn } from "@/lib/utils/format";

interface AliasEditorProps {
  value: string[];
  onChange: (aliases: string[]) => void;
  error?: string;
}

/** Lets the merchant add local names (e.g. "doodh", "दूध") that voice and text search will match. */
export function AliasEditor({ value, onChange, error }: AliasEditorProps) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const add = () => {
    const alias = draft.trim();
    if (!alias) return;
    if (alias.length > MAX_ALIAS_LENGTH) {
      setLocalError(`Aliases must be at most ${MAX_ALIAS_LENGTH} characters`);
    } else if (value.length >= MAX_ALIASES) {
      setLocalError(`You can add at most ${MAX_ALIASES} aliases`);
    } else if (value.some((existing) => existing.toLowerCase() === alias.toLowerCase())) {
      setLocalError("That alias is already added");
    } else {
      onChange([...value, alias]);
      setDraft("");
      setLocalError(null);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter adds the alias; it must not submit the surrounding product form.
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  };

  const message = localError ?? error;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
        Aliases
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setLocalError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="e.g. doodh, दूध"
          aria-invalid={message ? true : undefined}
          aria-describedby={`${inputId}-help`}
          className={cn(CONTROL_CLASSES, message ? "border-danger" : "border-line")}
        />
        <Button variant="secondary" onClick={add} aria-label="Add alias" className="shrink-0 px-4">
          <Plus className="h-4 w-4" aria-hidden /> Add
        </Button>
      </div>
      <p id={`${inputId}-help`} className="mt-1.5 text-xs text-muted">
        Other names customers use for this product. Up to {MAX_ALIASES}.
      </p>
      {message && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {message}
        </p>
      )}
      {value.length > 0 && (
        <ul aria-label="Added aliases" className="mt-3 flex flex-wrap gap-2">
          {value.map((alias) => (
            <li
              key={alias}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-background pl-3 pr-1 text-sm"
            >
              {alias}
              <button
                type="button"
                onClick={() => onChange(value.filter((a) => a !== alias))}
                aria-label={`Remove alias ${alias}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-danger"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
