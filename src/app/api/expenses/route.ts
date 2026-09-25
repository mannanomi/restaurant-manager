import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const body = await request.json();
  const { category, amount, date, note } = body;

  if (!category || amount == null || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: { category, amount: Number(amount), date: new Date(date), note: note || null },
  });

  return NextResponse.json(expense, { status: 201 });
}
