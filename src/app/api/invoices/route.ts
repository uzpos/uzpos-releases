import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "CASHIER")) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoices = await prisma.invoice.findMany({
      include: {
         company: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(invoices);
  } catch {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "CASHIER")) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
       companyId,
       invoiceName, // eslint-disable-line @typescript-eslint/no-unused-vars
       totalAmount,
       type, // PURCHASE
       items // Array of { productId, quantity, basePrice, marginValue, finalPrice }
    } = body;
    
    // basic validation
    if (!companyId || !items || items.length === 0) {
       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Create the Invoice base record
    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        totalAmount: Number(totalAmount),
        type,
      }
    });

    // 2. Create items separately to bypass Prisma Client sync issues (where nested 'items' might not be recognized yet)
    for (const item of items) {
       // Manual check for model existence if client is stale. 
       // We'll use the raw model if needed, but standard prisma.invoiceItem should work if it was at least generated once.
       await prisma.invoiceItem.create({
          data: {
             invoiceId: invoice.id,
             productId: item.productId,
             quantity: Number(item.quantity),
             basePrice: Number(item.basePrice),
             finalPrice: Number(item.finalPrice)
          }
       });
    }

    // 2. Update Product Stock and Prices based on Invoice items
    for (const item of items) {
       const product = await prisma.product.findUnique({ where: { id: item.productId } });
       if (!product) continue;

        let stockIncrement = Number(item.quantity);
        let unitPurchasePrice = Number(item.basePrice);
        let unitSalePrice = Number(item.finalPrice);

        // User logic: If "koli" unit is used, multiply qty by pieces-per-box and divide price.
        if (item.unit === "koli" || item.unit === "box") {
           const pPerBox = product.piecesPerBox || 1;
           stockIncrement = Number(item.quantity) * pPerBox;
           unitPurchasePrice = Number(item.basePrice) / pPerBox;
           unitSalePrice = Number(item.finalPrice) / pPerBox;
        }

        await prisma.product.update({
           where: { id: item.productId },
           data: {
              stockCount: { increment: stockIncrement },
              purchasePrice: unitPurchasePrice,
              markup: Number(item.marginValue),
              finalSalePrice: unitSalePrice
           }
        });
    }

    return NextResponse.json({ success: true, invoice });
  } catch {
    return NextResponse.json({ error: "Failed to process invoice" }, { status: 500 });
  }
}
