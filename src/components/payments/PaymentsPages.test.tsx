import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentsList } from "./PaymentsList";
import { Reconciliation } from "./Reconciliation";
import { PaymentLabelBadge, NeedsReviewNotice } from "./PaymentBadges";
import { fail, mockApi, ok, page, renderWithProviders } from "@/test/utils";
import { paymentConfig, paymentView, reconciliation, verifiedPayment } from "@/test/m4Fixtures";
import type { PaymentReviewReason } from "@/types/payment";

afterEach(() => vi.unstubAllGlobals());

const CONFIG = "GET /api/v1/payments/config";
const LIST = "GET /api/v1/payments";
const RECON = "GET /api/v1/payments/reconciliation";

describe("PaymentLabelBadge", () => {
  it.each([
    ["SIMULATED", "Simulated"],
    ["PAYTM SANDBOX", "Paytm sandbox"],
    ["PAYTM", "Paytm"],
  ] as const)("renders the %s label", (label, text) => {
    const { container } = renderWithProviders(<PaymentLabelBadge label={label} />);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(container).toHaveTextContent(text);
  });
});

describe("NeedsReviewNotice", () => {
  it.each<[PaymentReviewReason, RegExp]>([
    ["AMOUNT_MISMATCH", /different amount than this QR was created for/],
    ["NOT_APPLIED_TO_SALE", /could not be added to the sale/],
    ["LATE_SUCCESS", /arrived after the QR had already expired or failed/],
    ["CONFLICTING_STATUS", /conflicting answers about this payment/],
  ])("explains %s in plain words", (reason, explanation) => {
    renderWithProviders(<NeedsReviewNotice reason={reason} />);
    expect(screen.getByRole("note")).toHaveTextContent("Needs your review");
    expect(screen.getByText(explanation)).toBeInTheDocument();
  });

  it("falls back to a generic message for an unknown reason", () => {
    renderWithProviders(<NeedsReviewNotice reason={null} />);
    expect(screen.getByRole("note")).toHaveTextContent("needs your attention");
  });
});

describe("PaymentsList", () => {
  const mixed = () =>
    page([
      paymentView({ id: "p1", orderId: "DQMOCK1", amount: 120, status: "PENDING" }),
      verifiedPayment({ id: "p2", orderId: "DQREAL1", amount: 900, saleNumber: "S-000200", saleId: "s-200" }),
      paymentView({ id: "p3", orderId: "DQFAIL1", status: "FAILED", failureReason: "Customer declined" }),
      paymentView({ id: "p4", orderId: "DQREV1", status: "SUCCESS", needsReview: true, reviewReason: "LATE_SUCCESS" }),
    ]);

  it("lists payments with status and label badges, verified indicator, sale links and review explanations", async () => {
    mockApi({ [CONFIG]: () => ok(paymentConfig()), [LIST]: () => ok(mixed()) });
    renderWithProviders(<PaymentsList />);
    const list = within(await screen.findByRole("list", { name: "Payments" }));
    const rows = list.getAllByRole("listitem");
    expect(rows).toHaveLength(4);

    expect(within(rows[0]).getByText("₹120")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Waiting for payment")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Simulated")).toBeInTheDocument();
    expect(within(rows[0]).queryByText("Verified by Paytm")).not.toBeInTheDocument();
    expect(within(rows[0]).getByRole("link", { name: "S-000123" })).toHaveAttribute("href", "/sales/s-1");

    expect(within(rows[1]).getByText("₹900")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Paytm")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Verified by Paytm")).toBeInTheDocument();
    expect(within(rows[1]).queryByText("Simulated")).not.toBeInTheDocument();
    expect(within(rows[1]).getByRole("link", { name: "S-000200" })).toHaveAttribute("href", "/sales/s-200");
    expect(within(rows[1]).queryByRole("button", { name: /Check status/ })).not.toBeInTheDocument();

    expect(within(rows[2]).getByText("Customer declined")).toBeInTheDocument();
    expect(within(rows[3]).getByText(/Needs your review: Payment arrived late/)).toBeInTheDocument();
    expect(within(rows[3]).getByText(/Check your Paytm dashboard/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Reconciliation/ })).toHaveAttribute("href", "/payments/reconciliation");
  });

  it("shows the payment mode", async () => {
    mockApi({
      [CONFIG]: () => ok(paymentConfig({ provider: "PAYTM_SANDBOX", simulated: false })),
      [LIST]: () => ok(page([])),
    });
    renderWithProviders(<PaymentsList />);
    expect(await screen.findByText("Paytm sandbox")).toBeInTheDocument();
    expect(screen.getByText(/test money, not real money/)).toBeInTheDocument();
  });

  it("filters by status and by demo / real money, resetting to the first page", async () => {
    const queries: string[] = [];
    mockApi({
      [CONFIG]: () => ok(paymentConfig()),
      [LIST]: ({ url }) => {
        queries.push(url.search);
        return ok(page([paymentView()], { totalItems: 45, totalPages: 3, page: Number(url.searchParams.get("page") ?? 0) }));
      },
    });
    renderWithProviders(<PaymentsList />);
    await screen.findByRole("list", { name: "Payments" });
    expect(queries[0]).toBe("?page=0&size=20");

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(queries.at(-1)).toBe("?page=1&size=20"));

    await userEvent.selectOptions(screen.getByLabelText("Status"), "FAILED");
    await waitFor(() => expect(queries.at(-1)).toBe("?status=FAILED&page=0&size=20"));

    await userEvent.click(screen.getByRole("button", { name: "Demo (simulated) only" }));
    await waitFor(() => expect(queries.at(-1)).toBe("?status=FAILED&simulated=true&page=0&size=20"));
    expect(screen.getByRole("button", { name: "Demo (simulated) only" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Real & sandbox" }));
    await waitFor(() => expect(queries.at(-1)).toBe("?status=FAILED&simulated=false&page=0&size=20"));
  });

  it("checks the status of an in-progress payment through reconcile and refreshes the row", async () => {
    let status: "PENDING" | "SUCCESS" = "PENDING";
    const reconciles: string[] = [];
    mockApi({
      [CONFIG]: () => ok(paymentConfig()),
      [LIST]: () => ok(page([paymentView({ status })])),
      "POST /api/v1/payments/pay-1/reconcile": () => {
        reconciles.push("pay-1");
        status = "SUCCESS";
        return ok(paymentView({ status }));
      },
    });
    renderWithProviders(<PaymentsList />);
    await userEvent.click(await screen.findByRole("button", { name: /Check status/ }));
    expect(reconciles).toEqual(["pay-1"]);
    const list = within(screen.getByRole("list", { name: "Payments" }));
    expect(await list.findByText("Paid")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Check status/ })).not.toBeInTheDocument();
  });

  it("shows an empty state, and an error with retry", async () => {
    let failing = true;
    mockApi({
      [CONFIG]: () => ok(paymentConfig()),
      [LIST]: () => (failing ? fail(500, "INTERNAL_ERROR", "Payments unavailable") : ok(page([]))),
    });
    renderWithProviders(<PaymentsList />);
    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent("Payments unavailable");
    failing = false;
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("No Paytm payments yet")).toBeInTheDocument();
  });
});

describe("Reconciliation", () => {
  it("shows verified and simulated collections as two separate cards, counts, notes and the provider", async () => {
    mockApi({
      [CONFIG]: () => ok(paymentConfig()),
      [RECON]: () =>
        ok(
          reconciliation({
            collected: { verified: 1500, simulated: 480 },
            counts: { SUCCESS: 4, PENDING: 1, FAILED: 2, UNKNOWN: 3, CREATED: 0, REFUNDED: 0 },
          }),
        ),
    });
    renderWithProviders(<Reconciliation />);
    expect(await screen.findByRole("heading", { name: "Payment reconciliation" })).toBeInTheDocument();
    expect(screen.getByText(/Last 30 days · Mock demo \(simulated\)/)).toBeInTheDocument();

    const verified = screen.getByTestId("collected-verified");
    const simulated = screen.getByTestId("collected-simulated");
    expect(verified).toHaveTextContent("₹1,500");
    expect(simulated).toHaveTextContent("₹480");
    const verifiedCard = verified.closest("section") as HTMLElement;
    const simulatedCard = simulated.closest("section") as HTMLElement;
    expect(verifiedCard).not.toBe(simulatedCard);
    expect(within(verifiedCard).getByText("Verified by Paytm")).toBeInTheDocument();
    expect(within(verifiedCard).queryByText("Simulated")).not.toBeInTheDocument();
    expect(within(simulatedCard).getByText("Simulated")).toBeInTheDocument();
    expect(within(simulatedCard).getByText(/Demo money/)).toBeInTheDocument();
    expect(within(simulatedCard).getByText(/never counted as verified/)).toBeInTheDocument();

    expect(screen.getByText("Paid", { selector: "dt" }).nextSibling).toHaveTextContent("4");
    expect(screen.getByText("Failed", { selector: "dt" }).nextSibling).toHaveTextContent("2");
    expect(screen.getByText("Not confirmed", { selector: "dt" }).nextSibling).toHaveTextContent("3");
    expect(await screen.findByText("Mock demo")).toBeInTheDocument();

    const notes = screen.getByRole("complementary", { name: "About these numbers" });
    expect(within(notes).getByText("Simulated payments are demo data and are never counted as verified collections.")).toBeInTheDocument();
    expect(screen.getByText("Nothing needs your attention right now.")).toBeInTheDocument();
  });

  it("lists attention items with explanations and a Check status action", async () => {
    let status: "UNKNOWN" | "SUCCESS" = "UNKNOWN";
    mockApi({
      [CONFIG]: () => ok(paymentConfig()),
      [RECON]: () =>
        ok(
          reconciliation({
            attention: [
              paymentView({ id: "pay-1", status, orderId: "DQUNK1" }),
              paymentView({ id: "pay-9", orderId: "DQREV9", status: "SUCCESS", needsReview: true, reviewReason: "AMOUNT_MISMATCH" }),
              paymentView({ id: "pay-8", orderId: "DQOLD8", status: "PENDING" }),
            ],
          }),
        ),
      "POST /api/v1/payments/pay-1/reconcile": () => {
        status = "SUCCESS";
        return ok(paymentView({ id: "pay-1", status }));
      },
    });
    renderWithProviders(<Reconciliation />);
    const list = within(await screen.findByRole("list", { name: "Payments needing attention" }));
    const rows = list.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText(/could not confirm this payment/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/Needs your review: Amount does not match/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/different amount than this QR was created for/)).toBeInTheDocument();
    expect(within(rows[2]).getByText(/waiting longer than usual/)).toBeInTheDocument();

    await userEvent.click(within(rows[0]).getByRole("button", { name: /Check status/ }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Check status/ })).toHaveLength(1));
  });

  it("tells the merchant when Paytm credentials are missing", async () => {
    mockApi({
      [CONFIG]: () => ok(paymentConfig({ provider: "PAYTM_PRODUCTION", simulated: false, configured: false })),
      [RECON]: () => ok(reconciliation({ provider: "PAYTM_PRODUCTION", simulated: false, collected: { verified: 0, simulated: 0 } })),
    });
    renderWithProviders(<Reconciliation />);
    expect(await screen.findByText("Paytm production")).toBeInTheDocument();
    expect(await screen.findByText(/credentials are missing/)).toBeInTheDocument();
  });

  it("shows an error state with retry", async () => {
    let failing = true;
    mockApi({
      [CONFIG]: () => ok(paymentConfig()),
      [RECON]: () => (failing ? fail(500, "INTERNAL_ERROR", "Reconciliation unavailable") : ok(reconciliation())),
    });
    renderWithProviders(<Reconciliation />);
    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent("Reconciliation unavailable");
    failing = false;
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByRole("heading", { name: "Payment reconciliation" })).toBeInTheDocument();
  });
});
