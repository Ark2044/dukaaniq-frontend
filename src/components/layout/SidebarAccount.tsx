"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { useSession } from "@/components/auth/AuthProvider";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/common/Badge";
import { isActive } from "./nav";
import { cn } from "@/lib/utils/format";

/** Desktop sidebar footer: who is signed in, settings and logout. */
export function SidebarAccount() {
  const { merchant, user } = useSession();
  const pathname = usePathname();
  const active = isActive(pathname, "/settings");
  return (
    <div className="border-t border-line p-3">
      <div className="px-3 pb-2 pt-1">
        <p className="truncate text-sm font-semibold">{merchant.shopName}</p>
        <p className="truncate text-xs text-muted">{user.name}</p>
        {merchant.demo && (
          <div className="mt-1.5">
            <Badge tone="warning">Demo data</Badge>
          </div>
        )}
      </div>
      <Link
        href="/settings"
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",
          active ? "bg-navy-900 text-white" : "text-navy-900 hover:bg-background",
        )}
      >
        <Settings className="h-5 w-5" aria-hidden /> Settings
      </Link>
      <LogoutButton variant="ghost" className="mt-1 min-h-11 w-full justify-start px-3 font-medium" />
    </div>
  );
}
