import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

dotenv.config()

const app = express()
// Render puts a proxy in front of the app: trust it so rate limits see each visitor's real IP
app.set('trust proxy', 1)
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://santech-bms.vercel.app',
  ],
  credentials: true,
}))

// Rate limiting — generous limits for a business app (not a public API)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,                 // 1000 requests per 15 min per IP (was 100 — too low)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // health/keep-alive never counts
})
app.use('/api', limiter)

// Brute-force protection: 10 FAILED login attempts per 15 min per visitor.
// Successful logins and normal profile checks do not count.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many failed login attempts. Please wait 15 minutes and try again.' },
})

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
import salaryRouter from './routes/salary'
import lookupsRouter from './routes/lookups'
import step2Router from './routes/step2'
import reportsRouter from './routes/reports'
import prisma from './lib/prisma'
import { authenticate as authMiddleware, authorize } from './middleware/auth'

app.use('/api/auth/login', authLimiter)
app.use('/api/auth', authRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/field-visits', fieldVisitsRouter)
app.use('/api/employees', employeesRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/finance', financeRouter)
app.use('/api/dashboard', dashboardRouter)

// Opportunities and Contracts are served under /api/finance (see routes/finance.ts)
app.use('/api/salary', salaryRouter)
app.use('/api/lookups', lookupsRouter)
// Leads, quotations, tickets, products, departments, visitors, users, notifications
app.use('/api/reports', reportsRouter)
app.use('/api', step2Router)

// Audit logs — read-only, management only
app.get('/api/audit-logs', authMiddleware, authorize('SUPER_ADMIN', 'ADMIN'), async (req: express.Request, res: express.Response) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 200), 1000)
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      }),
      prisma.auditLog.count(),
    ])
    res.json({ success: true, data: logs, pagination: { total } })
  } catch (err) {
    console.error('Audit logs error:', err)
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

app.listen(PORT, async () => {
  console.log(`🚀 SAN-BMS API running on http://localhost:${PORT}`)
  // Warm up Neon on startup so the first user request is fast
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection warmed up')
  } catch (e) {
    console.warn('⚠️  DB warm-up failed (will retry on first request):', e)
  }
})

// Keep Neon alive — ping every 4 minutes to prevent cold starts (Neon sleeps after 5 min)
setInterval(async () => {
  try { await prisma.$queryRaw`SELECT 1` } catch { /* silent */ }
}, 4 * 60 * 1000)

export default app
