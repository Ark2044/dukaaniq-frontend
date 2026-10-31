"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils/format";

export const CONTROL_CLASSES =
  "min-h-12 w-full rounded-xl border bg-surface px-3 text-base text-foreground placeholder:text-muted/70 disabled:cursor-not-allowed disabled:bg-background disabled:text-muted";

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}

function FieldShell({ id, label, error, hint, optional, children }: FieldShellProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {optional && <span className="text-xs text-muted">Optional</span>}
      </div>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

interface TextFieldProps extends ComponentProps<"input"> {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  endAdornment?: ReactNode;
}

export function TextField({ label, error, hint, optional, endAdornment, id, className, ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint} optional={optional}>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, error, hint)}
          className={cn(CONTROL_CLASSES, error ? "border-danger" : "border-line", endAdornment ? "pr-12" : undefined, className)}
          {...rest}
        />
        {endAdornment && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{endAdornment}</div>}
      </div>
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<ComponentProps<"select">, "children"> {
  label: string;
  options: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>;
  error?: string;
  hint?: string;
  optional?: boolean;
}

export function SelectField({ label, options, error, hint, optional, id, className, ...rest }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <FieldShell id={selectId} label={label} error={error} hint={hint} optional={optional}>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(selectId, error, hint)}
        className={cn(CONTROL_CLASSES, error ? "border-danger" : "border-line", className)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
