"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

type Report = {
  days: number;
  revenueByDay: { date: string; revenue: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  ingredientUsage: { name: string; unit: string; totalUsed: number }[];
  totalRevenue: number;
  totalExpenses: number;
  net: number;
  orderCount: number;
};

const RANGE_OPTIONS = [7, 30, 90];

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`/api/reports?days=${days}`)
      .then((r) => r.json())
      .then((data: Report) => setReport(data));
  }, [days]);

  // Stale (previous-range) data is still shown while a new range loads, since
  // report.days won't match the freshly-selected days until the fetch resolves.
  const loading = !report || report.days !== days;
  const maxRevenue = report ? Math.max(1, ...report.revenueByDay.map((d) => d.revenue)) : 1;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Reports"
        description="Revenue, top sellers, and ingredient usage over a selectable window."
        actions={
          <div className="flex gap-1 rounded-lg border border-neutral-300 p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setDays(opt)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  days === opt
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {opt}d
              </button>
            ))}
          </div>
        }
      />

      {loading || !report ? (
        <p className="text-neutral-500">Loading report…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Revenue" value={`$${report.totalRevenue.toFixed(2)}`} />
            <StatCard label="Expenses" value={`$${report.totalExpenses.toFixed(2)}`} />
            <StatCard
              label="Net"
              value={`$${report.net.toFixed(2)}`}
              tone={report.net >= 0 ? "positive" : "negative"}
            />
            <StatCard label="Orders" value={String(report.orderCount)} />
          </div>

          <Card>
            <h2 className="mb-4 font-semibold text-neutral-900">Revenue by Day</h2>
            {report.revenueByDay.length === 0 ? (
              <p className="text-sm text-neutral-400">No orders in this range.</p>
            ) : (
              <div className="flex items-end gap-1" style={{ height: 140 }}>
                {report.revenueByDay.map((d) => (
                  <div key={d.date} className="group flex flex-1 flex-col items-center gap-1.5">
                    <div
                      title={`${d.date}: $${d.revenue.toFixed(2)}`}
                      className="w-full rounded-t bg-neutral-800 transition-colors group-hover:bg-neutral-600"
                      style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 120)}px` }}
                    />
                    <span className="text-[10px] text-neutral-400">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold text-neutral-900">Top Selling Items</h2>
            {report.topItems.length === 0 ? (
              <p className="text-sm text-neutral-400">No sales in this range.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-neutral-500">
                  <tr>
                    <th className="py-1">Item</th>
                    <th className="py-1 text-right">Qty Sold</th>
                    <th className="py-1 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topItems.map((item) => (
                    <tr key={item.name} className="border-t border-neutral-100">
                      <td className="py-1.5">{item.name}</td>
                      <td className="py-1.5 text-right">{item.quantity}</td>
                      <td className="py-1.5 text-right">${item.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold text-neutral-900">Ingredient Usage</h2>
            {report.ingredientUsage.length === 0 ? (
              <p className="text-sm text-neutral-400">No ingredient usage in this range.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-neutral-500">
                  <tr>
                    <th className="py-1">Ingredient</th>
                    <th className="py-1 text-right">Used</th>
                  </tr>
                </thead>
                <tbody>
                  {report.ingredientUsage.map((ing) => (
                    <tr key={ing.name} className="border-t border-neutral-100">
                      <td className="py-1.5">{ing.name}</td>
                      <td className="py-1.5 text-right">
                        {ing.totalUsed} {ing.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <Card>
      <div className="text-sm text-neutral-500">{label}</div>
      <div
        className={`mt-1 text-xl font-semibold ${
          tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-neutral-900"
        }`}
      >
        {value}
      </div>
    </Card>
  );
}
