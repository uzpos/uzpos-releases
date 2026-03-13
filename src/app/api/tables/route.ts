import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tables = await prisma.restaurantTable.findMany({
      include: { group: true },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(tables);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    // In real app, only Admin/Manager should create tables, but we let anyone for now or Admin
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, groupName = "Genel" } = await req.json();
    
    // Find or create group
    let group = await prisma.tableGroup.findFirst({ where: { name: groupName } });
    if (!group) {
        group = await prisma.tableGroup.create({ data: { name: groupName } });
    }

    const table = await prisma.restaurantTable.create({
        data: {
           name,
           groupId: group.id,
           status: "AVAILABLE"
        }
    });

    return NextResponse.json(table, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
  }
}
