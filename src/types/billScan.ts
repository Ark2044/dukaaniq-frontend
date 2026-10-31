import type { Unit } from "./product";

export type BillScanState = "PROCESSING" | "COMPLETED" | "FAILED";
export type BillMatchStatus = "MATCHED" | "AMBIGUOUS" | "NOT_FOUND";
export type BillLineAction = "CREATE" | "RESTOCK" | "SKIP";

export interface BillScanStarted {
  scanId: string;
  status: BillScanState;
}

export interface BillMatchCandidate {
  id: string;
  name: string;
  brand: string | null;
  unit: Unit | null;
  packSize: number | null;
  sellingPrice: number | null;
  stockQuantity: number | null;
  score: number | null;
}

export interface BillLine {
  lineNo: number;
  name: string;
  brand: string | null;
  quantity: number | null;
  unit: Unit | null;
  packSize: number | null;
  costPrice: number | null;
  mrp: number | null;
  suggestedSellingPrice: number | null;
  costDerived: boolean;
  needsReview: boolean;
  reviewReasons: string[];
  match: { status: BillMatchStatus; candidates: BillMatchCandidate[] };
  suggestedAction: BillLineAction;
}

export interface BillScanResult {
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  warnings: string[];
  lines: BillLine[];
}

export interface BillScanFailure {
  code: string;
  message: string;
}

export interface BillScanStatusResponse {
  scanId: string;
  status: BillScanState;
  error?: BillScanFailure | null;
  result?: BillScanResult | null;
}

export type BillConfirmLine =
  | {
      action: "CREATE";
      name: string;
      brand?: string;
      category?: string;
      unit: Unit;
      packSize?: number;
      sellingPrice: number;
      costPrice?: number;
      quantity?: number;
      reorderLevel?: number;
    }
  | { action: "RESTOCK"; productId: string; quantity: number }
  | { action: "SKIP" };

export interface BillConfirmRequest {
  lines: BillConfirmLine[];
}

export type BillOutcomeStatus = "CREATED" | "RESTOCKED" | "SKIPPED" | "FAILED";

export interface BillConfirmLineResult {
  index: number;
  action: BillLineAction;
  status: BillOutcomeStatus;
  name: string | null;
  productId: string | null;
  error: string | null;
}

export interface BillConfirmResult {
  created: number;
  restocked: number;
  skipped: number;
  failed: number;
  lines: BillConfirmLineResult[];
}
