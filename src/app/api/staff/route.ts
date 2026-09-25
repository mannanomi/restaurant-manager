import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const staff = await prisma.staffMember.findMany({
    orderBy: { name: "asc" },
    include: { shifts: true },
  });
  return NextResponse.json(staff);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const body = await request.json();
  const { name, hourlyRate } = body;

  if (!name || hourlyRate == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const staffMember = await prisma.staffMember.create({
    data: { name, hourlyRate: Number(hourlyRate) },
  });

  return NextResponse.json(staffMember, { status: 201 });
}
