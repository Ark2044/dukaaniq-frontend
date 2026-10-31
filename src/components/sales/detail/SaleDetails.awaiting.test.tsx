import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaleDetails } from "@/components/sales/detail/SaleDetails";
import { fail, mockApi, ok, page, renderWithProviders } from "@/test/utils";
import { sale } from "@/test/m3Fixtures";
import { paymentConfig, paymentView, pendingSale } from "@/test/m4Fixtures";

afterEach(() => vi.unstubAllGlobals());

const SALE = "GET /api/v1/sales/s-1";
const ABANDON = "POST /api/v1/sales/s-1/abandon-payment";

describe("SaleDetails — Paytm QR sale awaiting payment", () => {
  it("shows the waiting banner and badge, only Show QR / Cancel payment, and no normal sale actions", async () => {
    mockApi({ [SALE]: () => ok(pendingSale()) });
    renderWithProviders(<SaleDetails id="s-1" />);

    expect(await screen.findByText(/Waiting for Paytm payment — this sale is not complete yet and will be cancelled if it is not paid in time/)).toBeInTheDocument();
    expect(screen.getByText("Awaiting payment")).toBeInTheDocument();
    expect(screen.queryByText("Unpaid")).not.toBeInTheDocument();
    expect(screen.queryByText("Paid")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show QR/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel payment" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Record payment/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Return items/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cancel sale/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Collect via Paytm QR/ })).not.toBeInTheDocument();

    const amounts = within(screen.getByLabelText("Sale amounts"));
    expect(amounts.getByText("Payment").nextSibling).toHaveTextContent("Awaiting Paytm payment");
    expect(amounts.queryByText("Paid")).not.toBeInTheDocument();
    expect(amounts.queryByText("Due")).not.toBeInTheDocument();
  });

  const live = () => paymentView({ expiresAt: "2099-01-01T00:00:00Z" });

  it("Show QR reopens the payment already in flight for this sale instead of creating another", async () => {
    const fn = mockApi({
      [SALE]: () => ok(pendingSale()),
      "GET /api/v1/payments/config": () => ok(paymentConfig()),
      "GET /api/v1/payments": ({ url }) => ok(page(url.searchParams.get("status") === "PENDING" ? [live()] : [])),
      "GET /api/v1/payments/pay-1/status": () => ok(live()),
    });
    renderWithProviders(<SaleDetails id="s-1" />);
    await userEvent.click(await screen.findByRole("button", { name: /Show QR/ }));

    const dialog = within(await screen.findByRole("dialog"));
    expect(await dialog.findByRole("img", { name: /QR code to pay ₹120/ })).toBeInTheDocument();
    expect(dialog.getByRole("status")).toHaveTextContent("Waiting for payment…");
    expect(fn.mock.calls.some(([url, init]) => String(url).endsWith("/payments/paytm/qr") && (init as RequestInit)?.method === "POST")).toBe(false);
  });

  it("Cancel payment asks for confirmation, then shows the cancelled sale with a Start again link", async () => {
    let cancelled = false;
    mockApi({
      [SALE]: () => ok(cancelled ? pendingSale({ status: "CANCELLED", paymentStatus: null, cancelReason: "Cancelled by the shop" }) : pendingSale()),
      [ABANDON]: () => {
        cancelled = true;
        return ok(pendingSale({ status: "CANCELLED", paymentStatus: null, cancelReason: "Cancelled by the shop" }), 201);
      },
    });
    renderWithProviders(<SaleDetails id="s-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Cancel payment" }));
    const confirm = within(screen.getByRole("alertdialog"));
    expect(confirm.getByText(/flagged for review/)).toBeInTheDocument();
    await userEvent.click(confirm.getByRole("button", { name: "Cancel payment" }));

    expect(await screen.findByText(/Payment cancelled — this sale was cancelled and the stock was restored/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start again" })).toHaveAttribute("href", "/sales/new");
    expect(screen.queryByRole("button", { name: /Show QR/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0);
  });

  it("when Cancel payment answers 409 the page refetches and shows the completed sale", async () => {
    let paid = false;
    mockApi({
      [SALE]: () => ok(paid ? sale({ id: "s-1", status: "COMPLETED", paidAmount: 120, dueAmount: 0, totalAmount: 120, netAmount: 120, paymentStatus: "PAID" }) : pendingSale()),
      [ABANDON]: () => {
        paid = true;
        return fail(409, "CONFLICT", "The payment was just received, so the sale cannot be cancelled.");
      },
    });
    renderWithProviders(<SaleDetails id="s-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Cancel payment" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel payment" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /Show QR/ })).not.toBeInTheDocument());
    expect(await screen.findByText(/Paid — sale S-000123 is complete/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Return items/ })).toBeInTheDocument();
    expect(screen.queryByText(/this sale was cancelled/)).not.toBeInTheDocument();
  });

  it("shows the cancel reason of a sale that was cancelled because it was not paid", async () => {
    mockApi({
      [SALE]: () =>
        ok(sale({ status: "CANCELLED", paymentStatus: null, cancelledAt: "2026-10-31T07:12:00Z", cancelReason: "Paytm payment was not completed in time" })),
    });
    renderWithProviders(<SaleDetails id="s-1" />);
    expect(await screen.findByText(/Reason: Paytm payment was not completed in time/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show QR|Cancel payment/ })).not.toBeInTheDocument();
  });

  it("an ordinary completed sale shows none of the waiting UI", async () => {
    mockApi({ [SALE]: () => ok(sale()) });
    renderWithProviders(<SaleDetails id="s-1" />);
    await screen.findByRole("heading", { name: "S-000123" });
    expect(screen.queryByText(/Waiting for Paytm payment/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show QR/ })).not.toBeInTheDocument();
  });
});
