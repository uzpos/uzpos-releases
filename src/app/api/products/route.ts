import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // READY, MATERIAL, RECIPE

    let whereClause = {};
    if (type) {
      whereClause = { type };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        supplier: true,
      }
    });
    
    return NextResponse.json(products);
  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // basic validation
    if (!body.name || !body.unit || !body.supplierId) {
       return NextResponse.json({ error: "Missing required fields: name, unit, supplierId" }, { status: 400 });
    }

    let type = body.type || "READY";
    if (body.isForProduction && !body.isForSale) type = "MATERIAL";
    if (body.isForProduction && body.isForSale) type = "RECIPE";
    if (!body.isForProduction && body.isForSale) type = "READY";

    const product = await prisma.product.create({
      data: {
        name: body.name,
        type: type,
        categoryId: body.categoryId || null,
        supplierId: body.supplierId,
        isForSale: body.isForSale ?? true,
        isForProduction: body.isForProduction ?? false,
        purchasePrice: body.purchasePrice || 0,
        markup: body.markup || 0,
        estimatedPrice: body.estimatedPrice || 0,
        finalSalePrice: body.finalSalePrice || 0,
        unit: body.unit,
        piecesPerBox: body.piecesPerBox || 1, 
        stockCount: 0,
        criticalLevel: body.criticalLevel || 10,
      }
    });

    return NextResponse.json(product);
  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
