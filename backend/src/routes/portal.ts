/**
 * Portals.
 *   /api/portal/*           customer portal (CUSTOMER logins, limited to their own client)
 *   /api/supplier-portal/*  supplier portal (SUPPLIER logins, limited to their own supplier)
 *   /api/portal-admin/*     staff: portal logins of clients and suppliers
 *   /api/suppliers          staff: supplier list (everyone reads; finance edits)
 */
import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { isPortalRole } from '../lib/portal'
import { ADMINS, FINANCE } from '../lib/roles'
import * as staff from '../controllers/portalStaffController'
import * as customer from '../controllers/portalController'
import * as supplier from '../controllers/supplierPortalController'
import {
  CLIENT_PORTAL_MANAGERS, SUPPLIER_MANAGERS,
  getClientPortalUsers, createClientPortalUser, getSuppliers, saveSupplier, createSupplierPortalUser, updatePortalUser,
} from '../controllers/portalAdminController'

export const customerPortal = Router()
customerPortal.use(authenticate, authorize('CUSTOMER'))
customerPortal.get('/overview', customer.getOverview)
customerPortal.get('/quotations', customer.getQuotations)
customerPortal.post('/quotations/:id/view', customer.viewQuotation)
customerPortal.post('/quotations/:id/accept', customer.acceptQuotation)
customerPortal.post('/quotations/:id/decline', customer.declineQuotation)
customerPortal.get('/invoices', customer.getInvoices)
customerPortal.get('/contracts', customer.getContracts)
customerPortal.get('/projects', customer.getProjects)
customerPortal.get('/documents', customer.getDocuments)
customerPortal.get('/tickets', customer.getTickets)
customerPortal.post('/tickets', customer.createTicket)
customerPortal.post('/tickets/:id/rate', customer.rateTicket)
customerPortal.post('/tickets/:id/reopen', customer.reopenTicket)
customerPortal.get('/tickets/:id/messages', customer.getTicketMessages)
customerPortal.post('/tickets/:id/messages', customer.postTicketMessage)
customerPortal.post('/invoices/:id/payment-notice', customer.sendPaymentNotice)
customerPortal.post('/contracts/:id/sign', customer.signContract)
customerPortal.post('/quotation-requests', customer.requestQuotation)
customerPortal.get('/profile', customer.getClientProfile)
customerPortal.put('/profile', customer.saveClientProfile)

export const supplierPortal = Router()
supplierPortal.use(authenticate, authorize('SUPPLIER'))
supplierPortal.get('/overview', supplier.getOverview)
supplierPortal.get('/orders', supplier.getOrders)
supplierPortal.post('/orders/:id/confirm', supplier.confirmOrder)
supplierPortal.post('/orders/:id/dispatch', supplier.dispatchOrder)
supplierPortal.post('/orders/:id/invoice', supplier.submitInvoice)
supplierPortal.get('/orders/:id', supplier.getOrder)
supplierPortal.post('/orders/:id/messages', supplier.postOrderMessage)
supplierPortal.get('/profile', supplier.getProfile)
supplierPortal.put('/profile', supplier.saveProfile)
supplierPortal.get('/documents', supplier.getDocuments)
supplierPortal.post('/documents', supplier.addDocument)
supplierPortal.delete('/documents/:id', supplier.removeDocument)
supplierPortal.get('/rfqs', supplier.getRfqs)
supplierPortal.post('/rfqs/:id/quote', supplier.answerRfq)
supplierPortal.post('/rfqs/:id/decline', supplier.declineRfq)

export const portalAdmin = Router()
portalAdmin.use(authenticate)
portalAdmin.get('/clients/:clientId/users', authorize(...CLIENT_PORTAL_MANAGERS), getClientPortalUsers)
portalAdmin.post('/clients/:clientId/users', authorize(...CLIENT_PORTAL_MANAGERS), createClientPortalUser)
portalAdmin.post('/suppliers/:supplierId/users', authorize(...SUPPLIER_MANAGERS), createSupplierPortalUser)
portalAdmin.put('/users/:id', authorize(...CLIENT_PORTAL_MANAGERS, ...SUPPLIER_MANAGERS), updatePortalUser) // the kind of login is checked inside
// Customers: ticket replies and the payments they report
portalAdmin.get('/tickets/:id/messages', staff.getTicketThread)
portalAdmin.post('/tickets/:id/messages', authorize(...ADMINS, 'PROJECT_MANAGER', 'EMPLOYEE', 'SALES_MANAGER'), staff.replyOnTicket)
portalAdmin.get('/payment-notices/pending', authorize(...FINANCE), staff.getPendingNotices)
portalAdmin.get('/invoices/:id/payment-notices', authorize(...FINANCE), staff.getPaymentNotices)
portalAdmin.put('/payment-notices/:id', authorize(...FINANCE), staff.reviewPaymentNotice)
// Suppliers: order messages, their invoices, requests for quotation
portalAdmin.get('/orders/:id/messages', authorize(...FINANCE), staff.getOrderThread)
portalAdmin.post('/orders/:id/messages', authorize(...FINANCE), staff.writeToSupplier)
portalAdmin.put('/orders/:id/invoice-review', authorize(...FINANCE), staff.reviewSupplierInvoice)
portalAdmin.get('/rfqs', authorize(...FINANCE), staff.getRfqs)
portalAdmin.post('/rfqs', authorize(...FINANCE), staff.createRfq)
portalAdmin.post('/rfqs/:id/cancel', authorize(...FINANCE), staff.cancelRfq)
portalAdmin.post('/rfqs/:id/award', authorize(...FINANCE), staff.awardRfq)

export const suppliers = Router()
suppliers.use(authenticate, (req, res, next) => (isPortalRole((req as { user?: { role?: string } }).user?.role) ? res.status(403).json({ success: false, message: 'Access denied' }) : next()))
suppliers.get('/', getSuppliers)
suppliers.post('/', authorize(...SUPPLIER_MANAGERS), saveSupplier)
suppliers.put('/:id', authorize(...SUPPLIER_MANAGERS), saveSupplier)
