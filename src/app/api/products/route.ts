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
    if (!body.name || !body.type || !body.unit) {
       return NextResponse.json({ error: "Missing required fields: name, type, unit" }, { status: 400 });
    }

    // Ensure we have a valid categoryId based on User Type request
    // Categories should be seeded or exist: "İçecekler", "Mezeler", "Genel"
    let categoryId = body.categoryId;
    let type = body.type; // Request can be: MATERIAL (Üretim), READY (Satış), DRINK (İçecek)
    
    if (type === "DRINK") {
       type = "READY";
       const drinkCat = await prisma.category.findFirst({ where: { name: "İçecekler" } });
       categoryId = drinkCat?.id || categoryId;
    } else if (type === "SALE_FOOD") { // or however Satış is sent
       type = "READY";
       const foodCat = await prisma.category.findFirst({ where: { name: "Mezeler" } });
       categoryId = foodCat?.id || categoryId;
    }

    if (!categoryId) {
       const defaultCat = await prisma.category.findFirst({ where: { name: "Genel" } });
       categoryId = defaultCat?.id;
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        type: type,
        categoryId: categoryId,
        purchasePrice: body.purchasePrice || 0,
        markup: body.markup || 0,
        estimatedPrice: body.estimatedPrice || 0,
        finalSalePrice: body.finalSalePrice || 0,
        unit: body.unit,
        piecesPerBox: body.piecesPerBox || 1, 
        stockCount: 0, // "ürün ekle kısmından eklenen ürünler kesinlikle stoğa yansımayacak."
        criticalLevel: body.criticalLevel || 10,
      }
    });

    return NextResponse.json(product);
  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
