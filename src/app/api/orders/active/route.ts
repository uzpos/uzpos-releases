import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("tableId");

    if (!tableId) {
      return NextResponse.json({ error: "Missing tableId" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        tableId: tableId,
        status: "OPEN"
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    return NextResponse.json(order || null);
  } catch {
    return NextResponse.json({ error: "Failed to fetch active order" }, { status: 500 });
  }
}
