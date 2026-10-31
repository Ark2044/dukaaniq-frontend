export interface PeriodStats {
  salesAmount: number;
  transactions: number;
  averageOrderValue: number;
}

export interface DailySales {
  date: string;
  salesAmount: number;
  transactions: number;
}

export interface AnalyticsSummary {
  timezone: string;
  today: string;
  todayStats: PeriodStats;
  yesterdayStats: PeriodStats;
  last7DaysStats: PeriodStats;
  monthToDateStats: PeriodStats;
  growthVsYesterdayPercent: number | null;
  dailySales: DailySales[];
  collectionsToday: {
    cash: number;
    upi: number;
    card: number;
    paytmVerified: number;
    paytmSimulated: number;
    refunds: number;
  };
  creditGivenToday: number;
  outstandingCredit: { total: number; customersWithBalance: number };
  lowStockCount: number;
  dataNotes: string[];
}
