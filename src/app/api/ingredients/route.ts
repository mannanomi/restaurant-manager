import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(ingredients);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const body = await request.json();
  const { name, unit, stockQty, reorderThreshold, preferredVendor } = body;

  if (!name || !unit || stockQty == null || reorderThreshold == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ingredient = await prisma.ingredient.create({
    data: {
      name,
      unit,
      stockQty: Number(stockQty),
      reorderThreshold: Number(reorderThreshold),
      preferredVendor: preferredVendor || null,
    },
  });

  return NextResponse.json(ingredient, { status: 201 });
}
