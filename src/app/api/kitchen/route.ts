import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.order.findMany({
      where: {
        status: "OPEN",
        items: {
          some: {
            status: { in: ["PENDING", "PREPARING"] }
          }
        }
      },
      include: {
        items: {
          where: {
            status: { in: ["PENDING", "PREPARING"] }
          },
          include: {
            product: true
          }
        },
        table: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Format for kitchen view
    const formattedOrders = orders.map(order => ({
      id: order.id,
      tableId: order.table?.name || "Paket/Direkt",
      time: order.createdAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      status: order.items.some(i => i.status === "PREPARING") ? "PREPARING" : "PENDING",
      items: order.items.map(item => ({
        id: item.id,
        name: `${item.quantity}x ${item.product.name}`,
        note: "" // Note field can be added to OrderItem later
      }))
    }));

    return NextResponse.json(formattedOrders);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch kitchen orders" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId, newStatus } = await req.json();

    if (!orderId || !newStatus) {
       return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Update all items in this order to the new status
    // (In a more granular system, we could update items individually)
    await prisma.orderItem.updateMany({
       where: { orderId: orderId, status: { in: ["PENDING", "PREPARING"] } },
       data: { status: newStatus }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update kitchen status" }, { status: 500 });
  }
}
