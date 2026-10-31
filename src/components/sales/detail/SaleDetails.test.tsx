import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaleDetails } from "./SaleDetails";
import { fail, mockApi, ok, renderWithProviders } from "@/test/utils";
import { sale, saleItem, salePayment } from "@/test/m3Fixtures";

afterEach(() => vi.unstubAllGlobals());

const SALE_URL = "GET /api/v1/sales/s-1";

describe("SaleDetails", () => {
  it("renders header, customer link, items, totals and manual payments", async () => {
    mockApi({ [SALE_URL]: () => ok(sale()) });
    renderWithProviders(<SaleDetails id="s-1" />);
    expect(await screen.findByRole("heading", { name: "S-000123" })).toBeInTheDocument();
    expect(screen.getByText("Ramesh Kulkarni")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ramesh Kulkarni" })).not.toBeInTheDocument();
    expect(screen.getByText("2 kg × ₹28")).toBeInTheDocument();
    const amounts = within(screen.getByLabelText("Sale amounts"));
    expect(amounts.getByText("Net amount")).toBeInTheDocument();
    expect(amounts.getByText("Due").nextSibling).toHaveTextContent("₹20");
    expect(screen.getByText("Recorded by you")).toBeInTheDocument();
    expect(screen.queryByText("Simulated")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified by Paytm")).not.toBeInTheDocument();
  });

  it("flags simulated provider payments and shows verified only when verified", async () => {
    mockApi({
      [SALE_URL]: () =>
        ok(
          sale({
            payments: [
              salePayment({ id: "a", method: "PAYTM", provider: "MOCK", label: "SIMULATED", simulated: true, verified: false, orderId: "DQMOCK1" }),
              salePayment({ id: "b", method: "PAYTM", provider: "PAYTM_PRODUCTION", label: "PAYTM", simulated: false, verified: true, orderId: "DQREAL1" }),
              salePayment({ id: "c", method: "PAYTM", provider: "PAYTM_SANDBOX", label: "PAYTM SANDBOX", simulated: false, verified: false }),
            ],
          }),
        ),
    });
    renderWithProviders(<SaleDetails id="s-1" />);
    await screen.findByRole("heading", { name: "S-000123" });
    expect(screen.getAllByText("Simulated")).toHaveLength(1);
    expect(screen.getAllByText("Verified by Paytm")).toHaveLength(1);
    expect(screen.getByText("Paytm sandbox")).toBeInTheDocument();
    expect(screen.getByText(/Order DQMOCK1/)).toBeInTheDocument();
    expect(screen.queryByText("Recorded by you")).not.toBeInTheDocument();
  });

  it("shows the voice transcript read-only with a voice badge", async () => {
    mockApi({ [SALE_URL]: () => ok(sale({ source: "VOICE", voiceTranscript: "do kilo namak aur ek doodh" })) });
    renderWithProviders(<SaleDetails id="s-1" />);
    expect(await screen.findByText("Original voice transcript")).toBeInTheDocument();
    expect(screen.getByText("do kilo namak aur ek doodh")).toBeInTheDocument();
    expect(screen.getByText("Voice")).toBeInTheDocument();
  });

  it("offers Collect via Paytm QR next to Record payment while money is due", async () => {
    mockApi({ [SALE_URL]: () => ok(sale()) });
    renderWithProviders(<SaleDetails id="s-1" />);
    expect(await screen.findByRole("button", { name: "Collect via Paytm QR" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record payment" })).toBeInTheDocument();
  });

  it("hides every action for a cancelled sale", async () => {
    mockApi({ [SALE_URL]: () => ok(sale({ status: "CANCELLED", paymentStatus: null, dueAmount: 0, cancelReason: "Wrong bill" })) });
    renderWithProviders(<SaleDetails id="s-1" />);
    expect(await screen.findByText(/This sale was cancelled/)).toBeInTheDocument();
    expect(screen.getByText("Reason: Wrong bill")).toBeInTheDocument();
    for (const name of ["Record payment", "Collect via Paytm QR", "Return items", "Cancel sale"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("records a payment up to the due amount and refreshes the sale", async () => {
    let current = sale();
    const bodies: unknown[] = [];
    mockApi({
      [SALE_URL]: () => ok(current),
      "POST /api/v1/sales/s-1/payments": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)));
        current = sale({ paidAmount: 50, dueAmount: 0, paymentStatus: "PAID" });
        return ok(current);
      },
    });
    renderWithProviders(<SaleDetails id="s-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Record payment" }));
    const dialog = screen.getByRole("dialog");
    const amount = within(dialog).getByLabelText("Amount (₹)");
    expect(amount).toHaveValue("20");

    await userEvent.clear(amount);
    await userEvent.type(amount, "25");
    await userEvent.click(within(dialog).getByRole("button", { name: "Record payment" }));
    expect(await within(dialog).findByText("Amount must be at most 20")).toBeInTheDocument();
    expect(bodies).toHaveLength(0);

    await userEvent.clear(amount);
    await userEvent.type(amount, "20");
    await userEvent.selectOptions(within(dialog).getByLabelText("Payment method"), "UPI");
    expect(within(dialog).getByText(/Customer paid by UPI/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(bodies).toEqual([{ method: "UPI", amount: 20 }]));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole("button", { name: "Record payment" })).not.toBeInTheDocument());
    expect(screen.getAllByText("Paid")).toHaveLength(2);
  });

  it("maps a server amount error onto the field", async () => {
    mockApi({
      [SALE_URL]: () => ok(sale()),
      "POST /api/v1/sales/s-1/payments": () => fail(400, "VALIDATION_FAILED", "Invalid", [{ field: "amount", message: "Amount is more than the due" }]),
    });
    renderWithProviders(<SaleDetails id="s-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Record payment" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Record payment" }));
    expect(await screen.findByText("Amount is more than the due")).toBeInTheDocument();
  });

  it("returns items, asking for a refund method only after the server requires it", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    mockApi({
      [SALE_URL]: () => ok(sale({ items: [saleItem({ id: "si-1", quantity: 3, returnedQuantity: 1 })] })),
      "POST /api/v1/sales/s-1/return": ({ init }) => {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        bodies.push(body);
        if (!body.refundMethod) {
          return fail(400, "VALIDATION_FAILED", "Refund method required", [{ field: "refundMethod", message: "Choose how the refund is paid" }]);
        }
        return ok(sale());
      },
    });
    renderWithProviders(<SaleDetails id="s-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Return items" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText("Refund method")).not.toBeInTheDocument();

    // Nothing entered yet.
    await userEvent.click(within(dialog).getByRole("button", { name: "Return items" }));
    expect(await within(dialog).findByText("Enter a quantity to return for at least one item")).toBeInTheDocument();

    // Only sold − returned (2) can come back.
    const qty = within(dialog).getByLabelText(/Tata Salt \(up to 2 kg\)/);
    await userEvent.type(qty, "3");
    await userEvent.click(within(dialog).getByRole("button", { name: "Return items" }));
    expect(await within(dialog).findByText("Quantity must be at most 2")).toBeInTheDocument();
    expect(bodies).toHaveLength(0);

    await userEvent.clear(qty);
    await userEvent.type(qty, "1.5");
    await userEvent.click(within(dialog).getByRole("button", { name: "Return items" }));
    expect(await within(dialog).findByLabelText("Refund method")).toBeInTheDocument();
    expect(within(dialog).getByText("Choose how the refund is paid")).toBeInTheDocument();
    expect(bodies[0]).toEqual({ items: [{ saleItemId: "si-1", quantity: 1.5 }] });

    await userEvent.selectOptions(within(dialog).getByLabelText("Refund method"), "CASH");
    await userEvent.click(within(dialog).getByRole("button", { name: "Return items" }));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).toEqual({ items: [{ saleItemId: "si-1", quantity: 1.5 }], refundMethod: "CASH" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("requires a refund method to cancel a paid sale, then cancels with the reason", async () => {
    const bodies: unknown[] = [];
    let current = sale();
    mockApi({
      [SALE_URL]: () => ok(current),
      "POST /api/v1/sales/s-1/cancel": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)));
        current = sale({ status: "CANCELLED", paymentStatus: null, dueAmount: 0 });
        return ok(current);
      },
    });
    renderWithProviders(<SaleDetails id="s-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Cancel sale" }));
    const dialog = screen.getByRole("alertdialog");
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Customer changed mind");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel sale" }));
    expect(await within(dialog).findByText("Choose how the money is refunded")).toBeInTheDocument();
    expect(bodies).toHaveLength(0);

    await userEvent.selectOptions(within(dialog).getByLabelText("Refund method"), "UPI");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel sale" }));
    await waitFor(() => expect(bodies).toEqual([{ reason: "Customer changed mind", refundMethod: "UPI" }]));
    expect(await screen.findByText(/This sale was cancelled/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel sale" })).not.toBeInTheDocument();
  });

  it("does not ask for a refund method when nothing was paid", async () => {
    const bodies: unknown[] = [];
    mockApi({
      [SALE_URL]: () => ok(sale({ paidAmount: 0, dueAmount: 50, paymentStatus: "UNPAID", payments: [] })),
      "POST /api/v1/sales/s-1/cancel": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)));
        return ok(sale({ status: "CANCELLED", paymentStatus: null }));
      },
    });
    renderWithProviders(<SaleDetails id="s-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Cancel sale" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).queryByLabelText("Refund method")).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel sale" }));
    await waitFor(() => expect(bodies).toEqual([{}]));
  });

  it("shows not-found and error states", async () => {
    mockApi({ [SALE_URL]: () => fail(404, "NOT_FOUND", "Sale not found") });
    renderWithProviders(<SaleDetails id="s-1" />);
    expect(await screen.findByText("Sale not found", { selector: "h2" })).toBeInTheDocument();
  });
});
