import { decimalsOf, parseNumber, roundMoney, roundQuantity } from "@/lib/utils/money";
import type { Product, Unit } from "@/types/product";
import type { CreateSaleInput, CreateSaleItemInput, PaymentMethod } from "@/types/sale";

export interface CartLine {
  productId: string;
  name: string;
  brand: string | null;
  unit: Unit;
  catalogPrice: number;
  stock: number;
  /** Raw text so partially typed values ("1.") survive editing. */
  quantity: string;
  unitPrice: string;
}

export interface PaymentRow {
  id: string;
  method: PaymentMethod;
  amount: string;
}

const DECIMAL_UNITS: ReadonlySet<Unit> = new Set(["KG", "GRAM", "LITRE", "ML"]);
const STEPS: Partial<Record<Unit, number>> = { KG: 0.5, LITRE: 0.5, GRAM: 100, ML: 100 };

export const allowsDecimals = (unit: Unit) => DECIMAL_UNITS.has(unit);
export const stepFor = (unit: Unit) => STEPS[unit] ?? 1;

export const lineFromProduct = (product: Pick<Product, "id" | "name" | "brand" | "unit" | "sellingPrice" | "stockQuantity">): CartLine => ({
  productId: product.id,
  name: product.name,
  brand: product.brand,
  unit: product.unit,
  catalogPrice: product.sellingPrice,
  stock: product.stockQuantity,
  quantity: "1",
  unitPrice: String(product.sellingPrice),
});

export const lineQuantity = (line: CartLine) => parseNumber(line.quantity);
export const linePrice = (line: CartLine) => parseNumber(line.unitPrice);

/** True only when a valid typed price differs from the catalogue price. */
export const isPriceOverridden = (line: CartLine) => {
  const price = linePrice(line);
  return Number.isFinite(price) && roundMoney(price) !== roundMoney(line.catalogPrice);
};

export const exceedsStock = (line: CartLine) => {
  const qty = lineQuantity(line);
  return Number.isFinite(qty) && qty > line.stock;
};

export function lineTotal(line: CartLine): number {
  const qty = lineQuantity(line);
  const price = linePrice(line);
  return Number.isFinite(qty) && Number.isFinite(price) ? roundMoney(qty * price) : 0;
}

export function lineProblem(line: CartLine): string | null {
  const qty = lineQuantity(line);
  if (!Number.isFinite(qty) || qty <= 0) return "Enter a quantity greater than 0";
  if (decimalsOf(line.quantity) > 3) return "Quantity can have at most 3 decimal places";
  if (!allowsDecimals(line.unit) && !Number.isInteger(qty)) return "This item is sold in whole numbers";
  const price = linePrice(line);
  if (!Number.isFinite(price)) return "Enter a valid price";
  if (decimalsOf(line.unitPrice) > 2) return "Price can have at most 2 decimal places";
  return null;
}

export const stepQuantity = (line: CartLine, direction: 1 | -1): string => {
  const current = lineQuantity(line);
  const base = Number.isFinite(current) ? current : 0;
  const next = roundQuantity(base + direction * stepFor(line.unit));
  return String(next > 0 ? next : stepFor(line.unit));
};

export interface CartTotals {
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
}

/** Display-only math; the server's Sale is the source of truth. */
export function cartTotals(lines: CartLine[], discountText: string, payments: PaymentRow[]): CartTotals {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + lineTotal(line), 0));
  const rawDiscount = parseNumber(discountText);
  const discount = Number.isFinite(rawDiscount) ? roundMoney(rawDiscount) : 0;
  const total = roundMoney(Math.max(0, subtotal - discount));
  const paid = roundMoney(payments.reduce((sum, p) => sum + (Number.isFinite(parseNumber(p.amount)) ? parseNumber(p.amount) : 0), 0));
  return { subtotal, discount, total, paid, due: roundMoney(Math.max(0, total - paid)) };
}

export const percentToAmount = (subtotal: number, percentText: string): number | null => {
  const percent = parseNumber(percentText);
  if (!Number.isFinite(percent) || percent > 100) return null;
  return roundMoney((subtotal * percent) / 100);
};

/** Blocking problems for the whole sale (empty when it can be submitted). */
export function saleProblems(lines: CartLine[], totals: CartTotals, discountText: string, payments: PaymentRow[]): string[] {
  const problems: string[] = [];
  if (lines.length === 0) problems.push("Add at least one product.");
  if (lines.some((line) => lineProblem(line))) problems.push("Fix the highlighted items.");
  if (discountText.trim() !== "") {
    const discount = parseNumber(discountText);
    if (!Number.isFinite(discount) || decimalsOf(discountText) > 2) problems.push("Enter a valid discount.");
    else if (discount > totals.subtotal) problems.push("Discount cannot be more than the subtotal.");
  }
  for (const payment of payments) {
    const amount = parseNumber(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0 || decimalsOf(payment.amount) > 2) {
      problems.push("Enter an amount greater than 0 for every payment.");
      break;
    }
  }
  if (totals.paid > totals.total) problems.push("Payments are more than the total.");
  return problems;
}

export function buildSaleInput(args: {
  clientRequestId: string;
  lines: CartLine[];
  customerId: string | null;
  discountText: string;
  payments: PaymentRow[];
  voiceInteractionId?: string;
  /** The QR collects the whole amount, so no manual payments are sent. */
  collectViaPaytm?: boolean;
}): CreateSaleInput {
  const items: CreateSaleItemInput[] = args.lines.map((line) => ({
    productId: line.productId,
    quantity: lineQuantity(line),
    ...(isPriceOverridden(line) ? { unitPrice: roundMoney(linePrice(line)) } : {}),
  }));
  const discount = parseNumber(args.discountText);
  return {
    clientRequestId: args.clientRequestId,
    ...(args.customerId ? { customerId: args.customerId } : {}),
    items,
    ...(Number.isFinite(discount) && discount > 0 ? { discountAmount: roundMoney(discount) } : {}),
    payments: args.collectViaPaytm ? [] : args.payments.map((p) => ({ method: p.method, amount: roundMoney(parseNumber(p.amount)) })),
    ...(args.collectViaPaytm ? { collectViaPaytm: true } : {}),
    ...(args.voiceInteractionId ? { voiceInteractionId: args.voiceInteractionId } : {}),
  };
}
