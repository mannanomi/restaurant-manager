import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type CartLine = { menuItemId: string; quantity: number };

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { lines: { include: { menuItem: true } } },
  });
  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await request.json();
  const cartLines = body.lines as CartLine[];

  if (!cartLines || cartLines.length === 0) {
    return NextResponse.json({ error: "Order has no items" }, { status: 400 });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const menuItems = await tx.menuItem.findMany({
        where: { id: { in: cartLines.map((l) => l.menuItemId) } },
        include: { recipeLines: true },
      });
      const menuItemById = new Map(menuItems.map((m) => [m.id, m]));

      // Aggregate total ingredient consumption across every line in the order —
      // the same ingredient (e.g. buns, napkins) can appear in multiple menu items.
      const requiredByIngredient = new Map<string, number>();
      let total = 0;

      for (const line of cartLines) {
        const menuItem = menuItemById.get(line.menuItemId);
        if (!menuItem || !menuItem.active) {
          throw new OrderError(`Menu item ${line.menuItemId} is not available`);
        }
        if (line.quantity <= 0) {
          throw new OrderError(`Invalid quantity for ${menuItem.name}`);
        }
        total += menuItem.price * line.quantity;

        for (const recipeLine of menuItem.recipeLines) {
          const prev = requiredByIngredient.get(recipeLine.ingredientId) ?? 0;
          requiredByIngredient.set(
            recipeLine.ingredientId,
            prev + recipeLine.quantity * line.quantity,
          );
        }
      }

      const ingredientIds = [...requiredByIngredient.keys()];
      const ingredients = await tx.ingredient.findMany({
        where: { id: { in: ingredientIds } },
      });
      const ingredientById = new Map(ingredients.map((i) => [i.id, i]));

      const shortages = ingredientIds
        .map((id) => {
          const ingredient = ingredientById.get(id)!;
          const required = requiredByIngredient.get(id)!;
          return { ingredient, required, shortfall: required - ingredient.stockQty };
        })
        .filter((s) => s.shortfall > 0);

      if (shortages.length > 0) {
        throw new OrderError(
          "Insufficient stock: " +
            shortages
              .map(
                (s) =>
                  `${s.ingredient.name} (need ${s.required}${s.ingredient.unit}, have ${s.ingredient.stockQty}${s.ingredient.unit})`,
              )
              .join(", "),
          shortages.map((s) => ({
            ingredientId: s.ingredient.id,
            name: s.ingredient.name,
            required: s.required,
            available: s.ingredient.stockQty,
            unit: s.ingredient.unit,
          })),
        );
      }

      for (const [ingredientId, required] of requiredByIngredient) {
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: { stockQty: { decrement: required } },
        });
      }

      const created = await tx.order.create({
        data: {
          total,
          status: "completed",
          lines: {
            create: cartLines.map((line) => {
              const menuItem = menuItemById.get(line.menuItemId)!;
              return {
                menuItemId: menuItem.id,
                quantity: line.quantity,
                unitPrice: menuItem.price,
              };
            }),
          },
        },
        include: { lines: { include: { menuItem: true } } },
      });

      return created;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message, shortages: err.shortages }, { status: 409 });
    }
    throw err;
  }
}

class OrderError extends Error {
  shortages?: unknown[];
  constructor(message: string, shortages?: unknown[]) {
    super(message);
    this.shortages = shortages;
  }
}
