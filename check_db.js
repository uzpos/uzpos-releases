const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const productCount = await prisma.product.count();
  const companyCount = await prisma.company.count();
  const products = await prisma.product.findMany({ take: 5 });
  const companies = await prisma.company.findMany({ take: 5 });
  
  console.log(JSON.stringify({ productCount, companyCount, products, companies }, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
