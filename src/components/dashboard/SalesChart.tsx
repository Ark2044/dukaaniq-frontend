"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/common/Card";
import { formatINR } from "@/lib/utils/format";
import type { DailySales } from "@/types/analytics";

const compactINR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

// `date` is a calendar day (yyyy-MM-dd); parse it as UTC so the label never shifts with the device timezone.
const dayLabel = (date: string) => shortDate.format(new Date(`${date}T00:00:00Z`));

export function SalesChart({ data }: { data: DailySales[] }) {
  const chartData = data.map((d) => ({ ...d, label: dayLabel(d.date) }));
  const total = data.reduce((sum, d) => sum + d.salesAmount, 0);

  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Last 14 days</h2>
        <p className="text-xs text-muted">{formatINR(total)} total</p>
      </div>
      <div
        role="img"
        aria-label={`Bar chart of daily sales for the last ${data.length} days. Total ${formatINR(total)}. A table of the values follows.`}
        className="h-56 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e4e2dc" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} fontSize={11} />
            <YAxis
              width={48}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(value: number) => compactINR.format(value)}
            />
            <Tooltip
              cursor={{ fill: "#f8f7f4" }}
              formatter={(value) => [formatINR(Number(value)), "Sales"]}
              labelFormatter={(label) => String(label)}
            />
            <Bar dataKey="salesAmount" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, index) => (
                <Cell key={entry.date} fill={index === chartData.length - 1 ? "#0f1b33" : "#9fb0d0"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Daily sales, last {data.length} days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Sales</th>
            <th scope="col">Transactions</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((d) => (
            <tr key={d.date}>
              <td>{d.label}</td>
              <td>{formatINR(d.salesAmount)}</td>
              <td>{d.transactions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
