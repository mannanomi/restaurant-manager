import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const days = Number(request.nextUrl.searchParams.get("days") ?? "30");
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    include: { lines: { include: { menuItem: { include: { recipeLines: true } } } } },
  });
  const expenses = await prisma.expense.findMany({ where: { date: { gte: since } } });

  const revenueByDayMap = new Map<string, number>();
  const topItemsMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  const ingredientUsageMap = new Map<string, { name: string; unit: string; totalUsed: number }>();

  let totalRevenue = 0;

  for (const order of orders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    revenueByDayMap.set(day, (revenueByDayMap.get(day) ?? 0) + order.total);
    totalRevenue += order.total;

    for (const line of order.lines) {
      const key = line.menuItemId;
      const prev = topItemsMap.get(key) ?? { name: line.menuItem.name, quantity: 0, revenue: 0 };
      prev.quantity += line.quantity;
      prev.revenue += line.unitPrice * line.quantity;
      topItemsMap.set(key, prev);

      for (const recipeLine of line.menuItem.recipeLines) {
        const ingKey = recipeLine.ingredientId;
        const prevIng = ingredientUsageMap.get(ingKey);
        const used = recipeLine.quantity * line.quantity;
        if (prevIng) {
          prevIng.totalUsed += used;
        } else {
          ingredientUsageMap.set(ingKey, {
            name: "",
            unit: recipeLine.unit,
            totalUsed: used,
          });
        }
      }
    }
  }

  // Fill in ingredient names in one batch query rather than per-line lookups above.
  const ingredientIds = [...ingredientUsageMap.keys()];
  const ingredients = await prisma.ingredient.findMany({ where: { id: { in: ingredientIds } } });
  const ingredientNameById = new Map(ingredients.map((i) => [i.id, i.name]));
  for (const [id, usage] of ingredientUsageMap) {
    usage.name = ingredientNameById.get(id) ?? "Unknown";
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({
    days,
    revenueByDay: [...revenueByDayMap.entries()]
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    topItems: [...topItemsMap.values()].sort((a, b) => b.quantity - a.quantity),
    ingredientUsage: [...ingredientUsageMap.values()].sort((a, b) => b.totalUsed - a.totalUsed),
    totalRevenue,
    totalExpenses,
    net: totalRevenue - totalExpenses,
    orderCount: orders.length,
  });
}
