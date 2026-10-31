export type Unit = "PIECE" | "PACKET" | "KG" | "GRAM" | "LITRE" | "ML" | "DOZEN" | "BOX" | "BOTTLE";

export interface ProductAlias {
  id: string;
  alias: string;
}

export interface Product {
  id: string;
  globalProductId: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  sku: string;
  barcode: string | null;
  unit: Unit;
  packSize: number | null;
  sellingPrice: number;
  costPrice: number | null;
  stockQuantity: number;
  reorderLevel: number;
  lowStock: boolean;
  active: boolean;
  aliases: ProductAlias[];
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductListParams {
  q?: string;
  category?: string;
  active?: boolean;
  lowStock?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ProductCreateInput {
  name: string;
  brand: string | null;
  category: string | null;
  sku: string | null;
  barcode: string | null;
  unit: Unit;
  packSize: number | null;
  sellingPrice: number;
  costPrice: number | null;
  stockQuantity: number;
  reorderLevel: number;
  aliases: string[];
}

/** PUT body: no stockQuantity (stock only changes through inventory movements). */
export type ProductUpdateInput = Omit<ProductCreateInput, "stockQuantity"> & { active: boolean };

export interface ResolveCandidate {
  product: Pick<Product, "id" | "name" | "brand" | "unit" | "packSize" | "sellingPrice" | "stockQuantity">;
  score: number;
  matchedOn: "NAME" | "ALIAS" | "FUZZY";
}

export interface ProductResolution {
  query: string;
  status: "MATCHED" | "AMBIGUOUS" | "NOT_FOUND";
  candidates: ResolveCandidate[];
}

export type ImportRowStatus = "IMPORTED" | "VALID" | "SKIPPED";

export interface ImportRow {
  row: number;
  name: string;
  status: ImportRowStatus;
  errors: string[];
}

export interface ImportResult {
  dryRun: boolean;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  rows: ImportRow[];
}
