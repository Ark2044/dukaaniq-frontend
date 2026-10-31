"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/format";

export const INVENTORY_TABS = [
  { href: "/inventory", label: "Products" },
  { href: "/inventory/overview", label: "Stock overview" },
  { href: "/inventory/movements", label: "Movements" },
] as const;

/** Segmented navigation across the inventory area; each tab is its own route. */
export function InventoryTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Inventory sections" className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-background p-1">
      {INVENTORY_TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-medium",
              active ? "bg-surface text-navy-900 shadow-sm" : "text-muted hover:text-navy-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
