import type { AnalyticsSummary } from "@/types/analytics";
import type { Customer, LedgerEntry } from "@/types/customer";
import type { InventorySummary, StockMovement } from "@/types/inventory";
import type { Sale, SaleItem, SalePayment, SaleSummary } from "@/types/sale";

export const customer = (overrides: Partial<Customer> = {}): Customer => ({
  id: "c-1",
  name: "Ramesh Kulkarni",
  phone: "9876543210",
  notes: null,
  active: true,
  outstandingBalance: 450,
  lastPurchaseAt: "2026-10-28T10:00:00Z",
  totalSales: 12,
  totalPurchased: 5400,
  createdAt: "2026-09-01T10:00:00Z",
  ...overrides,
});

export const ledgerEntry = (overrides: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: "l-1",
  type: "SALE",
  date: "2026-10-20T09:00:00Z",
  description: "Sale S-000012",
  debit: 350,
  credit: 0,
  balance: 350,
  saleId: "s-12",
  saleNumber: "S-000012",
  method: null,
  ...overrides,
});

export const saleItem = (overrides: Partial<SaleItem> = {}): SaleItem => ({
  id: "si-1",
  productId: "p-1",
  name: "Tata Salt",
  brand: "Tata",
  unit: "KG",
  packSize: 1,
  quantity: 2,
  returnedQuantity: 0,
  unitPrice: 28,
  lineTotal: 56,
  ...overrides,
});

export const salePayment = (overrides: Partial<SalePayment> = {}): SalePayment => ({
  id: "pay-1",
  kind: "SALE_PAYMENT",
  method: "CASH",
  amount: 30,
  status: "SUCCESS",
  provider: null,
  simulated: false,
  verified: false,
  orderId: null,
  createdAt: "2026-10-31T07:00:00Z",
  note: null,
  ...overrides,
});

export const sale = (overrides: Partial<Sale> = {}): Sale => ({
  id: "s-1",
  saleNumber: "S-000123",
  status: "COMPLETED",
  createdAt: "2026-10-31T07:00:00Z",
  customer: { id: "c-1", name: "Ramesh Kulkarni" },
  items: [saleItem()],
  subtotal: 56,
  discountAmount: 6,
  totalAmount: 50,
  returnedAmount: 0,
  netAmount: 50,
  paidAmount: 30,
  dueAmount: 20,
  paymentStatus: "PARTIAL",
  payments: [salePayment()],
  note: null,
  source: "MANUAL",
  voiceTranscript: null,
  cancelledAt: null,
  cancelReason: null,
  ...overrides,
});

export const saleSummary = (overrides: Partial<SaleSummary> = {}): SaleSummary => ({
  id: "s-1",
  saleNumber: "S-000123",
  createdAt: "2026-10-31T07:00:00Z",
  status: "COMPLETED",
  customerName: "Ramesh Kulkarni",
  itemCount: 2,
  totalAmount: 50,
  netAmount: 50,
  dueAmount: 0,
  paymentStatus: "PAID",
  source: "MANUAL",
  ...overrides,
});

export const inventorySummary = (overrides: Partial<InventorySummary> = {}): InventorySummary => ({
  totalProducts: 26,
  activeProducts: 24,
  lowStockCount: 4,
  outOfStockCount: 1,
  stockValueAtCost: 41250,
  stockValueAtSellingPrice: 52310,
  costCoverage: { productsWithCost: 20, activeProducts: 24 },
  lowStockItems: [{ id: "p-9", name: "Rice (loose)", brand: null, unit: "KG", stockQuantity: 10, reorderLevel: 25 }],
  ...overrides,
});

export const movement = (overrides: Partial<StockMovement> = {}): StockMovement => ({
  id: "mv-1",
  productId: "p-1",
  productName: "Tata Salt",
  unit: "KG",
  type: "OUT",
  reason: "SALE",
  quantityChange: -2,
  balanceAfter: 38,
  referenceType: "SALE",
  referenceId: "s-1",
  note: null,
  createdAt: "2026-10-31T07:00:00Z",
  ...overrides,
});

export const analytics = (overrides: Partial<AnalyticsSummary> = {}): AnalyticsSummary => ({
  timezone: "Asia/Kolkata",
  today: "2026-10-31",
  todayStats: { salesAmount: 4850, transactions: 18, averageOrderValue: 269.44 },
  yesterdayStats: { salesAmount: 4300, transactions: 16, averageOrderValue: 268.75 },
  last7DaysStats: { salesAmount: 31200, transactions: 120, averageOrderValue: 260 },
  monthToDateStats: { salesAmount: 98000, transactions: 400, averageOrderValue: 245 },
  growthVsYesterdayPercent: 12.79,
  dailySales: [
    { date: "2026-10-30", salesAmount: 4300, transactions: 16 },
    { date: "2026-10-31", salesAmount: 4850, transactions: 18 },
  ],
  collectionsToday: { cash: 2100, upi: 1500, card: 0, paytmVerified: 0, paytmSimulated: 0, refunds: 0 },
  creditGivenToday: 450,
  outstandingCredit: { total: 6200, customersWithBalance: 7 },
  lowStockCount: 4,
  dataNotes: ["Sales are net of returns and exclude cancelled sales."],
  ...overrides,
});
