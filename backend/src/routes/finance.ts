import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getInvoices, getInvoice, createInvoice, updateInvoice, recordPayment,
  getPL,
  getOpportunities, createOpportunity, updateOpportunity,
  getContracts, createContract, updateContract,
} from '../controllers/financeController'

const router = Router()
router.use(authenticate)

// ── Invoices
router.get('/invoices', getInvoices)
router.get('/invoices/:id', getInvoice)
router.post('/invoices', authorize('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'), createInvoice)
router.put('/invoices/:id', authorize('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'), updateInvoice)
router.post('/invoices/:id/payment', authorize('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'), recordPayment)

// ── P&L / Income Statement
router.get('/pl', getPL)

// ── Opportunities / Sales Pipeline
router.get('/opportunities', getOpportunities)
router.post('/opportunities', createOpportunity)
router.put('/opportunities/:id', updateOpportunity)

// ── Contracts
router.get('/contracts', getContracts)
router.post('/contracts', authorize('SUPER_ADMIN', 'ADMIN'), createContract)
router.put('/contracts/:id', authorize('SUPER_ADMIN', 'ADMIN'), updateContract)

export default router
