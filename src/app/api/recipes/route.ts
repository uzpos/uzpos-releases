import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface RecipeIngredientInput {
  materialId: string;
  quantity: number | string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const recipes = await prisma.product.findMany({
      where: { type: "RECIPE" },
      include: {
        category: true,
        recipesAsResult: {
          include: {
            material: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const recipesWithPortions = recipes.map((recipe) => {
      let canMake = Infinity;
      
      if (!recipe.recipesAsResult || recipe.recipesAsResult.length === 0) {
        canMake = 0;
      } else {
        recipe.recipesAsResult.forEach((ing) => {
          const materialStock = ing.material.stockCount || 0;
          const required = ing.quantity || 1;
          const possible = Math.floor(materialStock / required);
          if (possible < canMake) canMake = possible;
        });
      }

      return {
        ...recipe,
        canMake: canMake === Infinity ? 0 : canMake
      };
    });

    return NextResponse.json(recipesWithPortions);
  } catch {
    return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
       name, 
       categoryId, 
       finalSalePrice, 
       ingredients 
    } = body;
    
    if (!name || !categoryId || !ingredients || ingredients.length === 0) {
       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let totalCost = 0;
    for (const ing of ingredients) {
        const material = await prisma.product.findUnique({ where: { id: ing.materialId } });
        if (material) {
           totalCost += (material.purchasePrice * Number(ing.quantity));
        }
    }

    let catId = categoryId;
    if (categoryId === "cat_yemek") {
       const foodCat = await prisma.category.findFirst({ where: { name: "Ana Yemekler" } });
       catId = foodCat?.id || categoryId;
    } else if (categoryId === "cat_meze") {
       const mezeCat = await prisma.category.findFirst({ where: { name: "Mezeler" } });
       catId = mezeCat?.id || categoryId;
    }

    const recipe = await prisma.product.create({
      data: {
        name,
        type: "RECIPE",
        categoryId: catId,
        purchasePrice: 0, 
        estimatedPrice: totalCost,
        finalSalePrice: Number(finalSalePrice || 0),
        unit: "porsiyon",
        piecesPerBox: 1,
        stockCount: 0,
        recipesAsResult: {
           create: ingredients.map((ing: RecipeIngredientInput) => ({ 
              materialId: ing.materialId,
              quantity: Number(ing.quantity)
           }))
        }
      },
      include: {
         recipesAsResult: true
      }
    });

    return NextResponse.json(recipe);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create recipe" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
       id,
       name, 
       categoryId, 
       finalSalePrice, 
       ingredients 
    } = body;

    if (!id || !name || !ingredients) {
       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let totalCost = 0;
    for (const ing of ingredients) {
        const material = await prisma.product.findUnique({ where: { id: ing.materialId } });
        if (material) {
           totalCost += (material.purchasePrice * Number(ing.quantity));
        }
    }

    let catId = categoryId;
    if (categoryId === "cat_yemek") {
       const foodCat = await prisma.category.findFirst({ where: { name: "Ana Yemekler" } });
       catId = foodCat?.id || categoryId;
    } else if (categoryId === "cat_meze") {
       const mezeCat = await prisma.category.findFirst({ where: { name: "Mezeler" } });
       catId = mezeCat?.id || categoryId;
    }

    const recipe = await prisma.product.update({
      where: { id: id },
      data: {
        name,
        categoryId: catId,
        estimatedPrice: totalCost,
        finalSalePrice: Number(finalSalePrice || 0),
        recipesAsResult: {
           deleteMany: {},
           create: ingredients.map((ing: RecipeIngredientInput) => ({ 
              materialId: ing.materialId,
              quantity: Number(ing.quantity)
           }))
        }
      }
    });

    return NextResponse.json(recipe);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 });
  }
}
