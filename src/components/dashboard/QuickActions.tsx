import Link from "next/link";
import { Bot, Mic, Plus } from "lucide-react";
import { QUICK_SALE_HREF, VOICE_SALE_HREF } from "@/components/layout/nav";

const ACTION =
  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface px-2 text-center text-sm font-semibold hover:bg-background";

export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-3 gap-3">
      <Link href={QUICK_SALE_HREF} className={ACTION}>
        <Plus className="h-5 w-5" aria-hidden /> Quick sale
      </Link>
      <Link href={VOICE_SALE_HREF} className={ACTION}>
        <Mic className="h-5 w-5" aria-hidden /> Speak a sale
      </Link>
      <Link href="/ai" className={ACTION}>
        <Bot className="h-5 w-5" aria-hidden /> Ask advisor
      </Link>
    </nav>
  );
}
