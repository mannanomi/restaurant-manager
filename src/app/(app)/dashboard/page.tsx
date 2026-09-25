import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { IconAlert, IconTruck, IconChevron } from "@/components/ui/icons";

export default async function DashboardPage() {
  const session = await getSession();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayOrders, ingredients, draftPOs, recentOrders] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: startOfDay } } }),
    prisma.ingredient.findMany(),
    prisma.purchaseOrder.findMany({ where: { status: "draft" }, include: { lines: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { lines: { include: { menuItem: true } } },
    }),
  ]);

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const lowStock = ingredients
    .filter((i) => i.stockQty <= i.reorderThreshold)
    .sort((a, b) => a.stockQty / a.reorderThreshold - b.stockQty / b.reorderThreshold);
  const critical = lowStock.filter((i) => i.stockQty <= i.reorderThreshold / 2);

  return (
    <div>
      <PageHeader
        title={`Welcome back${session ? `, ${session.name}` : ""}`}
        description="Here's what's happening at the restaurant right now."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Today's Revenue" value={`$${todayRevenue.toFixed(2)}`} />
        <StatCard label="Today's Orders" value={String(todayOrders.length)} />
        <StatCard
          label="Low Stock Items"
          value={String(lowStock.length)}
          tone={lowStock.length > 0 ? "warning" : undefined}
        />
        <StatCard
          label="Draft Purchase Orders"
          value={String(draftPOs.length)}
          tone={draftPOs.length > 0 ? "info" : undefined}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">Recent Orders</h2>
            <Link href="/orders" className="flex items-center text-sm text-neutral-500 hover:text-neutral-900">
              View all <IconChevron className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-neutral-400">No orders placed yet today.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="text-neutral-900">
                      {order.lines.map((l) => `${l.quantity}× ${l.menuItem.name}`).join(", ")}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {order.createdAt.toLocaleString()}
                    </div>
                  </div>
                  <span className="font-medium text-neutral-900">${order.total.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">Needs Attention</h2>
            {critical.length > 0 && <Badge tone="danger">{critical.length} critical</Badge>}
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-neutral-400">All ingredients are stocked above threshold.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {lowStock.slice(0, 6).map((ing) => {
                const isCritical = ing.stockQty <= ing.reorderThreshold / 2;
                return (
                  <li key={ing.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-neutral-700">
                      <IconAlert
                        className={`h-4 w-4 ${isCritical ? "text-red-500" : "text-amber-500"}`}
                      />
                      {ing.name}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {ing.stockQty}/{ing.reorderThreshold} {ing.unit}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/purchase-orders"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <IconTruck className="h-4 w-4" /> Review Purchase Orders
          </Link>
        </Card>
      </div>
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
  tone?: "warning" | "info";
}) {
  return (
    <Card>
      <div className="text-sm text-neutral-500">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold ${
          tone === "warning" ? "text-amber-600" : tone === "info" ? "text-blue-600" : "text-neutral-900"
        }`}
      >
        {value}
      </div>
    </Card>
  );
}
