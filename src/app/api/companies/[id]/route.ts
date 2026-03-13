import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, contactPerson, phone } = await req.json();

    const company = await prisma.company.update({
        where: { id: params.id },
        data: {
           name,
           contactPerson: contactPerson || null,
           phone: phone || null
        }
    });

    return NextResponse.json(company);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
   try {
     const session = await getServerSession();
     if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
     await prisma.company.delete({
         where: { id: params.id }
     });
     
     return NextResponse.json({ success: true });
   } catch (err) {
     console.error(err);
     return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
   }
}
