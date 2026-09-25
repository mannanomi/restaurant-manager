import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const menuItems = await prisma.menuItem.findMany({
    include: { recipeLines: { include: { ingredient: true } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(menuItems);
}

type RecipeLineInput = { ingredientId: string; quantity: number; unit: string };

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const body = await request.json();
  const { name, price, category, recipeLines } = body as {
    name: string;
    price: number;
    category: string;
    recipeLines: RecipeLineInput[];
  };

  if (!name || price == null || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const menuItem = await prisma.menuItem.create({
    data: {
      name,
      price: Number(price),
      category,
      recipeLines: {
        create: (recipeLines || []).map((line) => ({
          ingredientId: line.ingredientId,
          quantity: Number(line.quantity),
          unit: line.unit,
        })),
      },
    },
    include: { recipeLines: { include: { ingredient: true } } },
  });

  return NextResponse.json(menuItem, { status: 201 });
}
