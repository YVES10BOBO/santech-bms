import { PrismaClient } from '@prisma/client'

// One shared client for new code, so we don't open a new connection pool per file.
const prisma = new PrismaClient()

export default prisma
