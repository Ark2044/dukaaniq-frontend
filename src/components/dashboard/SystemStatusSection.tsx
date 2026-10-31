"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SystemStatus } from "./SystemStatus";
import { cn } from "@/lib/utils/format";

/** System status is diagnostic, so it stays collapsed (and is not even requested) until opened. */
export function SystemStatusSection() {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="System status">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="system-status-panel"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between rounded-xl px-1 text-sm font-semibold text-muted hover:text-navy-900"
      >
        System status
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <div id="system-status-panel" hidden={!open} className="mt-2">
        {open && <SystemStatus />}
      </div>
    </section>
  );
}
