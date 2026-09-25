import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payPeriod = request.nextUrl.searchParams.get("payPeriod");
  const shifts = await prisma.shift.findMany({
    where: payPeriod ? { payPeriod } : undefined,
    include: { staffMember: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(shifts);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const body = await request.json();
  const { staffMemberId, date, hoursWorked, payPeriod } = body;

  if (!staffMemberId || !date || hoursWorked == null || !payPeriod) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const shift = await prisma.shift.create({
    data: {
      staffMemberId,
      date: new Date(date),
      hoursWorked: Number(hoursWorked),
      payPeriod,
    },
    include: { staffMember: true },
  });

  return NextResponse.json(shift, { status: 201 });
}
