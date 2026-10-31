import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { fail, mockApi, ok, page, product, renderWithProviders } from "@/test/utils";

afterEach(() => vi.unstubAllGlobals());

const rice = { id: "p-9", name: "Rice (loose)", unit: "KG" as const, stockQuantity: 10 };

describe("AdjustStockDialog", () => {
  it("validates stock-in quantities (must be positive)", async () => {
    mockApi({});
    renderWithProviders(<AdjustStockDialog open onClose={() => {}} product={rice} />);
    expect(screen.getByText("Current stock: 10 kg")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add stock" }));
    expect(await screen.findByText("Quantity is required")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Quantity received"), "-3");
    await userEvent.click(screen.getByRole("button", { name: "Add stock" }));
    expect(await screen.findByText("Quantity must be greater than 0")).toBeInTheDocument();
  });

  it("sends a signed adjustment with a reason and note, and rejects zero", async () => {
    const bodies: unknown[] = [];
    mockApi({
      "POST /api/v1/inventory/adjustments": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)));
        return ok({}, 201);
      },
    });
    const onClose = vi.fn();
    renderWithProviders(<AdjustStockDialog open onClose={onClose} product={rice} />);
    await userEvent.click(screen.getByLabelText("Adjustment"));
    expect(screen.queryByLabelText("Quantity received")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Quantity change"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Save adjustment" }));
    expect(await screen.findByText("Quantity cannot be zero")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Quantity change"));
    await userEvent.type(screen.getByLabelText("Quantity change"), "-2.5");
    await userEvent.selectOptions(screen.getByLabelText("Reason"), "DAMAGE");
    await userEvent.type(screen.getByLabelText(/Note/), "Torn bag");
    await userEvent.click(screen.getByRole("button", { name: "Save adjustment" }));
    await waitFor(() =>
      expect(bodies).toEqual([{ productId: "p-9", type: "ADJUSTMENT", quantity: -2.5, reason: "DAMAGE", note: "Torn bag" }]),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("maps INSUFFICIENT_STOCK onto the quantity field and keeps the dialog open", async () => {
    mockApi({
      "POST /api/v1/inventory/adjustments": () =>
        fail(409, "INSUFFICIENT_STOCK", "Not enough stock", [{ field: "quantity", message: "Only 10 kg in stock" }]),
    });
    const onClose = vi.fn();
    renderWithProviders(<AdjustStockDialog open onClose={onClose} product={rice} defaultKind="ADJUSTMENT" />);
    await userEvent.type(screen.getByLabelText("Quantity change"), "-50");
    await userEvent.click(screen.getByRole("button", { name: "Save adjustment" }));
    expect(await screen.findByText("Only 10 kg in stock")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity change")).toHaveAttribute("aria-invalid", "true");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("asks for a product when none is fixed", async () => {
    const bodies: unknown[] = [];
    mockApi({
      "GET /api/v1/products": () => ok(page([product({ id: "p-1", name: "Amul Taaza Milk" })])),
      "POST /api/v1/inventory/adjustments": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)));
        return ok({}, 201);
      },
    });
    renderWithProviders(<AdjustStockDialog open onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText("Quantity received"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Add stock" }));
    expect(await screen.findByText("Choose a product")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Product"));
    await userEvent.click(await screen.findByRole("button", { name: /Amul Taaza Milk/ }));
    await userEvent.click(screen.getByRole("button", { name: "Add stock" }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(within(screen.getByRole("dialog")).getByText("Amul Taaza Milk")).toBeInTheDocument();
  });
});
