import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const productId = params.id;

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ...body // Expecting fields like purchasePrice, finalSalePrice, markup
      }
    });

    return NextResponse.json(updatedProduct);
  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
   try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = params.id;
    await prisma.product.delete({
      where: { id: productId }
    });

    return NextResponse.json({ success: true });
  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
