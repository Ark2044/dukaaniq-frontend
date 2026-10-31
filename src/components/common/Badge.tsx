import { cn } from "@/lib/utils/format";

type Tone = "success" | "warning" | "danger" | "neutral";

const TONES: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-background text-muted",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[tone])}>
      {children}
    </span>
  );
}

/** Always shown for mock payment data so a simulated status can never pass for a verified live payment. */
export function SimulatedBadge() {
  return (
    <span
      title="Simulated data. This is not a real payment."
      className="inline-flex items-center rounded-full border border-warning/40 bg-warning-soft px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-warning"
    >
      Simulated
    </span>
  );
}
