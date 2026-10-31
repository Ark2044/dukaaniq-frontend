import { Bot, Home, Package, Receipt, Settings, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/ai", label: "Advisor", icon: Bot },
];

const byHref = (href: string) => NAV_ITEMS.find((item) => item.href === href) as NavItem;

/** The phone's bottom bar keeps four daily destinations around the quick-sale button; the rest live under "More". */
export const BOTTOM_LEFT_ITEMS: NavItem[] = [byHref("/"), byHref("/sales")];
export const BOTTOM_RIGHT_ITEMS: NavItem[] = [byHref("/inventory"), byHref("/ai")];
export const MORE_ITEMS: NavItem[] = [
  byHref("/payments"),
  { href: "/settings", label: "Settings", icon: Settings },
];

export const QUICK_SALE_HREF = "/sales/new";
export const VOICE_SALE_HREF = "/sales/voice";

const startsWithSegment = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** True on the quick-sale and speak-a-sale screens, which have their own entry point rather than lighting up "Sales". */
export const isQuickSale = (pathname: string) =>
  startsWithSegment(pathname, QUICK_SALE_HREF) || startsWithSegment(pathname, VOICE_SALE_HREF);

export const isMoreActive = (pathname: string) => MORE_ITEMS.some((item) => isActive(pathname, item.href));

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/sales" && isQuickSale(pathname)) return false;
  return startsWithSegment(pathname, href);
}
