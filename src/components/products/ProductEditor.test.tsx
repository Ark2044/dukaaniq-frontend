import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductEditor } from "./ProductEditor";
import { fail, mockApi, ok, page, product, renderWithProviders } from "@/test/utils";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/inventory/p-1" }));

beforeEach(() => router.push.mockClear());
afterEach(() => vi.unstubAllGlobals());

const base = {
  "GET /api/v1/products/categories": () => ok(["Dairy"]),
  "GET /api/v1/products": () => ok(page([product()])),
};

describe("ProductEditor", () => {
  it("shows not-found for an unknown product", async () => {
    mockApi({ ...base, "GET /api/v1/products/p-1": () => fail(404, "NOT_FOUND", "Product not found") });
    renderWithProviders(<ProductEditor id="p-1" />);
    expect(await screen.findByText("Product not found", { selector: "h2" })).toBeInTheDocument();
  });

  it("saves edits with PUT (no stockQuantity) and confirms with a toast", async () => {
    const bodies: Record<string, unknown>[] = [];
    mockApi({
      ...base,
      "GET /api/v1/products/p-1": () => ok(product()),
      "PUT /api/v1/products/p-1": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)));
        return ok(product({ sellingPrice: 31, updatedAt: "2026-11-01T00:00:00Z" }));
      },
    });
    renderWithProviders(<ProductEditor id="p-1" />);
    const price = await screen.findByLabelText("Selling price (₹)");
    await userEvent.clear(price);
    await userEvent.type(price, "31");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Product updated.")).toBeInTheDocument();
    expect(bodies[0]).toMatchObject({ sellingPrice: 31, active: true, aliases: ["doodh"] });
    expect(bodies[0]).not.toHaveProperty("stockQuantity");
  });

  it("deactivates only after confirmation", async () => {
    const deletes = vi.fn();
    mockApi({
      ...base,
      "GET /api/v1/products/p-1": () => ok(product()),
      "DELETE /api/v1/products/p-1": () => {
        deletes();
        return ok(product({ active: false }));
      },
    });
    renderWithProviders(<ProductEditor id="p-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Deactivate" }));
    expect(deletes).not.toHaveBeenCalled();

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/inventory"));
    expect(deletes).toHaveBeenCalledTimes(1);
  });

  it("can be cancelled without deactivating", async () => {
    const deletes = vi.fn();
    mockApi({ ...base, "GET /api/v1/products/p-1": () => ok(product()), "DELETE /api/v1/products/p-1": () => (deletes(), ok(product())) });
    renderWithProviders(<ProductEditor id="p-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Deactivate" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(deletes).not.toHaveBeenCalled();
  });
});
