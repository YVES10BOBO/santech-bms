import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
})
app.use('/api', limiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Logging
app.use(morgan('dev'))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SAN-BMS API' })
})

// Routes
import authRouter from './routes/auth'
import clientsRouter from './routes/clients'
import fieldVisitsRouter from './routes/fieldVisits'
import employeesRouter from './routes/employees'
import tasksRouter from './routes/tasks'
import projectsRouter from './routes/projects'
import financeRouter from './routes/finance'
import dashboardRouter from './routes/dashboard'

app.use('/api/auth', authRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/field-visits', fieldVisitsRouter)
app.use('/api/employees', employeesRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/finance', financeRouter)
app.use('/api/dashboard', dashboardRouter)

// Opportunities and Contracts are served under /api/finance (see routes/finance.ts)

// Audit logs — inline route (no separate router needed)
import { PrismaClient } from '@prisma/client'
import { authenticate as authMiddleware } from './middleware/auth'
const prisma = new PrismaClient()
app.get('/api/audit-logs', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 500)
    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } }
    })
    res.json({ success: true, data: logs, pagination: { total: logs.length } })
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})


// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`🚀 SAN-BMS API running on http://localhost:${PORT}`)
})

export default app
