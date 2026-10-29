import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { ADMINS, SALES } from '../lib/roles'
import { getLeads, createLead, updateLead, advanceLead, convertLead, deleteLead } from '../controllers/leadsController'
import { getQuotations, createQuotation, updateQuotation, advanceQuotation, rejectQuotation, convertQuotation } from '../controllers/quotationsController'
import {
  getTickets, createTicket, updateTicket,
  getProducts, createProduct, updateProduct,
  getDepartments, saveDepartment,
  getVisitors, createVisitor, visitorAction,
} from '../controllers/operationsController'
import { getUsers, createUser, updateUser, getNotifications, getUnreadCount, markNotificationsRead } from '../controllers/usersController'

// Leads, quotations, support, products, departments, reception, users, notifications
const router = Router()
router.use(authenticate)

// Leads (sales team)
router.get('/leads', authorize(...SALES), getLeads)
router.post('/leads', authorize(...SALES), createLead)
router.put('/leads/:id', authorize(...SALES), updateLead)
router.post('/leads/:id/advance', authorize(...SALES), advanceLead)
router.post('/leads/:id/convert', authorize(...SALES), convertLead)
router.delete('/leads/:id', authorize(...ADMINS), deleteLead)

// Quotations (each approval step is checked in the controller)
router.get('/quotations', authorize(...SALES), getQuotations)
router.post('/quotations', authorize(...SALES), createQuotation)
router.put('/quotations/:id', authorize(...SALES), updateQuotation)
router.post('/quotations/:id/advance', authorize(...SALES), advanceQuotation)
router.post('/quotations/:id/reject', authorize(...SALES), rejectQuotation)
router.post('/quotations/:id/convert', authorize(...ADMINS, 'SALES_MANAGER', 'FINANCE_MANAGER'), convertQuotation)

// Support tickets (any staff can log a ticket; leads manage them)
router.get('/tickets', getTickets)
router.post('/tickets', createTicket)
router.put('/tickets/:id', authorize(...ADMINS, 'PROJECT_MANAGER', 'EMPLOYEE', 'SALES_MANAGER'), updateTicket)

// Product catalog (everyone reads; admins edit)
router.get('/products', getProducts)
router.post('/products', authorize(...ADMINS), createProduct)
router.put('/products/:id', authorize(...ADMINS), updateProduct)

// Departments
router.get('/departments', getDepartments)
router.post('/departments', authorize(...ADMINS), saveDepartment)
router.put('/departments/:id', authorize(...ADMINS), saveDepartment)

// Reception
router.get('/visitors', getVisitors)
router.post('/visitors', createVisitor)
router.post('/visitors/:id/:action', visitorAction)

// Users (admins)
router.get('/users', authorize(...ADMINS), getUsers)
router.post('/users', authorize(...ADMINS), createUser)
router.put('/users/:id', authorize(...ADMINS), updateUser)

// Notifications for the logged-in user
router.get('/notifications', getNotifications)
router.get('/notifications/unread-count', getUnreadCount)
router.post('/notifications/read', markNotificationsRead)

export default router
