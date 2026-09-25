import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
  const { name, unit, stockQty, reorderThreshold, preferredVendor } = body;

  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: {
      ...(name != null && { name }),
      ...(unit != null && { unit }),
      ...(stockQty != null && { stockQty: Number(stockQty) }),
      ...(reorderThreshold != null && { reorderThreshold: Number(reorderThreshold) }),
      ...(preferredVendor !== undefined && { preferredVendor: preferredVendor || null }),
    },
  });

  return NextResponse.json(ingredient);
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

  const inUse = await prisma.recipeLine.findFirst({ where: { ingredientId: id } });
  if (inUse) {
    return NextResponse.json(
      { error: "Ingredient is used in one or more recipes and cannot be deleted" },
      { status: 409 },
    );
  }

  await prisma.ingredient.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
