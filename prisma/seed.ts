import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcryptjs.hash('admin123', 10)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@uzpos.com' },
    update: {},
    create: {
      email: 'admin@uzpos.com',
      name: 'System Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log({ adminUser })
  console.log("Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
