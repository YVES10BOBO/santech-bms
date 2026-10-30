import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getInvoices, getInvoice, createInvoice, updateInvoice, recordPayment,
  getIncome, createIncome, getExpenses, createExpense, getPL, getStatements, setOpeningCash,
  getOpportunities, createOpportunity, updateOpportunity,
  getContracts, createContract, updateContract,
} from '../controllers/financeController'
import { createCreditNote, convertProforma, raiseRecurringInvoices } from '../controllers/billingController'
import { FINANCE, SALES, CONTRACT_VIEWERS } from '../lib/roles'

const router = Router()
router.use(authenticate)

// ── Invoices & payments (finance only)
router.get('/invoices', authorize(...FINANCE), getInvoices)
router.get('/invoices/:id', authorize(...FINANCE), getInvoice)
router.post('/invoices', authorize(...FINANCE), createInvoice)
router.put('/invoices/:id', authorize(...FINANCE), updateInvoice)
router.post('/invoices/:id/payment', authorize(...FINANCE), recordPayment)
router.post('/invoices/:id/credit-note', authorize(...FINANCE), createCreditNote) // reduce what is owed on an invoice
router.post('/invoices/:id/convert', authorize(...FINANCE), convertProforma)      // proforma → invoice
router.post('/invoices/raise-recurring', authorize(...FINANCE), raiseRecurringInvoices) // client services due within 14 days

// ── Income, expenses, P&L (finance only)
router.get('/income', authorize(...FINANCE), getIncome)
router.post('/income', authorize(...FINANCE), createIncome)
router.get('/expenses', authorize(...FINANCE), getExpenses)
router.post('/expenses', authorize(...FINANCE), createExpense)
router.get('/pl', authorize(...FINANCE), getPL)
router.get('/statements', authorize(...FINANCE), getStatements)
router.put('/opening-cash', authorize(...FINANCE), setOpeningCash)

// ── Sales pipeline (sales team + management)
router.get('/opportunities', authorize(...SALES), getOpportunities)
router.post('/opportunities', authorize(...SALES), createOpportunity)
router.put('/opportunities/:id', authorize(...SALES), updateOpportunity)

// ── Contracts (approval step is checked inside updateContract)
router.get('/contracts', authorize(...CONTRACT_VIEWERS), getContracts)
router.post('/contracts', authorize(...FINANCE, 'SALES_MANAGER'), createContract)
router.put('/contracts/:id', authorize(...FINANCE, 'SALES_MANAGER'), updateContract)

export default router
