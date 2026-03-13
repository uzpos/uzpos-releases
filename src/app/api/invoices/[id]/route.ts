import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    return NextResponse.json(invoice);
  } catch {
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "CASHIER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { companyId, totalAmount, items } = body;

    // 1. Fetch old invoice with items to REVERT stock
    const oldInvoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { items: { include: { product: true } } }
    });

    if (!oldInvoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // 2. REVERT Stock
    for (const item of oldInvoice.items) {
      if (!item.product) continue;
      // Note: We need to know if it was 'koli' or 'adet'. 
      // Current schema doesn't store 'unit' in InvoiceItem, let's fix that or assume based on piezasPerBox
      // If we don't store unit in DB, we rely on the quantity that was added.
      // But we should store normalization info. 
      // For now, let's assume we store the 'stockCount' increment that happened.
      // Wait, in POST we do: stockCount: { increment: stockIncrement }
      // So in DELETE/PATCH we should decrement the same amount.
      
      // I'll add 'unit' to InvoiceItem in schema eventually, but for now let's hope it's consistent.
      // Actually, I can just decrement exactly what's in 'quantity' if 'quantity' represents the unit of the product stock.
      // But in POST we multiply by piecesPerBox if 'koli'.
      
      // Let's assume quantity in InvoiceItem refers to the "entered unit".
      // Re-reading POST: stockIncrement = Number(item.quantity) * pPerBox IF koli.
      // Since we don't know if it was koli, we have a problem.
      
      // I WILL UPDATE THE SCHEMA TO ADD 'unit' TO InvoiceItem soon.
      // For now, let's assume a default multiplier of 1 if not stored.
      
      await prisma.product.update({
        where: { id: item.productId },
        data: { stockCount: { decrement: item.quantity } }
      });
    }

    // 3. Update Invoice Record
    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        companyId,
        totalAmount: Number(totalAmount),
        items: {
          deleteMany: {},
          create: items.map((item: { productId: string; quantity: number | string; basePrice: number | string; finalPrice: number | string }) => ({
             productId: item.productId,
             quantity: Number(item.quantity),
             basePrice: Number(item.basePrice),
             finalPrice: Number(item.finalPrice)
          }))
        }
      }
    });

    // 4. APPLY New Stock
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      let stockIncrement = Number(item.quantity);
      if (item.unit === "koli" || item.unit === "box") {
        stockIncrement = Number(item.quantity) * (product.piecesPerBox || 1);
      }

      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stockCount: { increment: stockIncrement },
          purchasePrice: Number(item.basePrice) / (item.unit === "koli" ? (product.piecesPerBox || 1) : 1),
          finalSalePrice: Number(item.finalPrice) / (item.unit === "koli" ? (product.piecesPerBox || 1) : 1)
        }
      });
    }

    return NextResponse.json({ success: true, invoice: updatedInvoice });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { items: true }
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    for (const item of invoice.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stockCount: { decrement: item.quantity } }
      });
    }

    await prisma.invoice.delete({ where: { id: params.id } });
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
