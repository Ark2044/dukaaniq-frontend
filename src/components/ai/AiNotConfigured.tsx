import { KeyRound } from "lucide-react";
import type { ReactNode } from "react";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/ai/audio";

/** Honest notice shown instead of a mic that would only fail. */
export function AiNotConfigured({ children }: { children?: ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
      <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold">{NOT_CONFIGURED_MESSAGE}</p>
        {children && <p className="font-normal">{children}</p>}
      </div>
    </div>
  );
}
