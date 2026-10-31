import type { BillLine, BillMatchCandidate, BillScanResult } from "@/types/billScan";

export const candidate = (overrides: Partial<BillMatchCandidate> = {}): BillMatchCandidate => ({
  id: "p-1",
  name: "Tata Salt",
  brand: "Tata",
  unit: "KG",
  packSize: 1,
  sellingPrice: 28,
  stockQuantity: 40,
  score: 1,
  ...overrides,
});

export const scanLine = (overrides: Partial<BillLine> = {}): BillLine => ({
  lineNo: 1,
  name: "Tata Salt",
  brand: "Tata",
  quantity: 20,
  unit: "KG",
  packSize: 1,
  costPrice: 24,
  mrp: 28,
  suggestedSellingPrice: 28,
  costDerived: false,
  needsReview: false,
  reviewReasons: [],
  match: { status: "NOT_FOUND", candidates: [] },
  suggestedAction: "CREATE",
  ...overrides,
});

export const scanResult = (lines: BillLine[], overrides: Partial<BillScanResult> = {}): BillScanResult => ({
  supplierName: "Sharma Traders",
  invoiceNumber: "INV-102",
  invoiceDate: "12/10/2026",
  warnings: [],
  lines,
  ...overrides,
});

/** One line per match situation: clear match, brand-new product, and an ambiguous match. */
export const mixedResult = () =>
  scanResult(
    [
      scanLine({
        lineNo: 1,
        name: "Tata Salt",
        match: { status: "MATCHED", candidates: [candidate()] },
        suggestedAction: "RESTOCK",
      }),
      scanLine({ lineNo: 2, name: "Parle-G", brand: "Parle", unit: "PACKET", suggestedAction: "CREATE" }),
      scanLine({
        lineNo: 3,
        name: "Milk",
        brand: null,
        unit: "PACKET",
        match: {
          status: "AMBIGUOUS",
          candidates: [
            candidate({ id: "p-10", name: "Amul Milk", brand: "Amul", unit: "PACKET", stockQuantity: 5 }),
            candidate({ id: "p-11", name: "Mother Dairy Milk", brand: "Mother Dairy", unit: "PACKET", stockQuantity: 8 }),
          ],
        },
        suggestedAction: "SKIP",
      }),
    ],
    { warnings: ["Some pages could not be read."] },
  );
