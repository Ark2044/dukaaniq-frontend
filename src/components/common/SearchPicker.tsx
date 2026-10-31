"use client";

import { useId, useState } from "react";
import { Search, X } from "lucide-react";
import { CONTROL_CLASSES } from "@/components/forms/Fields";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { cn } from "@/lib/utils/format";

export interface PickerOption {
  id: string;
  label: string;
  description?: string;
}

export interface PickerResult {
  options: PickerOption[];
  isFetching: boolean;
  isError: boolean;
}

interface SearchPickerProps {
  label: string;
  placeholder: string;
  value: PickerOption | null;
  onChange: (value: PickerOption | null) => void;
  /** Called with the debounced, trimmed search text; `enabled` is false while the list is closed. */
  useOptions: (query: string, enabled: boolean) => PickerResult;
  emptyText?: string;
}

/** Type-to-search single select used where a plain <select> would be unusable (many customers / products). */
export function SearchPicker({ label, placeholder, value, onChange, useOptions, emptyText = "No matches" }: SearchPickerProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const query = useDebouncedValue(text.trim(), 300);
  const { options, isFetching, isError } = useOptions(query, open);

  if (value) {
    return (
      <div>
        <span id={`${id}-label`} className="mb-1.5 block text-sm font-medium">
          {label}
        </span>
        <div className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-line bg-surface pl-3">
          <span aria-labelledby={`${id}-label`} className="truncate text-base">
            {value.label}
          </span>
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => {
              onChange(null);
              setText("");
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center text-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-3 top-[2.9rem] h-4 w-4 text-muted" aria-hidden />
      <input
        id={id}
        type="search"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        className={cn(CONTROL_CLASSES, "border-line pl-9")}
      />
      {open && (
        <ul
          aria-label={`${label} results`}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-lg"
        >
          {isError ? (
            <li className="px-3 py-3 text-sm text-danger">Could not search. Try again.</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">{isFetching ? "Searching…" : emptyText}</li>
          ) : (
            options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setText("");
                  }}
                  className="flex min-h-12 w-full flex-col justify-center px-3 py-2 text-left hover:bg-background"
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  {option.description && <span className="text-xs text-muted">{option.description}</span>}
                </button>
              </li>
            ))
          )}
          <li className="border-t border-line">
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 w-full px-3 text-left text-xs text-muted">
              Close list
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
