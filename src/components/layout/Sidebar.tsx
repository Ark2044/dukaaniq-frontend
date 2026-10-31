"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Store } from "lucide-react";
import type { ReactNode } from "react";
import { NAV_ITEMS, QUICK_SALE_HREF, isActive, isQuickSale } from "./nav";
import { cn } from "@/lib/utils/format";

export function Sidebar({ account }: { account?: ReactNode }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-line md:bg-surface">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white">
          <Store className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-lg font-semibold leading-tight">DukaanIQ</p>
          <p className="text-xs text-muted">Your shop&apos;s AI business partner</p>
        </div>
      </div>
      <div className="px-4">
        <Link
          href={QUICK_SALE_HREF}
          aria-current={isQuickSale(pathname) ? "page" : undefined}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-700"
        >
          <Plus className="h-4 w-4" aria-hidden /> Quick sale
        </Link>
      </div>
      <nav aria-label="Main" className="mt-4 flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                active ? "bg-navy-900 text-white" : "text-navy-900 hover:bg-background",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      {account}
    </aside>
  );
}
