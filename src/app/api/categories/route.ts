import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let categories = await prisma.category.findMany();
    
    // Auto-seed if missing requested favorites
    const defaults = [
      { name: "Ana Yemekler", type: "FOOD" },
      { name: "Mezeler", type: "FOOD" },
      { name: "İçecekler", type: "DRINK" }
    ];

    let createdAny = false;
    for (const def of defaults) {
      if (!categories.find(c => c.name === def.name)) {
        await prisma.category.create({ data: def });
        createdAny = true;
      }
    }

    if (createdAny) categories = await prisma.category.findMany();

    return NextResponse.json(categories);
  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const category = await prisma.category.create({
      data: {
        name: body.name,
        type: body.type, // DRINK, MATERIAL, FOOD
      }
    });

    return NextResponse.json(category);
  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
