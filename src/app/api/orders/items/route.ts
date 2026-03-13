import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const productId = searchParams.get("productId");

    if (!orderId || !productId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Find the item and delete it
    // If there are multiple (which shouldn't happen with our current logic but good to handle), delete one or all.
    await prisma.orderItem.deleteMany({
      where: {
        orderId: orderId,
        productId: productId,
        order: { status: "OPEN" } // Safety check
      }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update item status" }, { status: 500 });
  }
}
