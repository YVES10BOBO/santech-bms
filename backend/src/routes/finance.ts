import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getInvoices, getInvoice, createInvoice, updateInvoice, recordPayment,
  getIncome, createIncome, getExpenses, createExpense, getPL,
  getOpportunities, createOpportunity, updateOpportunity,
  getContracts, createContract, updateContract,
} from '../controllers/financeController'
import { FINANCE, SALES, CONTRACT_VIEWERS } from '../lib/roles'

const router = Router()
router.use(authenticate)

// ── Invoices & payments (finance only)
router.get('/invoices', authorize(...FINANCE), getInvoices)
router.get('/invoices/:id', authorize(...FINANCE), getInvoice)
router.post('/invoices', authorize(...FINANCE), createInvoice)
router.put('/invoices/:id', authorize(...FINANCE), updateInvoice)
router.post('/invoices/:id/payment', authorize(...FINANCE), recordPayment)

// ── Income, expenses, P&L (finance only)
router.get('/income', authorize(...FINANCE), getIncome)
router.post('/income', authorize(...FINANCE), createIncome)
router.get('/expenses', authorize(...FINANCE), getExpenses)
router.post('/expenses', authorize(...FINANCE), createExpense)
router.get('/pl', authorize(...FINANCE), getPL)

// ── Sales pipeline (sales team + management)
router.get('/opportunities', authorize(...SALES), getOpportunities)
router.post('/opportunities', authorize(...SALES), createOpportunity)
router.put('/opportunities/:id', authorize(...SALES), updateOpportunity)

// ── Contracts (approval step is checked inside updateContract)
router.get('/contracts', authorize(...CONTRACT_VIEWERS), getContracts)
router.post('/contracts', authorize(...FINANCE, 'SALES_MANAGER'), createContract)
router.put('/contracts/:id', authorize(...FINANCE, 'SALES_MANAGER'), updateContract)

export default router
