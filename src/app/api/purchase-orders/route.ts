import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { lines: { include: { ingredient: true } } },
  });
  return NextResponse.json(purchaseOrders);
}

// Groups every low-stock ingredient by its preferred vendor and drafts one
// PurchaseOrder per vendor, suggesting enough to bring stock to 2x the
// reorder threshold. Skips ingredients that already have an open draft PO.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.action === "generate") {
    const allIngredients = await prisma.ingredient.findMany();
    const lowStock = allIngredients.filter((i) => i.stockQty <= i.reorderThreshold);

    if (lowStock.length === 0) {
      return NextResponse.json({ created: [] });
    }

    const alreadyDrafted = await prisma.purchaseOrderLine.findMany({
      where: { purchaseOrder: { status: "draft" } },
      select: { ingredientId: true },
    });
    const draftedIds = new Set(alreadyDrafted.map((l) => l.ingredientId));

    const toOrder = lowStock.filter((i) => !draftedIds.has(i.id));
    if (toOrder.length === 0) {
      return NextResponse.json({ created: [] });
    }

    const byVendor = new Map<string, typeof toOrder>();
    for (const ing of toOrder) {
      const vendor = ing.preferredVendor ?? "Unassigned Vendor";
      if (!byVendor.has(vendor)) byVendor.set(vendor, []);
      byVendor.get(vendor)!.push(ing);
    }

    const created = await prisma.$transaction(
      [...byVendor.entries()].map(([vendor, ingredients]) =>
        prisma.purchaseOrder.create({
          data: {
            vendor,
            status: "draft",
            lines: {
              create: ingredients.map((ing) => ({
                ingredientId: ing.id,
                quantity: Math.max(ing.reorderThreshold * 2 - ing.stockQty, ing.reorderThreshold),
              })),
            },
          },
          include: { lines: { include: { ingredient: true } } },
        }),
      ),
    );

    return NextResponse.json({ created });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
