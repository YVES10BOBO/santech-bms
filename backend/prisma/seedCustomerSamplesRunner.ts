import { PrismaClient } from '@prisma/client'
import { seedCustomerSamples } from './customerSamples'

const prisma = new PrismaClient()

seedCustomerSamples(prisma)
  .then(() => console.log('Customer demonstration records are ready.'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
