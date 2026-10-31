import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickSale } from "./QuickSale";
import { fail, mockApi, ok, page, product, renderWithProviders } from "@/test/utils";
import { customer, sale } from "@/test/m3Fixtures";
import { paymentConfig, paymentView, pendingSale } from "@/test/m4Fixtures";

afterEach(() => vi.unstubAllGlobals());

const salt = product({ id: "p-salt", name: "Tata Salt", brand: "Tata", unit: "KG", sellingPrice: 28, stockQuantity: 40 });
const FUTURE = "2099-01-01T00:00:00Z";

interface SaleBody {
  clientRequestId: string;
  customerId?: string;
  items: Array<{ productId: string; quantity: number }>;
  payments: unknown[];
  collectViaPaytm?: boolean;
}

function setup(overrides: Record<string, () => Response> = {}) {
  const saleBodies: SaleBody[] = [];
  const qrBodies: unknown[] = [];
  const state = { sale: "PENDING_PAYMENT" as "PENDING_PAYMENT" | "COMPLETED" | "CANCELLED" };
  const saleFor = (status: typeof state.sale) =>
    pendingSale({
      id: "s-9",
      saleNumber: "S-000900",
      status,
      totalAmount: 28,
      subtotal: 28,
      netAmount: 28,
      dueAmount: status === "COMPLETED" ? 0 : 28,
      paidAmount: status === "COMPLETED" ? 28 : 0,
      paymentStatus: status === "COMPLETED" ? "PAID" : status === "CANCELLED" ? null : "UNPAID",
      cancelReason: status === "CANCELLED" ? "Paytm payment was not completed in time" : null,
    });
  const fn = mockApi({
    "GET /api/v1/products": () => ok(page([salt])),
    "GET /api/v1/customers": () => ok(page([customer()])),
    "POST /api/v1/sales": ({ init }) => {
      saleBodies.push(JSON.parse(String(init.body)));
      return ok(saleFor("PENDING_PAYMENT"), 201);
    },
    "GET /api/v1/sales/s-9": () => ok(saleFor(state.sale)),
    "GET /api/v1/payments/config": () => ok(paymentConfig()),
    "POST /api/v1/payments/paytm/qr": ({ init }) => {
      qrBodies.push(JSON.parse(String(init.body)));
      return ok(paymentView({ saleId: "s-9", saleNumber: "S-000900", amount: 28, expiresAt: FUTURE }), 201);
    },
    "GET /api/v1/payments/pay-1/status": () => ok(paymentView({ saleId: "s-9", amount: 28, expiresAt: FUTURE })),
    ...overrides,
  });
  renderWithProviders(<QuickSale />);
  return { fn, saleBodies, qrBodies, state };
}

const addSalt = async () => userEvent.click(await screen.findByRole("button", { name: "Add Tata Salt" }));
const choosePaytm = () => userEvent.click(screen.getByRole("radio", { name: "Paytm QR" }));
const confirmButton = () => screen.getByRole("button", { name: /Confirm and show QR|Saving sale/ });

describe("QuickSale — pay by Paytm QR", () => {
  it("disables manual payment amounts and relabels the button when Paytm QR is chosen", async () => {
    setup();
    await addSalt();
    await userEvent.click(screen.getByRole("button", { name: "Full amount in cash" }));
    expect(screen.getByLabelText("Amount (₹)")).toHaveValue("28");

    await choosePaytm();
    expect(screen.queryByLabelText("Amount (₹)")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Full amount in cash" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Full amount by UPI/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Add payment/ })).toBeDisabled();
    expect(screen.queryByText(/will be recorded as unpaid/)).not.toBeInTheDocument();
    expect(confirmButton()).toHaveTextContent("Confirm and show QR · ₹28");
    expect(confirmButton()).toBeEnabled();

    await userEvent.click(screen.getByRole("radio", { name: "Record payment now" }));
    expect(screen.getByRole("button", { name: "Full amount in cash" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Save sale/ })).toBeInTheDocument();
  });

  it("creates the sale with collectViaPaytm and no payments, then creates the QR for the returned sale id", async () => {
    const { saleBodies, qrBodies } = setup();
    await addSalt();
    await choosePaytm();
    await userEvent.click(confirmButton());

    const dialog = within(await screen.findByRole("dialog"));
    expect(await dialog.findByRole("img", { name: /QR code to pay ₹28/ })).toBeInTheDocument();
    expect(saleBodies).toHaveLength(1);
    expect(saleBodies[0].collectViaPaytm).toBe(true);
    expect(saleBodies[0].payments).toEqual([]);
    expect(saleBodies[0].items).toEqual([{ productId: "p-salt", quantity: 1 }]);
    expect(qrBodies).toEqual([{ saleId: "s-9" }]);
    expect(dialog.getByText("Demo mode — this QR is not a real payment")).toBeInTheDocument();
    expect(dialog.getByRole("status")).toHaveTextContent("Waiting for payment…");
  });

  it("needs no unpaid-walk-in confirmation, because the QR collects the whole amount", async () => {
    const { saleBodies } = setup();
    await addSalt();
    await choosePaytm();
    expect(confirmButton()).toBeEnabled();
    await userEvent.click(confirmButton());
    await screen.findByRole("dialog");
    expect(saleBodies[0].customerId).toBeUndefined();
  });

  it("completes: server says SUCCESS and COMPLETED, shows Paid with a toast and a New sale button", async () => {
    const { state } = setup({
      "POST /api/v1/payments/pay-1/simulate": () => ok(paymentView({ saleId: "s-9", amount: 28, status: "SUCCESS" })),
    });
    await addSalt();
    await choosePaytm();
    await userEvent.click(confirmButton());
    const dialog = within(await screen.findByRole("dialog"));

    state.sale = "COMPLETED";
    await userEvent.click(await dialog.findByRole("button", { name: "Simulate customer payment (demo)" }));
    await waitFor(() => expect(dialog.getByRole("status")).toHaveTextContent("Paid"));
    expect(dialog.getByRole("link", { name: "View sale" })).toHaveAttribute("href", "/sales/s-9");
    expect(await screen.findByText(/Paid — sale S-000900 is complete/)).toBeInTheDocument();

    await userEvent.click(dialog.getByRole("button", { name: "New sale" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Your cart is empty. Search above and tap a product to add it.")).toBeInTheDocument();
  });

  it("when the payment fails the sale is shown as cancelled and Start again brings the cart back with a fresh request id", async () => {
    const { state, saleBodies } = setup({
      "POST /api/v1/payments/pay-1/simulate": () => ok(paymentView({ saleId: "s-9", amount: 28, status: "FAILED" })),
    });
    await addSalt();
    await choosePaytm();
    await userEvent.click(confirmButton());
    const dialog = within(await screen.findByRole("dialog"));

    state.sale = "CANCELLED";
    await userEvent.click(await dialog.findByRole("button", { name: "Simulate failure (demo)" }));
    expect(await dialog.findByText(/Payment not received — this sale was cancelled and the stock was restored/)).toBeInTheDocument();

    await userEvent.click(dialog.getByRole("button", { name: "Start again" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tata Salt quantity")).toHaveValue("1");
    expect(screen.getByRole("radio", { name: "Paytm QR" })).toBeChecked();

    await userEvent.click(confirmButton());
    await waitFor(() => expect(saleBodies).toHaveLength(2));
    expect(saleBodies[1].clientRequestId).not.toBe(saleBodies[0].clientRequestId);
    expect(saleBodies[1].items).toEqual(saleBodies[0].items);
  });

  it("closing the QR keeps the sale visible as waiting, with Show QR and a note that it resolves by itself", async () => {
    setup();
    await addSalt();
    await choosePaytm();
    await userEvent.click(confirmButton());
    const dialog = within(await screen.findByRole("dialog"));
    await dialog.findByRole("img", { name: /QR code/ });
    expect(dialog.getByText(/cancelled automatically if it is not paid in time/)).toBeInTheDocument();

    const closeButtons = dialog.getAllByRole("button", { name: "Close" });
    await userEvent.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/Waiting for Paytm payment — this sale is not complete yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show QR/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View sale" })).toHaveAttribute("href", "/sales/s-9");
  });

  it("explains missing Paytm credentials and keeps the form: nothing was created", async () => {
    const { qrBodies } = setup({ "POST /api/v1/sales": () => fail(503, "PAYMENT_NOT_CONFIGURED", "Paytm not configured") });
    await addSalt();
    await choosePaytm();
    await userEvent.click(confirmButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(/Paytm QR is not set up for this shop yet.*Nothing was saved/);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(qrBodies).toHaveLength(0);
    expect(screen.getByLabelText("Tata Salt quantity")).toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });

  it("manual sales are unchanged: payments are sent and collectViaPaytm is not", async () => {
    const bodies: SaleBody[] = [];
    mockApi({
      "GET /api/v1/products": () => ok(page([salt])),
      "GET /api/v1/customers": () => ok(page([customer()])),
      "POST /api/v1/sales": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)));
        return ok(sale({ id: "s-1" }), 201);
      },
    });
    renderWithProviders(<QuickSale />);
    await addSalt();
    await userEvent.click(screen.getByRole("button", { name: "Full amount in cash" }));
    await userEvent.click(screen.getByRole("button", { name: /Save sale/ }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].payments).toEqual([{ method: "CASH", amount: 28 }]);
    expect(bodies[0]).not.toHaveProperty("collectViaPaytm");
  });
});
