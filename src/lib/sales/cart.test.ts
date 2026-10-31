import { describe, expect, it } from "vitest";
import {
  allowsDecimals,
  buildSaleInput,
  cartTotals,
  isPriceOverridden,
  lineFromProduct,
  lineProblem,
  percentToAmount,
  saleProblems,
  stepQuantity,
  type CartLine,
  type PaymentRow,
} from "./cart";
import { product } from "@/test/utils";

const salt = (overrides: Partial<CartLine> = {}): CartLine => ({
  ...lineFromProduct(product({ id: "p-salt", name: "Tata Salt", unit: "KG", sellingPrice: 28, stockQuantity: 40 })),
  ...overrides,
});
const cash = (amount: string): PaymentRow => ({ id: "r1", method: "CASH", amount });

describe("cart math", () => {
  it("computes subtotal, discount, total, paid and due without float noise", () => {
    const lines = [salt({ quantity: "2.5" }), salt({ productId: "p-2", quantity: "3", unitPrice: "19.9" })];
    const totals = cartTotals(lines, "10", [cash("50")]);
    expect(totals).toEqual({ subtotal: 129.7, discount: 10, total: 119.7, paid: 50, due: 69.7 });
  });

  it("converts a percentage into rupees of the subtotal", () => {
    expect(percentToAmount(250, "10")).toBe(25);
    expect(percentToAmount(199, "5")).toBe(9.95);
    expect(percentToAmount(100, "101")).toBeNull();
    expect(percentToAmount(100, "abc")).toBeNull();
  });

  it("allows decimals only for weight/volume units", () => {
    expect(["KG", "GRAM", "LITRE", "ML"].every((u) => allowsDecimals(u as never))).toBe(true);
    expect(["PIECE", "PACKET", "DOZEN", "BOX", "BOTTLE"].some((u) => allowsDecimals(u as never))).toBe(false);
    expect(lineProblem(salt({ quantity: "1.5" }))).toBeNull();
    expect(lineProblem(salt({ unit: "PACKET", quantity: "1.5" }))).toBe("This item is sold in whole numbers");
    expect(lineProblem(salt({ quantity: "0" }))).toBe("Enter a quantity greater than 0");
    expect(lineProblem(salt({ quantity: "1.2345" }))).toMatch(/3 decimal places/);
  });

  it("steps quantities by unit and never below one step", () => {
    expect(stepQuantity(salt({ quantity: "1" }), 1)).toBe("1.5");
    expect(stepQuantity(salt({ quantity: "0.5" }), -1)).toBe("0.5");
    expect(stepQuantity(salt({ unit: "PIECE", quantity: "3" }), 1)).toBe("4");
  });

  it("reports blocking sale problems", () => {
    const lines = [salt({ quantity: "2" })];
    const totals = cartTotals(lines, "", [cash("100")]);
    expect(saleProblems([], cartTotals([], "", []), "", [])).toContain("Add at least one product.");
    expect(saleProblems(lines, totals, "", [cash("100")])).toContain("Payments are more than the total.");
    expect(saleProblems(lines, cartTotals(lines, "", []), "999", [])).toContain("Discount cannot be more than the subtotal.");
  });
});

describe("buildSaleInput", () => {
  it("sends unitPrice only for lines whose price was changed", () => {
    const lines = [salt({ quantity: "2" }), salt({ productId: "p-2", quantity: "1", unitPrice: "25" })];
    expect(isPriceOverridden(lines[0])).toBe(false);
    expect(isPriceOverridden(lines[1])).toBe(true);
    const input = buildSaleInput({
      clientRequestId: "req-1",
      lines,
      customerId: null,
      discountText: "",
      payments: [cash("81")],
    });
    expect(input).toEqual({
      clientRequestId: "req-1",
      items: [
        { productId: "p-salt", quantity: 2 },
        { productId: "p-2", quantity: 1, unitPrice: 25 },
      ],
      payments: [{ method: "CASH", amount: 81 }],
    });
    expect("unitPrice" in input.items[0]).toBe(false);
  });

  it("includes customer and a positive discount", () => {
    const input = buildSaleInput({
      clientRequestId: "r",
      lines: [salt({ quantity: "1" })],
      customerId: "c-1",
      discountText: "3",
      payments: [],
    });
    expect(input.customerId).toBe("c-1");
    expect(input.discountAmount).toBe(3);
  });
});
