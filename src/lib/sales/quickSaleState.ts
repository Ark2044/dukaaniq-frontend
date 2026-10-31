import { stepQuantity, lineFromProduct, type CartLine, type PaymentRow } from "./cart";
import type { PickerOption } from "@/components/common/SearchPicker";
import type { Product } from "@/types/product";
import type { PaymentMethod } from "@/types/sale";

export interface QuickSaleState {
  /** Idempotency key: stable across retries, renewed only by `reset`. */
  clientRequestId: string;
  lines: CartLine[];
  customer: PickerOption | null;
  discount: string;
  payments: PaymentRow[];
  /** The unpaid amount the merchant explicitly accepted for a walk-in sale; any change to the amount voids it. */
  confirmedUnpaid: number | null;
  /** Pay by Paytm QR at confirmation: no manual payment rows, the QR collects the whole amount. */
  collectViaPaytm: boolean;
  /** Server-reported problems keyed by productId (e.g. INSUFFICIENT_STOCK). */
  lineErrors: Record<string, string>;
}

export type QuickSaleAction =
  | { type: "addProduct"; product: Pick<Product, "id" | "name" | "brand" | "unit" | "sellingPrice" | "stockQuantity"> }
  | { type: "step"; productId: string; direction: 1 | -1 }
  | { type: "setQuantity"; productId: string; value: string }
  | { type: "setPrice"; productId: string; value: string }
  | { type: "removeLine"; productId: string }
  | { type: "setCustomer"; customer: PickerOption | null }
  | { type: "setDiscount"; value: string }
  | { type: "setPayments"; payments: PaymentRow[] }
  | { type: "setPaymentMethod"; id: string; method: PaymentMethod }
  | { type: "setPaymentAmount"; id: string; value: string }
  | { type: "removePayment"; id: string }
  | { type: "confirmUnpaid"; due: number | null }
  | { type: "setCollectViaPaytm"; value: boolean }
  | { type: "renewRequest"; clientRequestId: string }
  | { type: "setLineErrors"; errors: Record<string, string> }
  | { type: "reset"; clientRequestId: string };

export const initialQuickSale = (clientRequestId: string): QuickSaleState => ({
  clientRequestId,
  lines: [],
  customer: null,
  discount: "",
  payments: [],
  confirmedUnpaid: null,
  collectViaPaytm: false,
  lineErrors: {},
});

const withoutKey = (errors: Record<string, string>, key: string) => {
  const rest = { ...errors };
  delete rest[key];
  return rest;
};

const mapLine = (state: QuickSaleState, productId: string, change: (line: CartLine) => CartLine): QuickSaleState => ({
  ...state,
  lines: state.lines.map((line) => (line.productId === productId ? change(line) : line)),
});

export function quickSaleReducer(state: QuickSaleState, action: QuickSaleAction): QuickSaleState {
  switch (action.type) {
    case "addProduct": {
      const existing = state.lines.find((l) => l.productId === action.product.id);
      if (existing) {
        return {
          ...mapLine(state, existing.productId, (l) => ({ ...l, quantity: stepQuantity(l, 1) })),
          lineErrors: withoutKey(state.lineErrors, existing.productId),
        };
      }
      return { ...state, lines: [...state.lines, lineFromProduct(action.product)] };
    }
    case "step":
      return {
        ...mapLine(state, action.productId, (l) => ({ ...l, quantity: stepQuantity(l, action.direction) })),
        lineErrors: withoutKey(state.lineErrors, action.productId),
      };
    case "setQuantity":
      return {
        ...mapLine(state, action.productId, (l) => ({ ...l, quantity: action.value })),
        lineErrors: withoutKey(state.lineErrors, action.productId),
      };
    case "setPrice":
      return mapLine(state, action.productId, (l) => ({ ...l, unitPrice: action.value }));
    case "removeLine":
      return {
        ...state,
        lines: state.lines.filter((l) => l.productId !== action.productId),
        lineErrors: withoutKey(state.lineErrors, action.productId),
      };
    case "setCustomer":
      return { ...state, customer: action.customer };
    case "setDiscount":
      return { ...state, discount: action.value };
    case "setPayments":
      return { ...state, payments: action.payments };
    case "setPaymentMethod":
      return { ...state, payments: state.payments.map((p) => (p.id === action.id ? { ...p, method: action.method } : p)) };
    case "setPaymentAmount":
      return { ...state, payments: state.payments.map((p) => (p.id === action.id ? { ...p, amount: action.value } : p)) };
    case "removePayment":
      return { ...state, payments: state.payments.filter((p) => p.id !== action.id) };
    case "confirmUnpaid":
      return { ...state, confirmedUnpaid: action.due };
    case "setCollectViaPaytm":
      // The server rejects manual payments mixed with a QR sale, so choosing the QR empties them.
      return { ...state, collectViaPaytm: action.value, payments: action.value ? [] : state.payments, confirmedUnpaid: null };
    case "renewRequest":
      // A cancelled sale keeps its clientRequestId forever; starting again needs a fresh one.
      return { ...state, clientRequestId: action.clientRequestId, lineErrors: {} };
    case "setLineErrors":
      return { ...state, lineErrors: action.errors };
    case "reset":
      return initialQuickSale(action.clientRequestId);
  }
}
