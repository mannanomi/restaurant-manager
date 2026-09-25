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
  const { vendor, status, lines } = body as {
    vendor?: string;
    status?: "draft" | "sent";
    lines?: { id: string; quantity: number }[];
  };

  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === "sent" && status !== "sent") {
    return NextResponse.json({ error: "Sent purchase orders cannot be reopened" }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (lines) {
      for (const line of lines) {
        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: { quantity: Number(line.quantity) },
        });
      }
    }

    return tx.purchaseOrder.update({
      where: { id },
      data: {
        ...(vendor != null && { vendor }),
        ...(status != null && { status, ...(status === "sent" && { sentAt: new Date() }) }),
      },
      include: { lines: { include: { ingredient: true } } },
    });
  });

  return NextResponse.json(updated);
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
  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (existing?.status === "sent") {
    return NextResponse.json({ error: "Sent purchase orders cannot be deleted" }, { status: 409 });
  }

  await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
  await prisma.purchaseOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
