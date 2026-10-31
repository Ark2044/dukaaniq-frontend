import { afterEach, describe, expect, it, vi } from "vitest";
import { createSale } from "./sales";
import { ApiClientError } from "./client";
import type { CreateSaleInput, Sale } from "@/types/sale";

const input = (collectViaPaytm?: boolean) =>
  ({ items: [{ productId: "p1", quantity: 1 }], payments: [], collectViaPaytm }) as unknown as CreateSaleInput;

const respondWith = (sale: Partial<Sale>) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ success: true, data: { saleNumber: "S-000094", ...sale } }), { status: 201 })),
  );

afterEach(() => vi.unstubAllGlobals());

describe("createSale", () => {
  it("returns a waiting sale when Paytm QR was requested", async () => {
    respondWith({ status: "PENDING_PAYMENT", dueAmount: 100 });
    await expect(createSale(input(true))).resolves.toMatchObject({ status: "PENDING_PAYMENT" });
  });

  it("refuses to treat an unpaid completed sale as a Paytm sale: the server is out of date", async () => {
    respondWith({ status: "COMPLETED", dueAmount: 265 });
    const error = await createSale(input(true)).catch((e) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.code).toBe("SERVER_OUT_OF_DATE");
    expect(error.message).toContain("S-000094");
    expect(error.message).toContain("Restart the backend");
  });

  it("accepts a replayed Paytm sale that has since been paid or cancelled", async () => {
    respondWith({ status: "COMPLETED", dueAmount: 0 });
    await expect(createSale(input(true))).resolves.toMatchObject({ status: "COMPLETED" });
    respondWith({ status: "CANCELLED", dueAmount: 0 });
    await expect(createSale(input(true))).resolves.toMatchObject({ status: "CANCELLED" });
  });

  it("does not interfere with ordinary unpaid (credit) sales", async () => {
    respondWith({ status: "COMPLETED", dueAmount: 265 });
    await expect(createSale(input(false))).resolves.toMatchObject({ status: "COMPLETED" });
    await expect(createSale(input(undefined))).resolves.toMatchObject({ status: "COMPLETED" });
  });
});
