import type { BusinessCategory, Language } from "@/types/merchant";
import type { Unit } from "@/types/product";

export const BUSINESS_CATEGORY_OPTIONS: ReadonlyArray<{ value: BusinessCategory; label: string }> = [
  { value: "KIRANA", label: "Kirana store" },
  { value: "GENERAL_STORE", label: "General store" },
  { value: "OTHER", label: "Other" },
];

export const LANGUAGE_OPTIONS: ReadonlyArray<{ value: Language; label: string }> = [
  { value: "EN", label: "English" },
  { value: "HI", label: "हिन्दी" },
  { value: "MR", label: "मराठी" },
];

export const UNIT_OPTIONS: ReadonlyArray<{ value: Unit; label: string }> = [
  { value: "PIECE", label: "Piece" },
  { value: "PACKET", label: "Packet" },
  { value: "KG", label: "Kilogram (kg)" },
  { value: "GRAM", label: "Gram (g)" },
  { value: "LITRE", label: "Litre (L)" },
  { value: "ML", label: "Millilitre (ml)" },
  { value: "DOZEN", label: "Dozen" },
  { value: "BOX", label: "Box" },
  { value: "BOTTLE", label: "Bottle" },
];

export const UNIT_SHORT_LABELS: Record<Unit, string> = {
  PIECE: "pc",
  PACKET: "packet",
  KG: "kg",
  GRAM: "g",
  LITRE: "L",
  ML: "ml",
  DOZEN: "dozen",
  BOX: "box",
  BOTTLE: "bottle",
};

export type PaymentMethodValue = "CASH" | "UPI" | "CARD";

export const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{ value: PaymentMethodValue; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI (recorded by you)" },
  { value: "CARD", label: "Card" },
];

export const PAYMENT_METHOD_LABELS: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", PAYTM: "Paytm" };

export const UPI_EXPLANATION = "Customer paid by UPI — recorded by you. It is not verified by a payment provider.";

export const REFUND_METHOD_OPTIONS = PAYMENT_METHOD_OPTIONS.map((o) => ({ value: o.value, label: PAYMENT_METHOD_LABELS[o.value] }));

export const ADJUSTMENT_REASON_OPTIONS = [
  { value: "DAMAGE", label: "Damaged" },
  { value: "LOSS", label: "Lost or stolen" },
  { value: "COUNT_CORRECTION", label: "Stock count correction" },
  { value: "OTHER", label: "Other" },
] as const;

export const MOVEMENT_TYPE_OPTIONS = [
  { value: "IN", label: "Stock in" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "OUT", label: "Sold / out" },
  { value: "RETURN", label: "Return" },
  { value: "ADJUSTMENT", label: "Adjustment" },
] as const;

export const MOVEMENT_REASON_LABELS: Record<string, string> = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  SALE_RETURN: "Sale return",
  DAMAGE: "Damaged",
  LOSS: "Lost or stolen",
  COUNT_CORRECTION: "Count correction",
  OTHER: "Other",
  OPENING_STOCK: "Opening stock",
};
