import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InventoryTabs } from "./InventoryTabs";

const pathname = vi.hoisted(() => ({ value: "/inventory" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

describe("InventoryTabs", () => {
  it("links the three inventory routes and marks the current one", () => {
    pathname.value = "/inventory/overview";
    render(<InventoryTabs />);
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/inventory");
    expect(screen.getByRole("link", { name: "Stock overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Movements" })).toHaveAttribute("href", "/inventory/movements");
    expect(screen.getByRole("link", { name: "Products" })).not.toHaveAttribute("aria-current");
  });
});
