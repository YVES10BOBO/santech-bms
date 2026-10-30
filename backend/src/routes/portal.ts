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

export const supplierPortal = Router()
supplierPortal.use(authenticate, authorize('SUPPLIER'))
supplierPortal.get('/overview', supplier.getOverview)
supplierPortal.get('/orders', supplier.getOrders)
supplierPortal.post('/orders/:id/confirm', supplier.confirmOrder)
supplierPortal.post('/orders/:id/dispatch', supplier.dispatchOrder)
supplierPortal.post('/orders/:id/invoice', supplier.submitInvoice)

export const portalAdmin = Router()
portalAdmin.use(authenticate)
portalAdmin.get('/clients/:clientId/users', authorize(...CLIENT_PORTAL_MANAGERS), getClientPortalUsers)
portalAdmin.post('/clients/:clientId/users', authorize(...CLIENT_PORTAL_MANAGERS), createClientPortalUser)
portalAdmin.post('/suppliers/:supplierId/users', authorize(...SUPPLIER_MANAGERS), createSupplierPortalUser)
portalAdmin.put('/users/:id', authorize(...CLIENT_PORTAL_MANAGERS, ...SUPPLIER_MANAGERS), updatePortalUser) // the kind of login is checked inside

export const suppliers = Router()
suppliers.use(authenticate, (req, res, next) => (isPortalRole((req as { user?: { role?: string } }).user?.role) ? res.status(403).json({ success: false, message: 'Access denied' }) : next()))
suppliers.get('/', getSuppliers)
suppliers.post('/', authorize(...SUPPLIER_MANAGERS), saveSupplier)
suppliers.put('/:id', authorize(...SUPPLIER_MANAGERS), saveSupplier)
