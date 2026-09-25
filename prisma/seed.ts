import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.staffMember.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.recipeLine.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      {
        name: "Manager Mia",
        role: "MANAGER",
        passwordHash: await bcrypt.hash("manager123", 10),
      },
      {
        name: "Staff Sam",
        role: "STAFF",
        passwordHash: await bcrypt.hash("staff123", 10),
      },
    ],
  });

  const ingredients = await Promise.all(
    [
      { name: "Beef Patty (4oz)", unit: "each", stockQty: 40, reorderThreshold: 15, preferredVendor: "Prime Meats Co." },
      { name: "Burger Bun", unit: "each", stockQty: 50, reorderThreshold: 20, preferredVendor: "City Bakery" },
      { name: "Cheddar Slice", unit: "each", stockQty: 60, reorderThreshold: 20, preferredVendor: "Dairy Direct" },
      { name: "Lettuce", unit: "g", stockQty: 3000, reorderThreshold: 500, preferredVendor: "Fresh Farms" },
      { name: "Tomato", unit: "g", stockQty: 2500, reorderThreshold: 500, preferredVendor: "Fresh Farms" },
      { name: "French Fries (frozen)", unit: "g", stockQty: 8000, reorderThreshold: 1500, preferredVendor: "Golden Spud Foods" },
      { name: "Cola Syrup", unit: "ml", stockQty: 4000, reorderThreshold: 800, preferredVendor: "Beverage Supply Inc." },
      { name: "Soda Water", unit: "ml", stockQty: 6000, reorderThreshold: 1000, preferredVendor: "Beverage Supply Inc." },
      { name: "Cup (16oz)", unit: "each", stockQty: 200, reorderThreshold: 50, preferredVendor: "PackPro" },
      { name: "Napkin", unit: "each", stockQty: 500, reorderThreshold: 100, preferredVendor: "PackPro" },
      { name: "To-Go Box", unit: "each", stockQty: 150, reorderThreshold: 40, preferredVendor: "PackPro" },
      { name: "Pickles", unit: "g", stockQty: 1500, reorderThreshold: 300, preferredVendor: "Fresh Farms" },
      { name: "Chicken Breast", unit: "g", stockQty: 6000, reorderThreshold: 1200, preferredVendor: "Prime Meats Co." },
      { name: "Caesar Dressing", unit: "ml", stockQty: 2000, reorderThreshold: 400, preferredVendor: "Dairy Direct" },
      { name: "Croutons", unit: "g", stockQty: 1000, reorderThreshold: 200, preferredVendor: "City Bakery" },
      { name: "Romaine Lettuce", unit: "g", stockQty: 12, reorderThreshold: 500, preferredVendor: "Fresh Farms" },
    ].map((i) => prisma.ingredient.create({ data: i })),
  );

  const byName = Object.fromEntries(ingredients.map((i) => [i.name, i]));

  const cheeseburger = await prisma.menuItem.create({
    data: { name: "Cheeseburger", price: 8.99, category: "Burgers" },
  });
  const classicBurger = await prisma.menuItem.create({
    data: { name: "Classic Burger", price: 7.99, category: "Burgers" },
  });
  const fries = await prisma.menuItem.create({
    data: { name: "French Fries", price: 3.49, category: "Sides" },
  });
  const cola = await prisma.menuItem.create({
    data: { name: "Fountain Cola", price: 2.49, category: "Drinks" },
  });
  const chickenSandwich = await prisma.menuItem.create({
    data: { name: "Grilled Chicken Sandwich", price: 9.49, category: "Sandwiches" },
  });
  const caesarSalad = await prisma.menuItem.create({
    data: { name: "Caesar Salad", price: 6.99, category: "Salads" },
  });

  async function recipe(menuItemId: string, lines: { name: string; quantity: number }[]) {
    for (const line of lines) {
      const ing = byName[line.name];
      await prisma.recipeLine.create({
        data: {
          menuItemId,
          ingredientId: ing.id,
          quantity: line.quantity,
          unit: ing.unit,
        },
      });
    }
  }

  await recipe(cheeseburger.id, [
    { name: "Beef Patty (4oz)", quantity: 1 },
    { name: "Burger Bun", quantity: 1 },
    { name: "Cheddar Slice", quantity: 1 },
    { name: "Lettuce", quantity: 20 },
    { name: "Tomato", quantity: 15 },
    { name: "Pickles", quantity: 10 },
    { name: "Napkin", quantity: 1 },
  ]);

  await recipe(classicBurger.id, [
    { name: "Beef Patty (4oz)", quantity: 1 },
    { name: "Burger Bun", quantity: 1 },
    { name: "Lettuce", quantity: 20 },
    { name: "Tomato", quantity: 15 },
    { name: "Pickles", quantity: 10 },
    { name: "Napkin", quantity: 1 },
  ]);

  await recipe(fries.id, [
    { name: "French Fries (frozen)", quantity: 150 },
    { name: "To-Go Box", quantity: 1 },
  ]);

  await recipe(cola.id, [
    { name: "Cola Syrup", quantity: 60 },
    { name: "Soda Water", quantity: 300 },
    { name: "Cup (16oz)", quantity: 1 },
  ]);

  await recipe(chickenSandwich.id, [
    { name: "Chicken Breast", quantity: 180 },
    { name: "Burger Bun", quantity: 1 },
    { name: "Lettuce", quantity: 20 },
    { name: "Tomato", quantity: 15 },
    { name: "Napkin", quantity: 1 },
  ]);

  // Deliberately low stock (Romaine Lettuce = 12g) so Caesar Salad demos the
  // out-of-stock block/warning path without any manual setup.
  await recipe(caesarSalad.id, [
    { name: "Romaine Lettuce", quantity: 120 },
    { name: "Croutons", quantity: 30 },
    { name: "Caesar Dressing", quantity: 40 },
    { name: "To-Go Box", quantity: 1 },
  ]);

  // Phase 2 demo data: staff, a couple of shifts in the current pay period,
  // and a few expenses so Reports has something to summarize alongside sales.
  const alex = await prisma.staffMember.create({ data: { name: "Alex Rivera", hourlyRate: 18.5 } });
  const jordan = await prisma.staffMember.create({ data: { name: "Jordan Lee", hourlyRate: 21 } });

  const currentPeriod = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
  const today = new Date();
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  await prisma.shift.createMany({
    data: [
      { staffMemberId: alex.id, date: twoDaysAgo, hoursWorked: 7.5, payPeriod: currentPeriod },
      { staffMemberId: alex.id, date: today, hoursWorked: 6, payPeriod: currentPeriod },
      { staffMemberId: jordan.id, date: twoDaysAgo, hoursWorked: 8, payPeriod: currentPeriod },
    ],
  });

  await prisma.expense.createMany({
    data: [
      { category: "Vendor Purchase", amount: 420.5, date: twoDaysAgo, note: "Prime Meats Co. weekly order" },
      { category: "Utilities", amount: 180, date: twoDaysAgo, note: "Electricity" },
      { category: "Repairs", amount: 95, date: today, note: "Walk-in cooler thermostat" },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
