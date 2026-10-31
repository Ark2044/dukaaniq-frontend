import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SalePaymentModal } from "./SalePaymentModal";
import { createTestClient, fail, mockApi, ok, page, renderWithProviders } from "@/test/utils";
import { paymentConfig, paymentView, pendingSale } from "@/test/m4Fixtures";
import { saleKeys } from "@/lib/api/sales";
import type { PaymentView } from "@/types/payment";
import type { Sale } from "@/types/sale";

const CONFIG = "GET /api/v1/payments/config";
const CREATE = "POST /api/v1/payments/paytm/qr";
const LIST = "GET /api/v1/payments";
const STATUS = "GET /api/v1/payments/pay-1/status";
const RECONCILE = "POST /api/v1/payments/pay-1/reconcile";
const SIMULATE = "POST /api/v1/payments/pay-1/simulate";
const SALE = "GET /api/v1/sales/s-1";
const ABANDON = "POST /api/v1/sales/s-1/abandon-payment";

const WAITING = pendingSale();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  vi.setSystemTime(new Date("2026-10-31T09:30:00Z"));
  vi.stubGlobal("jest", { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const user = () => userEvent.setup({ delay: null });
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const flush = () => advance(50);

const keyOf = ([url, init]: Parameters<typeof fetch>) =>
  `${(init as RequestInit | undefined)?.method ?? "GET"} ${new URL(String(url), "http://localhost").pathname}`;
const callsTo = (fn: ReturnType<typeof mockApi>, key: string) => fn.mock.calls.filter((call) => keyOf(call) === key).length;
const bodyOf = (fn: ReturnType<typeof mockApi>, key: string) => {
  const call = fn.mock.calls.find((c) => keyOf(c) === key);
  return JSON.parse(String((call?.[1] as RequestInit).body));
};

/** A server whose payment and sale states the test flips by hand; the browser only ever displays them. */
function server(overrides: Record<string, () => Response> = {}) {
  const state = { payment: "PENDING" as PaymentView["status"], sale: "PENDING_PAYMENT" as Sale["status"], reason: null as string | null };
  const routes = {
    [CONFIG]: () => ok(paymentConfig()),
    [CREATE]: () => ok(paymentView(), 201),
    [STATUS]: () => ok(paymentView({ status: state.payment })),
    [SALE]: () => ok(pendingSale({ status: state.sale, cancelReason: state.reason })),
    ...overrides,
  };
  return { state, routes };
}

async function openFlow(routes: Record<string, () => Response>, props: Partial<Parameters<typeof SalePaymentModal>[0]> = {}) {
  const client = createTestClient();
  client.setQueryData(saleKeys.detail("s-1"), WAITING);
  const fn = mockApi(routes);
  const onClose = vi.fn();
  const onStartAgain = vi.fn();
  const view = renderWithProviders(<SalePaymentModal sale={WAITING} open onClose={onClose} onStartAgain={onStartAgain} {...props} />, client);
  await flush();
  return { fn, onClose, onStartAgain, u: user(), ...view };
}

const dialog = () => within(screen.getByRole("dialog"));

describe("SalePaymentModal — waiting sale", () => {
  it("creates the QR for the sale and shows demo banner, QR, amount, order id, label, countdown and waiting text", async () => {
    const { routes } = server();
    const { fn } = await openFlow(routes);

    expect(bodyOf(fn, CREATE)).toEqual({ saleId: "s-1" });
    expect(callsTo(fn, LIST)).toBe(0);
    const d = dialog();
    expect(d.getByText("Demo mode — this QR is not a real payment")).toBeInTheDocument();
    expect(d.getByRole("img", { name: /QR code to pay ₹120 for order DQ1K9X4T2AB7. Demo QR/ })).toBeInTheDocument();
    expect(d.getByText("Simulated")).toBeInTheDocument();
    expect(d.getByText("DQ1K9X4T2AB7")).toBeInTheDocument();
    expect(d.getByText("10:00")).toBeInTheDocument();
    expect(d.getByRole("status")).toHaveTextContent("Waiting for payment…");
    expect(d.getByText(/This sale will be cancelled automatically if it is not paid in time/)).toBeInTheDocument();
    expect(d.getByRole("link", { name: "the sale" })).toHaveAttribute("href", "/sales/s-1");
  });

  it("polls every 3 seconds and shows Paid only after the server says SUCCESS and the sale is COMPLETED", async () => {
    const { routes, state } = server();
    const { fn, client } = await openFlow(routes);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    await advance(3000);
    expect(callsTo(fn, STATUS)).toBe(1);
    expect(dialog().getByRole("status")).toHaveTextContent("Waiting for payment…");
    expect(callsTo(fn, SALE)).toBe(0);

    state.payment = "SUCCESS";
    state.sale = "COMPLETED";
    await advance(3000);
    await flush();

    const d = dialog();
    expect(callsTo(fn, SALE)).toBeGreaterThanOrEqual(1);
    expect(d.getByRole("status")).toHaveTextContent("Paid");
    expect(d.getByRole("status")).toHaveTextContent("simulated demo payment");
    expect(d.getByRole("link", { name: "View sale" })).toHaveAttribute("href", "/sales/s-1");
    expect(d.queryByRole("img", { name: /QR code/ })).not.toBeInTheDocument();
    expect(d.queryByRole("button", { name: "Cancel payment" })).not.toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["sales"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["products"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["inventory"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["customers"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["analytics-summary"] });

    const polls = callsTo(fn, STATUS);
    await advance(15_000);
    expect(callsTo(fn, STATUS)).toBe(polls);
  });

  it("does not call the sale paid when only the payment says SUCCESS and the sale is still waiting", async () => {
    const { routes, state } = server();
    await openFlow(routes);
    state.payment = "SUCCESS";
    await advance(3000);
    await flush();
    expect(dialog().getByRole("status")).toHaveTextContent("Payment received. Finishing the sale…");
    expect(screen.queryByText("Paid")).not.toBeInTheDocument();
    state.sale = "COMPLETED";
    await advance(3000);
    expect(dialog().getByRole("status")).toHaveTextContent("Paid");
  });

  it("says the sale was cancelled and stock restored when the server reports FAILED, and offers Start again", async () => {
    const { routes, state } = server();
    const { u, onStartAgain } = await openFlow(routes);
    state.payment = "FAILED";
    state.sale = "CANCELLED";
    state.reason = "Paytm payment was not completed in time";
    await advance(3000);
    await flush();

    const d = dialog();
    expect(d.getByText(/Payment not received — this sale was cancelled and the stock was restored/)).toBeInTheDocument();
    expect(d.getByText("Reason: Paytm payment was not completed in time")).toBeInTheDocument();
    expect(d.queryByRole("button", { name: "Cancel payment" })).not.toBeInTheDocument();
    await u.click(d.getByRole("button", { name: "Start again" }));
    expect(onStartAgain).toHaveBeenCalled();
  });

  it("links Start again to a path when given one", async () => {
    const { routes, state } = server();
    await openFlow(routes, { onStartAgain: undefined, startAgainHref: "/sales/new" });
    state.payment = "FAILED";
    await advance(3000);
    expect(dialog().getByRole("link", { name: "Start again" })).toHaveAttribute("href", "/sales/new");
  });

  it("at zero shows Checking…, keeps polling and never declares failure itself", async () => {
    const { routes, state } = server();
    const { fn } = await openFlow(routes);

    await advance(10 * 60 * 1000 + 5000);
    const d = dialog();
    expect(d.getByRole("status")).toHaveTextContent("Checking…");
    expect(d.queryByText(/Payment not received/)).not.toBeInTheDocument();
    expect(d.queryByRole("img", { name: /QR code/ })).not.toBeInTheDocument();
    const polls = callsTo(fn, STATUS);
    expect(polls).toBeGreaterThan(100);
    await advance(3000);
    expect(callsTo(fn, STATUS)).toBe(polls + 1);

    state.payment = "FAILED";
    state.sale = "CANCELLED";
    await advance(3000);
    expect(d.getByText(/Payment not received — this sale was cancelled/)).toBeInTheDocument();
  });

  it("Cancel payment asks first, explains the review flag, calls abandon and shows the cancelled state", async () => {
    const { routes, state } = server({
      [ABANDON]: () => ok(pendingSale({ status: "CANCELLED", cancelReason: "Cancelled by the shop", paymentStatus: null }), 201),
    });
    const { fn, u, client } = await openFlow(routes);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    await u.click(dialog().getByRole("button", { name: "Cancel payment" }));
    const confirm = within(screen.getByRole("alertdialog"));
    expect(confirm.getByText(/if the customer still pays afterwards, the payment will be flagged for review/)).toBeInTheDocument();
    expect(callsTo(fn, ABANDON)).toBe(0);

    state.payment = "FAILED";
    await u.click(confirm.getByRole("button", { name: "Cancel payment" }));
    await flush();

    expect(callsTo(fn, ABANDON)).toBe(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    const d = dialog();
    expect(d.getByText(/Payment cancelled — this sale was cancelled and the stock was restored/)).toBeInTheDocument();
    expect(d.getByText(/flagged for review on the Payments page/)).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["products"] });
  });

  it("keeps waiting when the shop declines the confirmation", async () => {
    const { routes } = server();
    const { fn, u } = await openFlow(routes);
    await u.click(dialog().getByRole("button", { name: "Cancel payment" }));
    await u.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Keep waiting" }));
    expect(callsTo(fn, ABANDON)).toBe(0);
    expect(dialog().getByRole("status")).toHaveTextContent("Waiting for payment…");
  });

  it("when abandon answers 409 (money just arrived) it refetches and shows the paid state", async () => {
    const { routes, state } = server({
      [ABANDON]: () => fail(409, "CONFLICT", "The payment was just received, so the sale cannot be cancelled."),
    });
    const { u } = await openFlow(routes);

    state.payment = "SUCCESS";
    state.sale = "COMPLETED";
    await u.click(dialog().getByRole("button", { name: "Cancel payment" }));
    await u.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel payment" }));
    await flush();
    await flush();

    expect(dialog().getByRole("status")).toHaveTextContent("Paid");
    expect(dialog().queryByText(/this sale was cancelled/)).not.toBeInTheDocument();
  });

  it("UNKNOWN explains it, offers Check status, never creates another QR and keeps polling", async () => {
    const { routes, state } = server({
      [CREATE]: () => ok(paymentView({ status: "UNKNOWN", qrData: null }), 201),
      [RECONCILE]: () => ok(paymentView({ status: "SUCCESS", qrData: null })),
    });
    state.payment = "UNKNOWN";
    const { fn, u } = await openFlow(routes);

    const d = dialog();
    expect(d.getByRole("status")).toHaveTextContent("Not confirmed");
    expect(d.getByRole("status")).toHaveTextContent("do not know if the customer paid");
    expect(d.queryByRole("img", { name: /QR code/ })).not.toBeInTheDocument();
    expect(d.queryByRole("button", { name: /simulate/i })).not.toBeInTheDocument();
    await advance(3000);
    expect(callsTo(fn, STATUS)).toBe(1);

    state.sale = "COMPLETED";
    await u.click(d.getByRole("button", { name: "Check status" }));
    await flush();
    expect(callsTo(fn, RECONCILE)).toBe(1);
    expect(callsTo(fn, CREATE)).toBe(1);
    expect(d.getByRole("status")).toHaveTextContent("Paid");
  });

  it("shows the demo simulate buttons only in MOCK mode and sends the chosen outcome", async () => {
    const { routes, state } = server({ [SIMULATE]: () => ok(paymentView({ status: "FAILED" })) });
    const { fn, u } = await openFlow(routes);
    expect(dialog().getByRole("button", { name: "Simulate customer payment (demo)" })).toBeInTheDocument();

    state.payment = "FAILED";
    await u.click(dialog().getByRole("button", { name: "Simulate failure (demo)" }));
    await flush();
    expect(bodyOf(fn, SIMULATE)).toEqual({ outcome: "FAILED" });
    expect(dialog().getByText(/Payment not received/)).toBeInTheDocument();
  });

  it("hides the simulate buttons for real Paytm modes and labels sandbox money", async () => {
    const { routes } = server({
      [CONFIG]: () => ok(paymentConfig({ provider: "PAYTM_SANDBOX", simulated: false })),
      [CREATE]: () => ok(paymentView({ provider: "PAYTM_SANDBOX", simulated: false, label: "PAYTM SANDBOX" }), 201),
    });
    await openFlow(routes);
    const d = dialog();
    expect(d.queryByRole("button", { name: /simulate/i })).not.toBeInTheDocument();
    expect(d.queryByText("Demo mode — this QR is not a real payment")).not.toBeInTheDocument();
    expect(d.getByText("Paytm sandbox")).toBeInTheDocument();
  });

  it("explains missing Paytm credentials when the QR cannot be created, and still allows cancelling the sale", async () => {
    const { routes } = server({ [CREATE]: () => fail(503, "PAYMENT_NOT_CONFIGURED", "Paytm not configured") });
    await openFlow(routes);
    const d = dialog();
    expect(d.getByRole("alert")).toHaveTextContent(/credentials are missing/);
    expect(d.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(d.getByRole("button", { name: "Cancel payment" })).toBeInTheDocument();
  });

  it("reopens the payment already in flight instead of creating a new QR (Show QR on sale detail)", async () => {
    const { routes } = server({
      [LIST]: () => ok(page([paymentView({ id: "other", saleId: "s-9" }), paymentView()])),
    });
    const { fn } = await openFlow(routes, { reuseExisting: true });
    expect(callsTo(fn, CREATE)).toBe(0);
    expect(dialog().getByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(callsTo(fn, LIST)).toBeGreaterThanOrEqual(1);
  });

  it("creates a QR when the sale has no payment in flight, and reopens the running one on 409", async () => {
    const empty = server({ [LIST]: () => ok(page([])) });
    const first = await openFlow(empty.routes, { reuseExisting: true });
    expect(callsTo(first.fn, LIST)).toBe(3);
    expect(callsTo(first.fn, CREATE)).toBe(1);
    first.unmount();

    let lookups = 0;
    const conflicting = server({
      [LIST]: () => ok(++lookups > 3 ? page([paymentView()]) : page([])),
      [CREATE]: () => fail(409, "CONFLICT", "A payment is already in progress for this sale"),
    });
    const second = await openFlow(conflicting.routes, { reuseExisting: true });
    expect(callsTo(second.fn, CREATE)).toBe(1);
    expect(dialog().getByRole("img", { name: /QR code/ })).toBeInTheDocument();
  });

  it("stops every poll and timer when the dialog is closed, and the sale stays reachable", async () => {
    const { routes } = server();
    const client = createTestClient();
    client.setQueryData(saleKeys.detail("s-1"), WAITING);
    const fn = mockApi(routes);
    function Harness() {
      const [open, setOpen] = useState(true);
      return <SalePaymentModal sale={WAITING} open={open} onClose={() => setOpen(false)} />;
    }
    renderWithProviders(<Harness />, client);
    await flush();
    const u = user();
    await advance(3000);
    const polls = callsTo(fn, STATUS);
    expect(polls).toBe(1);
    expect(screen.getByRole("link", { name: "the sale" })).toHaveAttribute("href", "/sales/s-1");

    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    await u.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const callsAfterClose = fn.mock.calls.length;
    await advance(60_000);
    expect(fn.mock.calls.length).toBe(callsAfterClose);
  });
});
