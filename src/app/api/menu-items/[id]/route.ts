import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type RecipeLineInput = { ingredientId: string; quantity: number; unit: string };

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, price, category, active, recipeLines } = body as {
    name?: string;
    price?: number;
    category?: string;
    active?: boolean;
    recipeLines?: RecipeLineInput[];
  };

  const menuItem = await prisma.$transaction(async (tx) => {
    await tx.menuItem.update({
      where: { id },
      data: {
        ...(name != null && { name }),
        ...(price != null && { price: Number(price) }),
        ...(category != null && { category }),
        ...(active != null && { active }),
      },
    });

    if (recipeLines) {
      await tx.recipeLine.deleteMany({ where: { menuItemId: id } });
      await tx.recipeLine.createMany({
        data: recipeLines.map((line) => ({
          menuItemId: id,
          ingredientId: line.ingredientId,
          quantity: Number(line.quantity),
          unit: line.unit,
        })),
      });
    }

    return tx.menuItem.findUnique({
      where: { id },
      include: { recipeLines: { include: { ingredient: true } } },
    });
  });

  return NextResponse.json(menuItem);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const { id } = await params;

  const inUse = await prisma.orderLine.findFirst({ where: { menuItemId: id } });
  if (inUse) {
    await prisma.menuItem.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true, deactivated: true });
  }

  await prisma.recipeLine.deleteMany({ where: { menuItemId: id } });
  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true, deactivated: false });
}
