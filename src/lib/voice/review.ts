import { lineFromProduct, lineProblem, lineQuantity, stepQuantity, type CartLine, type PaymentRow } from "@/lib/sales/cart";
import { UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { formatQuantity } from "@/lib/utils/format";
import type { PickerOption } from "@/components/common/SearchPicker";
import type { DraftLine, DraftOption, DraftOptionWarning, PaymentHint, VoiceDraft } from "@/types/ai";
import type { Product, Unit } from "@/types/product";

/** The catalogue product behind a line. Price and stock only ever come from the catalogue, never from speech. */
export interface ChosenProduct {
  productId: string;
  name: string;
  brand: string | null;
  unit: Unit;
  sellingPrice: number;
  stockQuantity: number;
}

export interface ReviewLine {
  key: string;
  origin: "SPOKEN" | "MANUAL";
  /** What the merchant said, e.g. "2 kg chini"; empty for lines added by hand. */
  spoken: string;
  spokenName: string;
  spokenQuantity: number | null;
  spokenUnit: string | null;
  options: DraftOption[];
  product: ChosenProduct | null;
  /** Raw text so partially typed values survive editing. */
  quantity: string;
  warnings: DraftOptionWarning[];
  quantityEdited: boolean;
  /** The merchant looked at a line the server flagged and said it is right (or changed it). */
  checked: boolean;
  needsReview: boolean;
}

export type LineIssueCode = "AMBIGUOUS" | "NOT_FOUND" | "QUANTITY_MISSING" | "UNIT_MISMATCH" | "INVALID_QUANTITY" | "INSUFFICIENT_STOCK" | "NEEDS_CHECK";

export interface LineIssue {
  code: LineIssueCode;
  message: string;
}

export type CustomerResolution = "NONE_MENTIONED" | "MATCHED" | "AMBIGUOUS" | "NOT_FOUND";

/** What the draft's spoken payment hint can become on screen: a recorded method, credit, or a Paytm QR to scan. */
export type PaymentChoice = PaymentHint | "PAYTM_QR";

export interface ReviewState {
  lines: ReviewLine[];
  customer: PickerOption | null;
  /** The merchant explicitly chose walk-in for a spoken name that was ambiguous, not found or removed. */
  customerSkipped: boolean;
  payment: PaymentChoice | null;
  /** Idempotency key: stable across Confirm retries, new for every draft. */
  clientRequestId: string;
  /** Server-reported problems keyed by productId (e.g. INSUFFICIENT_STOCK). */
  lineErrors: Record<string, string>;
}

export type ReviewAction =
  | { type: "pickOption"; key: string; productId: string }
  | { type: "pickProduct"; key: string; product: Product }
  | { type: "setQuantity"; key: string; value: string }
  | { type: "step"; key: string; direction: 1 | -1 }
  | { type: "check"; key: string }
  | { type: "removeLine"; key: string }
  | { type: "addProduct"; product: Product }
  | { type: "setCustomer"; customer: PickerOption | null }
  | { type: "skipCustomer" }
  | { type: "setPayment"; payment: PaymentChoice }
  | { type: "setLineErrors"; errors: Record<string, string> };

const toChosen = (source: DraftOption | Product): ChosenProduct =>
  "productId" in source
    ? {
        productId: source.productId,
        name: source.name,
        brand: source.brand,
        unit: source.unit,
        sellingPrice: source.sellingPrice,
        stockQuantity: source.stockQuantity,
      }
    : {
        productId: source.id,
        name: source.name,
        brand: source.brand,
        unit: source.unit,
        sellingPrice: source.sellingPrice,
        stockQuantity: source.stockQuantity,
      };

const spokenText = (line: DraftLine) =>
  [line.spokenQuantity !== null ? formatQuantity(line.spokenQuantity) : null, line.spokenUnit, line.spokenName].filter(Boolean).join(" ");

function lineFromDraft(line: DraftLine, index: number): ReviewLine {
  const selected = line.status === "MATCHED" ? line.selected : null;
  return {
    key: `spoken-${index}`,
    origin: "SPOKEN",
    spoken: spokenText(line),
    spokenName: line.spokenName,
    spokenQuantity: line.spokenQuantity,
    spokenUnit: line.spokenUnit,
    options: line.options,
    product: selected ? toChosen(selected) : null,
    quantity: selected?.quantity != null ? String(selected.quantity) : "",
    warnings: selected?.warnings ?? [],
    quantityEdited: false,
    checked: false,
    needsReview: line.needsReview || (selected?.warnings.length ?? 0) > 0,
  };
}

export function initialReviewState(draft: VoiceDraft, clientRequestId: string): ReviewState {
  const customer = draft.customer?.status === "MATCHED" && draft.customer.selected ? draft.customer.selected : null;
  return {
    lines: draft.lines.map(lineFromDraft),
    customer: customer ? { id: customer.customerId, label: customer.name } : null,
    customerSkipped: false,
    payment: draft.paymentHint,
    clientRequestId,
    lineErrors: {},
  };
}

const withoutKey = (errors: Record<string, string>, key: string | undefined) => {
  if (!key) return errors;
  const rest = { ...errors };
  delete rest[key];
  return rest;
};

const mapLine = (state: ReviewState, key: string, change: (line: ReviewLine) => ReviewLine): ReviewState => {
  const target = state.lines.find((l) => l.key === key);
  return {
    ...state,
    lines: state.lines.map((l) => (l.key === key ? change(l) : l)),
    lineErrors: withoutKey(state.lineErrors, target?.product?.productId),
  };
};

export const reviewReducer = (state: ReviewState, action: ReviewAction): ReviewState => {
  switch (action.type) {
    case "pickOption":
      return mapLine(state, action.key, (line) => {
        const option = line.options.find((o) => o.productId === action.productId);
        if (!option) return line;
        return {
          ...line,
          product: toChosen(option),
          quantity: option.quantity != null ? String(option.quantity) : "",
          warnings: option.warnings,
          quantityEdited: false,
          checked: true,
        };
      });
    case "pickProduct":
      return mapLine(state, action.key, (line) => {
        // Only a quantity the merchant said without a unit is carried over; otherwise they enter it.
        const carryQuantity = line.spokenQuantity !== null && line.spokenUnit === null;
        return {
          ...line,
          product: toChosen(action.product),
          quantity: carryQuantity ? String(line.spokenQuantity) : "",
          warnings: carryQuantity ? [] : ["QUANTITY_MISSING"],
          quantityEdited: false,
          checked: true,
        };
      });
    case "setQuantity":
      return mapLine(state, action.key, (line) => ({ ...line, quantity: action.value, quantityEdited: true, checked: true }));
    case "step":
      return mapLine(state, action.key, (line) => {
        if (!line.product) return line;
        return { ...line, quantity: stepQuantity(toCartLine(line, line.product), action.direction), quantityEdited: true, checked: true };
      });
    case "check":
      return mapLine(state, action.key, (line) => ({ ...line, checked: true }));
    case "removeLine":
      return {
        ...state,
        lines: state.lines.filter((l) => l.key !== action.key),
        lineErrors: withoutKey(
          state.lineErrors,
          state.lines.find((l) => l.key === action.key)?.product?.productId,
        ),
      };
    case "addProduct": {
      const existing = state.lines.find((l) => l.product?.productId === action.product.id);
      if (existing) return reviewReducer(state, { type: "step", key: existing.key, direction: 1 });
      const base = lineFromProduct(action.product);
      const line: ReviewLine = {
        key: `manual-${crypto.randomUUID()}`,
        origin: "MANUAL",
        spoken: "",
        spokenName: "",
        spokenQuantity: null,
        spokenUnit: null,
        options: [],
        product: toChosen(action.product),
        quantity: base.quantity,
        warnings: [],
        quantityEdited: true,
        checked: true,
        needsReview: false,
      };
      return { ...state, lines: [...state.lines, line] };
    }
    case "setCustomer":
      return { ...state, customer: action.customer, customerSkipped: action.customer === null ? state.customerSkipped : false };
    case "skipCustomer":
      return { ...state, customer: null, customerSkipped: true };
    case "setPayment":
      return { ...state, payment: action.payment };
    case "setLineErrors":
      return { ...state, lineErrors: action.errors };
  }
};

export function toCartLine(line: ReviewLine, product: ChosenProduct): CartLine {
  return {
    ...lineFromProduct({
      id: product.productId,
      name: product.name,
      brand: product.brand,
      unit: product.unit,
      sellingPrice: product.sellingPrice,
      stockQuantity: product.stockQuantity,
    }),
    quantity: line.quantity,
  };
}

/** Cart lines for every line that has a product; the unit price is always the catalogue price. */
export const toCartLines = (lines: ReviewLine[]): CartLine[] =>
  lines.flatMap((line) => (line.product ? [toCartLine(line, line.product)] : []));

/** What stops one line from being sold, in plain language; null when the line is ready. */
export function lineIssue(line: ReviewLine): LineIssue | null {
  const product = line.product;
  if (!product) {
    return line.options.length > 0
      ? { code: "AMBIGUOUS", message: `“${line.spokenName}” could be more than one product. Pick the right one.` }
      : { code: "NOT_FOUND", message: `We could not find “${line.spokenName || "this item"}” in your products. Search for it, or remove the line.` };
  }
  const unit = UNIT_SHORT_LABELS[product.unit];
  if (line.warnings.includes("UNIT_MISMATCH") && !line.quantityEdited) {
    return {
      code: "UNIT_MISMATCH",
      message: `You said “${line.spoken}”, but ${product.name} is sold per ${unit}. Enter how many ${unit} to sell.`,
    };
  }
  const quantity = lineQuantity(toCartLine(line, product));
  if (line.quantity.trim() === "") {
    return { code: "QUANTITY_MISSING", message: `No quantity was heard. Enter how many ${unit} to sell.` };
  }
  const problem = lineProblem(toCartLine(line, product));
  if (problem) return { code: "INVALID_QUANTITY", message: problem };
  if (quantity > product.stockQuantity) {
    return {
      code: "INSUFFICIENT_STOCK",
      message: `Only ${formatQuantity(product.stockQuantity)} ${unit} in stock. Reduce the quantity or remove the line.`,
    };
  }
  if (line.needsReview && !line.checked) {
    return { code: "NEEDS_CHECK", message: "Please check this line against what you said, then tap “Looks right”." };
  }
  return null;
}

const NO_TOTAL_CODES: ReadonlySet<LineIssueCode> = new Set(["AMBIGUOUS", "NOT_FOUND", "QUANTITY_MISSING", "UNIT_MISMATCH", "INVALID_QUANTITY"]);

/** Without a usable quantity there is no honest line total, so such lines add nothing to the running total. */
export const hasLineTotal = (line: ReviewLine): boolean => {
  const issue = lineIssue(line);
  return line.product !== null && !(issue && NO_TOTAL_CODES.has(issue.code));
};

/** Gentle notes that do not block confirming. */
export function lineNotes(line: ReviewLine): string[] {
  if (!line.product || !line.warnings.includes("UNIT_ASSUMED") || line.quantityEdited) return [];
  return [`You did not say a unit, so ${UNIT_SHORT_LABELS[line.product.unit]} was assumed. Check the quantity.`];
}

export function customerResolution(draft: VoiceDraft): CustomerResolution {
  return draft.customer ? draft.customer.status : "NONE_MENTIONED";
}

export interface ReviewProblems {
  /** Plain reasons the Confirm button is disabled, in reading order. */
  reasons: string[];
  duplicateProducts: string[];
}

export function reviewProblems(draft: VoiceDraft, state: ReviewState): ReviewProblems {
  const reasons: string[] = [];
  if (state.lines.length === 0) reasons.push("Add at least one item.");
  const unresolved = state.lines.filter((line) => lineIssue(line) !== null).length;
  if (unresolved > 0) reasons.push(`${unresolved} ${unresolved === 1 ? "item needs" : "items need"} your attention.`);

  const resolution = customerResolution(draft);
  if (resolution !== "NONE_MENTIONED" && resolution !== "MATCHED" && !state.customer && !state.customerSkipped) {
    reasons.push(`Choose the customer for “${draft.customer?.spokenName ?? ""}”, or skip to sell to a walk-in.`);
  }
  if (!state.payment) reasons.push("Choose how the customer is paying.");
  else if (state.payment === "CREDIT" && !state.customer) reasons.push("Credit (udhaar) needs a customer. Choose or add one.");

  const seen = new Map<string, number>();
  for (const line of state.lines) {
    if (line.product) seen.set(line.product.name, (seen.get(line.product.name) ?? 0) + 1);
  }
  const duplicateProducts = [...seen.entries()].filter(([, count]) => count > 1).map(([name]) => name);
  return { reasons, duplicateProducts };
}

/** CASH/UPI record the full total as paid; CREDIT and PAYTM_QR record nothing (the QR collects the money later). */
export function paymentRows(payment: PaymentChoice | null, total: number): PaymentRow[] {
  if (payment === "CASH" || payment === "UPI") return [{ id: "voice-payment", method: payment, amount: String(total) }];
  return [];
}
