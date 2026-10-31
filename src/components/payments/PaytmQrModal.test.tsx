import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaytmQrModal } from "./PaytmQrModal";
import { CollectViaPaytm } from "./CollectViaPaytm";
import { createTestClient, fail, mockApi, ok, renderWithProviders } from "@/test/utils";
import { sale } from "@/test/m3Fixtures";
import { paymentConfig, paymentView, verifiedPayment } from "@/test/m4Fixtures";
import type { PaymentView } from "@/types/payment";

const CONFIG = "GET /api/v1/payments/config";
const CREATE = "POST /api/v1/payments/paytm/qr";
const STATUS = "GET /api/v1/payments/pay-1/status";
const RECONCILE = "POST /api/v1/payments/pay-1/reconcile";
const SIMULATE = "POST /api/v1/payments/pay-1/simulate";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  vi.setSystemTime(new Date("2026-10-31T09:30:00Z"));
  // Testing Library only drains its internal timers under fake timers when it can see a `jest` global.
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

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <PaytmQrModal sale={SALE} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const SALE = sale({ dueAmount: 120, paidAmount: 0, netAmount: 120, totalAmount: 120, paymentStatus: "UNPAID", payments: [] });

async function openAndCreate(routes: Record<string, () => Response>, options: { amount?: string } = {}) {
  const client = createTestClient();
  const fn = mockApi({ [CONFIG]: () => ok(paymentConfig()), ...routes });
  const onClose = vi.fn();
  const view = renderWithProviders(<PaytmQrModal sale={SALE} open onClose={onClose} />, client);
  const u = user();
  await flush();
  if (options.amount !== undefined) {
    const input = screen.getByLabelText("Amount to collect (₹)");
    await u.clear(input);
    await u.type(input, options.amount);
  }
  await u.click(screen.getByRole("button", { name: "Create QR" }));
  await flush();
  return { fn, u, onClose, ...view };
}

describe("PaytmQrModal", () => {
  it("creates a QR with the full due by default, shows demo state, then flips to Paid only after the server says so", async () => {
    let serverStatus: PaymentView["status"] = "PENDING";
    const { fn, client } = await openAndCreate({
      [CREATE]: () => ok(paymentView(), 201),
      [STATUS]: () => ok(paymentView({ status: serverStatus, simulated: true })),
    });
    const invalidate = vi.spyOn(client, "invalidateQueries");

    expect(bodyOf(fn, CREATE)).toEqual({ saleId: "s-1" });

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Demo mode — this QR is not a real payment")).toBeInTheDocument();
    expect(dialog.getByRole("img", { name: /QR code to pay ₹120 for order DQ1K9X4T2AB7. Demo QR/ })).toBeInTheDocument();
    expect(dialog.getByText("Simulated")).toBeInTheDocument();
    expect(dialog.queryByText("Verified by Paytm")).not.toBeInTheDocument();
    expect(dialog.getByText("DQ1K9X4T2AB7")).toBeInTheDocument();
    expect(dialog.getByText("10:00")).toBeInTheDocument();
    expect(dialog.getByRole("status")).toHaveTextContent("Waiting for payment…");

    // Polling: still pending after one tick, no browser-side success.
    await advance(3000);
    expect(callsTo(fn, STATUS)).toBe(1);
    expect(dialog.getByRole("status")).toHaveTextContent("Waiting for payment…");
    expect(dialog.getByText("9:57")).toBeInTheDocument();

    serverStatus = "SUCCESS";
    await advance(3000);
    expect(callsTo(fn, STATUS)).toBe(2);
    expect(dialog.getByRole("status")).toHaveTextContent("Paid");
    expect(dialog.getByRole("status")).toHaveTextContent("simulated demo payment");
    expect(dialog.queryByText("Verified by Paytm")).not.toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["sales"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["customers"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["analytics-summary"] });

    // Final status stops the polling.
    await advance(15_000);
    expect(callsTo(fn, STATUS)).toBe(2);
    expect(dialog.queryByRole("img", { name: /QR code/ })).not.toBeInTheDocument();
  });

  it("sends a custom amount, and blocks one above the amount due", async () => {
    const { fn, u } = await openAndCreate({ [CREATE]: () => ok(paymentView({ amount: 50 }), 201), [STATUS]: () => ok(paymentView({ amount: 50 })) }, { amount: "500" });
    expect(screen.getByRole("alert")).toHaveTextContent("Amount must be at most 120");
    expect(callsTo(fn, CREATE)).toBe(0);

    const input = screen.getByLabelText("Amount to collect (₹)");
    await u.clear(input);
    await u.type(input, "50");
    await u.click(screen.getByRole("button", { name: "Create QR" }));
    await flush();
    expect(bodyOf(fn, CREATE)).toEqual({ saleId: "s-1", amount: 50 });
    expect(screen.getByRole("img", { name: /QR code to pay ₹50/ })).toBeInTheDocument();
  });

  it("shows a server conflict (amount already in progress) as a clear message and stays on the form", async () => {
    await openAndCreate({
      [CREATE]: () => fail(409, "CONFLICT", "Amount exceeds what is still due after payments already in progress"),
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Amount exceeds what is still due after payments already in progress");
    expect(screen.getByText(/cannot be collected again/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create QR" })).toBeEnabled();
  });

  it("maps a server amount error onto the amount field", async () => {
    await openAndCreate({
      [CREATE]: () => fail(400, "VALIDATION_FAILED", "Validation failed", [{ field: "amount", message: "Only ₹70 can be collected right now" }]),
    });
    expect(screen.getByLabelText("Amount to collect (₹)")).toHaveAccessibleDescription("Only ₹70 can be collected right now");
  });

  it("explains missing Paytm credentials", async () => {
    await openAndCreate({ [CREATE]: () => fail(503, "PAYMENT_NOT_CONFIGURED", "Paytm not configured") });
    expect(screen.getByRole("alert")).toHaveTextContent(/credentials are missing/);
  });

  it("disables QR creation when the server says Paytm is not configured", async () => {
    mockApi({ [CONFIG]: () => ok(paymentConfig({ provider: "PAYTM_PRODUCTION", simulated: false, configured: false })) });
    renderWithProviders(<PaytmQrModal sale={SALE} open onClose={vi.fn()} />);
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent(/credentials are missing/);
    expect(screen.getByRole("button", { name: "Create QR" })).toBeDisabled();
  });

  it("shows the failure reason with Try again, which returns to the amount form", async () => {
    const { u } = await openAndCreate({
      [CREATE]: () => ok(paymentView({ status: "FAILED", failureReason: "Paytm rejected the request", qrData: null }), 201),
      [STATUS]: () => ok(paymentView({ status: "FAILED", failureReason: "Paytm rejected the request" })),
    });
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("status")).toHaveTextContent("Failed");
    expect(dialog.getByRole("status")).toHaveTextContent("Paytm rejected the request");
    expect(dialog.queryByRole("img", { name: /QR code/ })).not.toBeInTheDocument();
    expect(dialog.queryByRole("button", { name: /simulate/i })).not.toBeInTheDocument();
    await u.click(dialog.getByRole("button", { name: "Try again" }));
    expect(dialog.getByRole("button", { name: "Create QR" })).toBeInTheDocument();
  });

  it("turns Failed when the server reports it while polling", async () => {
    let status: PaymentView["status"] = "PENDING";
    await openAndCreate({
      [CREATE]: () => ok(paymentView(), 201),
      [STATUS]: () => ok(paymentView({ status, failureReason: "Customer declined" })),
    });
    status = "FAILED";
    await advance(3000);
    expect(screen.getByRole("status")).toHaveTextContent("Failed");
    expect(screen.getByRole("status")).toHaveTextContent("Customer declined");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("handles UNKNOWN: explains it, offers Check status and never another QR, keeps polling", async () => {
    let reconciled: PaymentView["status"] = "UNKNOWN";
    const { fn, u } = await openAndCreate({
      [CREATE]: () => ok(paymentView({ status: "UNKNOWN", qrData: null }), 201),
      [STATUS]: () => ok(paymentView({ status: "UNKNOWN", qrData: null })),
      [RECONCILE]: () => ok(paymentView({ status: reconciled, qrData: null })),
    });
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("status")).toHaveTextContent("Not confirmed");
    expect(dialog.getByRole("status")).toHaveTextContent("do not know if the customer paid");
    expect(dialog.queryByRole("img", { name: /QR code/ })).not.toBeInTheDocument();
    expect(dialog.queryByRole("button", { name: /Create QR|Try again/ })).not.toBeInTheDocument();
    expect(dialog.queryByRole("button", { name: /simulate/i })).not.toBeInTheDocument();

    await advance(3000);
    expect(callsTo(fn, STATUS)).toBe(1);

    reconciled = "SUCCESS";
    await u.click(dialog.getByRole("button", { name: "Check status" }));
    await flush();
    expect(callsTo(fn, RECONCILE)).toBe(1);
    expect(dialog.getByRole("status")).toHaveTextContent("Paid");
    expect(dialog.queryByRole("button", { name: "Check status" })).not.toBeInTheDocument();
  });

  it("stops polling and clears its timers when the modal is closed", async () => {
    const fn = mockApi({
      [CONFIG]: () => ok(paymentConfig()),
      [CREATE]: () => ok(paymentView(), 201),
      [STATUS]: () => ok(paymentView()),
    });
    renderWithProviders(<Harness />);
    const u = user();
    await u.click(screen.getByRole("button", { name: "Open" }));
    await flush();
    await u.click(screen.getByRole("button", { name: "Create QR" }));
    await flush();
    await advance(3000);
    expect(callsTo(fn, STATUS)).toBe(1);

    await u.click(screen.getAllByRole("button", { name: "Close" })[1]);
    await flush();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await advance(30_000);
    expect(callsTo(fn, STATUS)).toBe(1);
  });

  it("stops polling when the whole modal unmounts", async () => {
    const { fn, unmount } = await openAndCreate({ [CREATE]: () => ok(paymentView(), 201), [STATUS]: () => ok(paymentView()) });
    unmount();
    await advance(30_000);
    expect(callsTo(fn, STATUS)).toBe(0);
  });

  describe("simulation (MOCK only)", () => {
    it("offers both demo buttons for the mock provider and sends the chosen outcome", async () => {
      const { fn, u } = await openAndCreate({
        [CREATE]: () => ok(paymentView(), 201),
        [STATUS]: () => ok(paymentView()),
        [SIMULATE]: () => ok(paymentView({ status: "SUCCESS" })),
      });
      expect(screen.getByRole("button", { name: "Simulate customer payment (demo)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Simulate failure (demo)" })).toBeInTheDocument();
      await u.click(screen.getByRole("button", { name: "Simulate customer payment (demo)" }));
      await flush();
      expect(bodyOf(fn, SIMULATE)).toEqual({ outcome: "SUCCESS" });
      expect(screen.getByRole("status")).toHaveTextContent("Paid");
      expect(screen.queryByRole("button", { name: /simulate/i })).not.toBeInTheDocument();
    });

    it("sends FAILED for the simulate-failure option", async () => {
      const { fn, u } = await openAndCreate({
        [CREATE]: () => ok(paymentView(), 201),
        [STATUS]: () => ok(paymentView()),
        [SIMULATE]: () => ok(paymentView({ status: "FAILED", failureReason: "Simulated failure" })),
      });
      await u.click(screen.getByRole("button", { name: "Simulate failure (demo)" }));
      await flush();
      expect(bodyOf(fn, SIMULATE)).toEqual({ outcome: "FAILED" });
      expect(screen.getByRole("status")).toHaveTextContent("Failed");
    });

    it.each([
      ["PAYTM_SANDBOX", "PAYTM SANDBOX", "Paytm sandbox"],
      ["PAYTM_PRODUCTION", "PAYTM", "Paytm"],
    ] as const)("never shows simulate buttons or the demo banner in %s mode", async (provider, label, badge) => {
      const real = paymentView({ provider, label, simulated: false, qrData: "upi://pay?pa=x" });
      await openAndCreate({
        [CONFIG]: () => ok(paymentConfig({ provider, simulated: false, environment: provider })),
        [CREATE]: () => ok(real, 201),
        [STATUS]: () => ok(real),
      });
      const dialog = within(screen.getByRole("dialog"));
      expect(dialog.getByRole("img", { name: /QR code to pay ₹120/ })).toBeInTheDocument();
      expect(dialog.getByText(badge)).toBeInTheDocument();
      expect(dialog.queryByRole("button", { name: /simulate/i })).not.toBeInTheDocument();
      expect(dialog.queryByText(/Demo mode/)).not.toBeInTheDocument();
      expect(dialog.queryByText("Simulated")).not.toBeInTheDocument();
    });
  });

  it("shows Verified by Paytm only for a verified payment", async () => {
    const real = verifiedPayment({ id: "pay-1" });
    await openAndCreate({
      [CONFIG]: () => ok(paymentConfig({ provider: "PAYTM_PRODUCTION", simulated: false })),
      [CREATE]: () => ok(real, 201),
      [STATUS]: () => ok(real),
    });
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Verified by Paytm")).toBeInTheDocument();
    expect(dialog.getByRole("status")).toHaveTextContent("Paid");
    expect(dialog.getByRole("status")).not.toHaveTextContent(/simulated|demo/i);
  });

  it("prefers the Paytm-supplied qrImage over rendering qrData", async () => {
    const real = paymentView({ provider: "PAYTM_SANDBOX", label: "PAYTM SANDBOX", simulated: false, qrImage: "iVBORw0KGgo=" });
    await openAndCreate({
      [CONFIG]: () => ok(paymentConfig({ provider: "PAYTM_SANDBOX", simulated: false })),
      [CREATE]: () => ok(real, 201),
      [STATUS]: () => ok(real),
    });
    const image = screen.getByRole("img", { name: /QR code to pay ₹120/ });
    expect(image.tagName).toBe("IMG");
    expect(image).toHaveAttribute("src", "data:image/png;base64,iVBORw0KGgo=");
  });

  it("explains a payment that needs review in plain language", async () => {
    await openAndCreate({
      [CREATE]: () => ok(paymentView({ status: "SUCCESS", needsReview: true, reviewReason: "AMOUNT_MISMATCH" }), 201),
      [STATUS]: () => ok(paymentView({ status: "SUCCESS", needsReview: true, reviewReason: "AMOUNT_MISMATCH" })),
    });
    expect(screen.getByText(/Needs your review: Amount does not match/)).toBeInTheDocument();
    expect(screen.getByText(/different amount than this QR was created for/)).toBeInTheDocument();
  });

  it("is keyboard usable: Escape closes the dialog", async () => {
    const onClose = vi.fn();
    mockApi({ [CONFIG]: () => ok(paymentConfig()) });
    renderWithProviders(<PaytmQrModal sale={SALE} open onClose={onClose} />);
    await flush();
    expect(screen.getByRole("dialog", { name: "Collect via Paytm QR" })).toBeInTheDocument();
    await user().keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});

describe("CollectViaPaytm", () => {
  it("is offered for a completed sale with money due", () => {
    renderWithProviders(<CollectViaPaytm sale={sale()} />);
    expect(screen.getByRole("button", { name: "Collect via Paytm QR" })).toBeInTheDocument();
  });

  it.each([
    ["fully paid", sale({ dueAmount: 0, paymentStatus: "PAID" })],
    ["cancelled", sale({ status: "CANCELLED", paymentStatus: null, dueAmount: 0 })],
  ])("is hidden for a %s sale", (_name, value) => {
    renderWithProviders(<CollectViaPaytm sale={value} />);
    expect(screen.queryByRole("button", { name: "Collect via Paytm QR" })).not.toBeInTheDocument();
  });
});
