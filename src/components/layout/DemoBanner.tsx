"use client";

import { FlaskConical } from "lucide-react";
import { useSession } from "@/components/auth/AuthProvider";

/** Always visible when the merchant is a synthetic demo account so demo numbers cannot pass for real ones. */
export function DemoBanner() {
  const { merchant } = useSession();
  if (!merchant.demo) return null;
  return (
    <div
      role="status"
      className="mb-6 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning"
    >
      <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
      <p>
        <strong className="font-bold uppercase tracking-wide">Demo data</strong> — this shop contains synthetic sample
        data, not real business records.
      </p>
    </div>
  );
}
