"use client";

import Link from "next/link";
import { Settings, Store } from "lucide-react";
import { useSession } from "@/components/auth/AuthProvider";

export function MobileTopBar() {
  const { merchant } = useSession();
  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 md:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-white">
          <Store className="h-4 w-4" aria-hidden />
        </span>
        <p className="truncate text-base font-semibold">{merchant.shopName}</p>
      </div>
      <Link
        href="/settings"
        aria-label="Settings"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-navy-900 hover:bg-background"
      >
        <Settings className="h-5 w-5" aria-hidden />
      </Link>
    </header>
  );
}
