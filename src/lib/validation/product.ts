import { z } from "zod";
import { blankToNull, numberText, optionalText, requiredText, textToNumberOrNull } from "./fields";
import type { Product, ProductCreateInput, ProductUpdateInput } from "@/types/product";

export const MAX_ALIASES = 20;
export const MAX_ALIAS_LENGTH = 60;

export const productSchema = z.object({
  name: requiredText("Product name", 1, 150),
  brand: optionalText("Brand", 80),
  category: optionalText("Category", 80),
  sku: optionalText("SKU", 40),
  barcode: optionalText("Barcode", 32),
  unit: z.enum(["PIECE", "PACKET", "KG", "GRAM", "LITRE", "ML", "DOZEN", "BOX", "BOTTLE"], {
    error: "Choose a unit",
  }),
  packSize: numberText("Pack size", { exclusiveMin: 0, maxDecimals: 3 }),
  sellingPrice: numberText("Selling price", { required: true, min: 0, maxDecimals: 2 }),
  costPrice: numberText("Cost price", { min: 0, maxDecimals: 2 }),
  stockQuantity: numberText("Opening stock", { min: 0, maxDecimals: 3 }),
  reorderLevel: numberText("Reorder level", { min: 0, maxDecimals: 3 }),
  aliases: z
    .array(z.string().trim().min(1, "Aliases cannot be empty").max(MAX_ALIAS_LENGTH, `Aliases must be at most ${MAX_ALIAS_LENGTH} characters`))
    .max(MAX_ALIASES, `You can add at most ${MAX_ALIASES} aliases`),
  active: z.boolean(),
});
export type ProductFormValues = z.infer<typeof productSchema>;

export const PRODUCT_FORM_FIELDS = [
  "name",
  "brand",
  "category",
  "sku",
  "barcode",
  "unit",
  "packSize",
  "sellingPrice",
  "costPrice",
  "stockQuantity",
  "reorderLevel",
  "aliases",
  "active",
] as const satisfies ReadonlyArray<keyof ProductFormValues>;

export const emptyProductForm: ProductFormValues = {
  name: "",
  brand: "",
  category: "",
  sku: "",
  barcode: "",
  unit: "PIECE",
  packSize: "",
  sellingPrice: "",
  costPrice: "",
  stockQuantity: "",
  reorderLevel: "",
  aliases: [],
  active: true,
};

export const productToFormValues = (p: Product): ProductFormValues => ({
  name: p.name,
  brand: p.brand ?? "",
  category: p.category ?? "",
  sku: p.sku,
  barcode: p.barcode ?? "",
  unit: p.unit,
  packSize: p.packSize === null ? "" : String(p.packSize),
  sellingPrice: String(p.sellingPrice),
  costPrice: p.costPrice === null ? "" : String(p.costPrice),
  stockQuantity: "",
  reorderLevel: String(p.reorderLevel),
  aliases: p.aliases.map((a) => a.alias),
  active: p.active,
});

export const toProductCreateInput = (v: ProductFormValues): ProductCreateInput => ({
  name: v.name.trim(),
  brand: blankToNull(v.brand),
  category: blankToNull(v.category),
  sku: blankToNull(v.sku),
  barcode: blankToNull(v.barcode),
  unit: v.unit,
  packSize: textToNumberOrNull(v.packSize),
  sellingPrice: Number(v.sellingPrice),
  costPrice: textToNumberOrNull(v.costPrice),
  stockQuantity: textToNumberOrNull(v.stockQuantity) ?? 0,
  reorderLevel: textToNumberOrNull(v.reorderLevel) ?? 0,
  aliases: v.aliases.map((a) => a.trim()),
});

export function toProductUpdateInput(v: ProductFormValues): ProductUpdateInput {
  const { stockQuantity, ...rest } = toProductCreateInput(v);
  void stockQuantity;
  return { ...rest, active: v.active };
}
