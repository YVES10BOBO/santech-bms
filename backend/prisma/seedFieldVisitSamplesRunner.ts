import { PrismaClient } from '@prisma/client'
import { seedFieldVisitSamples } from './fieldVisitSamples'

const prisma = new PrismaClient()

seedFieldVisitSamples(prisma)
  .then(() => console.log('Field visit demonstration records are ready.'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
