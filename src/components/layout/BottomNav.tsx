"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { BOTTOM_LEFT_ITEMS, BOTTOM_RIGHT_ITEMS, MORE_ITEMS, QUICK_SALE_HREF, isActive, isMoreActive, isQuickSale, type NavItem } from "./nav";
import { cn } from "@/lib/utils/format";

const ITEM_CLASSES = "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-center text-[11px] font-medium leading-tight";

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = isMoreActive(pathname);

  const renderItem = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(pathname, href);
    return (
      <li key={href} className="flex-1">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(ITEM_CLASSES, active ? "text-navy-900" : "text-muted")}
        >
          <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} aria-hidden />
          {label}
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-end">
          {BOTTOM_LEFT_ITEMS.map(renderItem)}
          <li className="flex flex-1 justify-center">
            <Link
              href={QUICK_SALE_HREF}
              aria-label="Quick sale"
              aria-current={isQuickSale(pathname) ? "page" : undefined}
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-white shadow-lg ring-4 ring-background"
            >
              <Plus className="h-7 w-7" aria-hidden />
            </Link>
          </li>
          {BOTTOM_RIGHT_ITEMS.map(renderItem)}
          <li className="flex-1">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
              className={cn(ITEM_CLASSES, moreActive ? "text-navy-900" : "text-muted")}
            >
              <MoreHorizontal className={cn("h-5 w-5", moreActive && "stroke-[2.5]")} aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>
      <Modal open={moreOpen} title="More" onClose={() => setMoreOpen(false)}>
        <ul className="space-y-1">
          {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex min-h-14 items-center gap-3 rounded-xl px-3 text-base font-medium",
                    active ? "bg-navy-900 text-white" : "text-navy-900 hover:bg-background",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
