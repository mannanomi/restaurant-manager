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
  const { name, hourlyRate, active } = body;

  const staffMember = await prisma.staffMember.update({
    where: { id },
    data: {
      ...(name != null && { name }),
      ...(hourlyRate != null && { hourlyRate: Number(hourlyRate) }),
      ...(active != null && { active }),
    },
  });

  return NextResponse.json(staffMember);
}
