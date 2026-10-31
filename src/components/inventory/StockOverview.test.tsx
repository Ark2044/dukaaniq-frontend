import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StockOverview } from "./StockOverview";
import { fail, mockApi, ok, renderWithProviders } from "@/test/utils";
import { inventorySummary } from "@/test/m3Fixtures";

afterEach(() => vi.unstubAllGlobals());

describe("StockOverview", () => {
  it("shows counts and never presents stock value as total business value", async () => {
    mockApi({ "GET /api/v1/inventory/summary": () => ok(inventorySummary()) });
    renderWithProviders(<StockOverview />);
    expect(screen.getByTestId("overview-loading")).toBeInTheDocument();
    const summary = within(await screen.findByLabelText("Stock summary"));
    expect(summary.getByText("26")).toBeInTheDocument();
    expect(summary.getByText("24 active")).toBeInTheDocument();
    expect(summary.getByText("₹41,250")).toBeInTheDocument();
    expect(summary.getByText("Based on 20 of 24 products that have a cost price")).toBeInTheDocument();
    expect(summary.getByText("Stock value at cost")).toBeInTheDocument();
    expect(screen.queryByText(/total (business|inventory) value/i)).not.toBeInTheDocument();
  });

  it("lists low-stock items with an Add stock action that opens the stock-in dialog", async () => {
    const bodies: unknown[] = [];
    mockApi({
      "GET /api/v1/inventory/summary": () => ok(inventorySummary()),
      "POST /api/v1/inventory/adjustments": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)));
        return ok({}, 201);
      },
    });
    renderWithProviders(<StockOverview />);
    expect(await screen.findByRole("link", { name: "Rice (loose)" })).toHaveAttribute("href", "/inventory/p-9");
    expect(screen.getByText(/reorder at 25/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add stock for Rice (loose)" }));
    const dialog = screen.getByRole("dialog", { name: /Rice \(loose\)/ });
    await userEvent.type(within(dialog).getByLabelText("Quantity received"), "20");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add stock" }));
    await waitFor(() => expect(bodies).toEqual([{ productId: "p-9", type: "PURCHASE", quantity: 20, reason: "PURCHASE" }]));
  });

  it("shows a friendly state when nothing is low and an error state with retry", async () => {
    let failing = true;
    mockApi({
      "GET /api/v1/inventory/summary": () =>
        failing ? fail(500, "INTERNAL_ERROR", "Down") : ok(inventorySummary({ lowStockItems: [], lowStockCount: 0 })),
    });
    renderWithProviders(<StockOverview />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Down");
    failing = false;
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Nothing is running low")).toBeInTheDocument();
  });
});
