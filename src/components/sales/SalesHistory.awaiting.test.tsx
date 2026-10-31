import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SalesHistory } from "./SalesHistory";
import { SaleStatusBadge } from "./SaleBadges";
import { mockApi, ok, page, renderWithProviders } from "@/test/utils";
import { saleSummary } from "@/test/m3Fixtures";

afterEach(() => vi.unstubAllGlobals());

const waiting = () =>
  saleSummary({
    id: "s-w",
    saleNumber: "S-000099",
    status: "PENDING_PAYMENT",
    paymentStatus: "UNPAID",
    dueAmount: 80,
    totalAmount: 80,
    netAmount: 80,
    customerName: null,
  });

describe("sales list — awaiting payment", () => {
  it("badges a PENDING_PAYMENT sale as Awaiting payment, never Paid, Unpaid or Due", async () => {
    mockApi({ "GET /api/v1/sales": () => ok(page([waiting()])) });
    renderWithProviders(<SalesHistory />);
    expect((await screen.findAllByText("Awaiting payment", { selector: "span" })).length).toBeGreaterThan(0);
    // Filter <option>s share these words, so only look at badges and amounts.
    expect(screen.queryByText("Paid", { selector: "span" })).not.toBeInTheDocument();
    expect(screen.queryByText("Unpaid", { selector: "span" })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Due ₹/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /S-000099/ })[0]).toHaveAttribute("href", "/sales/s-w");
  });

  it("has an Awaiting payment status filter sent as status=PENDING_PAYMENT", async () => {
    const urls: URL[] = [];
    mockApi({
      "GET /api/v1/sales": ({ url }) => {
        urls.push(url);
        return ok(page([saleSummary()]));
      },
    });
    renderWithProviders(<SalesHistory />);
    await screen.findAllByText("S-000123");
    const status = screen.getByLabelText("Status");
    expect(within(status).getByRole("option", { name: "Awaiting payment" })).toBeInTheDocument();
    await userEvent.selectOptions(status, "PENDING_PAYMENT");
    await waitFor(() => expect(urls[urls.length - 1].searchParams.get("status")).toBe("PENDING_PAYMENT"));
  });
});

describe("SaleStatusBadge", () => {
  it("shows Awaiting payment for a waiting sale whatever the payment status says", () => {
    const { rerender } = renderWithProviders(<SaleStatusBadge status="PENDING_PAYMENT" paymentStatus="UNPAID" />);
    expect(screen.getByText("Awaiting payment")).toBeInTheDocument();
    rerender(<SaleStatusBadge status="PENDING_PAYMENT" paymentStatus="PAID" />);
    expect(screen.queryByText("Paid")).not.toBeInTheDocument();
  });
});
