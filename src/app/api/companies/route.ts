import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companies = await prisma.company.findMany({
        orderBy: { name: 'asc' }
    });
    return NextResponse.json(companies);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, contactPerson, phone } = await req.json();

    const company = await prisma.company.create({
        data: {
           name,
           contactPerson: contactPerson || null,
           phone: phone || null,
           balance: 0
        }
    });

    return NextResponse.json(company, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
