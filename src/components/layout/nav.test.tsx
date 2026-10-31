import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { isActive } from "./nav";

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

describe("isActive", () => {
  it("matches home only exactly and sections by prefix", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/sales", "/")).toBe(false);
    expect(isActive("/sales/abc-123", "/sales")).toBe(true);
    expect(isActive("/sales/new", "/sales")).toBe(false);
    expect(isActive("/inventory/overview", "/inventory")).toBe(true);
    expect(isActive("/salesforce", "/sales")).toBe(false);
  });
});

describe("navigation", () => {
  it("sidebar lists every section and marks the current page", () => {
    pathname.value = "/inventory";
    render(<Sidebar />);
    for (const label of ["Home", "Sales", "Inventory", "Payments", "Advisor"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Inventory" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("bottom nav exposes a prominent quick-sale action", () => {
    pathname.value = "/";
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "Quick sale" })).toHaveAttribute("href", "/sales/new");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });

  it("keeps the phone bar short: Payments and Settings live under More", async () => {
    pathname.value = "/";
    render(<BottomNav />);
    expect(screen.queryByRole("link", { name: "Customers" })).not.toBeInTheDocument();
    for (const label of ["Home", "Sales", "Inventory", "Advisor"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Advisor" })).toHaveAttribute("href", "/ai");
    expect(screen.queryByRole("link", { name: "Payments" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "More" }));
    const dialog = screen.getByRole("dialog", { name: "More" });
    expect(within(dialog).getByRole("link", { name: "Payments" })).toHaveAttribute("href", "/payments");
    expect(within(dialog).getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");

    await userEvent.click(within(dialog).getByRole("link", { name: "Payments" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("highlights More when a page inside it is open, and Quick sale on the voice route", () => {
    pathname.value = "/payments";
    const { unmount } = render(<BottomNav />);
    expect(screen.getByRole("button", { name: "More" }).className).toContain("text-navy-900");
    unmount();

    pathname.value = "/sales/voice";
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "Quick sale" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Sales" })).not.toHaveAttribute("aria-current");
  });

  it("highlights Payments on its sub-pages", () => {
    pathname.value = "/payments/reconciliation";
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute("href", "/payments");
  });

  it("lights up the quick-sale button, not Sales, on /sales/new", () => {
    pathname.value = "/sales/new";
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "Quick sale" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Sales" })).not.toHaveAttribute("aria-current");
  });

  it("sidebar quick sale points at /sales/new", () => {
    pathname.value = "/sales/s-1";
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Quick sale" })).toHaveAttribute("href", "/sales/new");
    expect(screen.getByRole("link", { name: "Sales" })).toHaveAttribute("aria-current", "page");
  });
});
