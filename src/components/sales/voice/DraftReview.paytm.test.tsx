import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DraftReview } from "./DraftReview";
import { fail, mockApi, ok, page, product, renderWithProviders } from "@/test/utils";
import { paymentConfig, paymentView, pendingSale } from "@/test/m4Fixtures";
import { voiceDraft } from "@/test/m5Fixtures";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/sales/voice" }));

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => router.push.mockClear());

interface SaleBody {
  clientRequestId: string;
  voiceInteractionId?: string;
  items: Array<{ productId: string; quantity: number }>;
  payments: unknown[];
  collectViaPaytm?: boolean;
}

const sugar = product({ id: "p-sugar", name: "Sugar", brand: null, unit: "KG", sellingPrice: 45, stockQuantity: 48 });
const WAITING = pendingSale({ id: "s-7", saleNumber: "S-000777", source: "VOICE", totalAmount: 90, netAmount: 90, subtotal: 90, dueAmount: 90 });

function setup(saleHandler?: (call: number) => Response) {
  const saleBodies: SaleBody[] = [];
  const qrBodies: unknown[] = [];
  let paymentStatus: "FAILED" | "PENDING" = "PENDING";
  mockApi({
    "GET /api/v1/products": () => ok(page([sugar])),
    "GET /api/v1/customers": () => ok(page([])),
    "POST /api/v1/sales": ({ init }) => {
      saleBodies.push(JSON.parse(String(init.body)));
      return saleHandler ? saleHandler(saleBodies.length) : ok(WAITING, 201);
    },
    "GET /api/v1/sales/s-7": () => ok(paymentStatus === "FAILED" ? { ...WAITING, status: "CANCELLED", paymentStatus: null } : WAITING),
    "GET /api/v1/payments/config": () => ok(paymentConfig()),
    "POST /api/v1/payments/paytm/qr": ({ init }) => {
      qrBodies.push(JSON.parse(String(init.body)));
      return ok(paymentView({ saleId: "s-7", saleNumber: "S-000777", amount: 90, expiresAt: "2099-01-01T00:00:00Z" }), 201);
    },
    "GET /api/v1/payments/pay-1/status": () => ok(paymentView({ saleId: "s-7", amount: 90, status: paymentStatus, expiresAt: "2099-01-01T00:00:00Z" })),
    "POST /api/v1/payments/pay-1/simulate": () => {
      paymentStatus = "FAILED";
      return ok(paymentView({ saleId: "s-7", amount: 90, status: "FAILED" }));
    },
  });
  const onStartOver = vi.fn();
  renderWithProviders(<DraftReview draft={voiceDraft()} rechecking={false} recheckError={null} onRecheck={vi.fn()} onStartOver={onStartOver} />);
  return { saleBodies, qrBodies, onStartOver };
}

const confirmButton = () => screen.getByRole("button", { name: /Confirm and show QR|Confirm sale|Saving sale/ });
const choosePaytm = () => userEvent.click(screen.getByRole("radio", { name: "Paytm QR" }));

describe("DraftReview — pay by Paytm QR", () => {
  it("offers Paytm QR next to cash, UPI and credit and explains it, relabelling Confirm", async () => {
    setup();
    expect(screen.getByRole("radio", { name: "Cash" })).toBeChecked();
    await choosePaytm();
    expect(screen.getByRole("radio", { name: "Paytm QR" })).toBeChecked();
    expect(screen.getByText(/The customer scans a Paytm QR for ₹90 on the next screen/)).toBeInTheDocument();
    expect(confirmButton()).toHaveTextContent("Confirm and show QR · ₹90");
    expect(confirmButton()).toBeEnabled();
  });

  it("confirms with voiceInteractionId and collectViaPaytm and no payments, then opens the QR for the returned sale", async () => {
    const { saleBodies, qrBodies } = setup();
    await choosePaytm();
    await userEvent.click(confirmButton());

    const dialog = within(await screen.findByRole("dialog"));
    expect(await dialog.findByRole("img", { name: /QR code to pay ₹90/ })).toBeInTheDocument();
    expect(saleBodies).toHaveLength(1);
    expect(saleBodies[0].voiceInteractionId).toBe("d-1");
    expect(saleBodies[0].collectViaPaytm).toBe(true);
    expect(saleBodies[0].payments).toEqual([]);
    expect(saleBodies[0].items).toEqual([{ productId: "p-sugar", quantity: 2 }]);
    expect(qrBodies).toEqual([{ saleId: "s-7" }]);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("reuses the same clientRequestId when Confirm is retried after a failure", async () => {
    const { saleBodies } = setup((call) => (call === 1 ? fail(500, "INTERNAL_ERROR", "Database is down") : ok(WAITING, 200)));
    await choosePaytm();
    await userEvent.click(confirmButton());
    expect(await screen.findByText("Database is down")).toBeInTheDocument();
    await userEvent.click(confirmButton());
    await screen.findByRole("dialog");
    expect(saleBodies).toHaveLength(2);
    expect(saleBodies[1].clientRequestId).toBe(saleBodies[0].clientRequestId);
    expect(saleBodies[1].collectViaPaytm).toBe(true);
  });

  it("explains missing Paytm credentials and stays on the review screen", async () => {
    const { qrBodies } = setup(() => fail(503, "PAYMENT_NOT_CONFIGURED", "Paytm not configured"));
    await choosePaytm();
    await userEvent.click(confirmButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(/Paytm QR is not set up for this shop yet.*Nothing was saved/);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(qrBodies).toHaveLength(0);
    expect(confirmButton()).toBeEnabled();
  });

  it("a failed payment shows the cancelled message and Start again returns to speaking", async () => {
    const { onStartOver } = setup();
    await choosePaytm();
    await userEvent.click(confirmButton());
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.click(await dialog.findByRole("button", { name: "Simulate failure (demo)" }));
    expect(await dialog.findByText(/Payment not received — this sale was cancelled and the stock was restored/)).toBeInTheDocument();
    await waitFor(() => expect(dialog.getByRole("button", { name: "Start again" })).toBeInTheDocument());
    await userEvent.click(dialog.getByRole("button", { name: "Start again" }));
    expect(onStartOver).toHaveBeenCalled();
  });
});
