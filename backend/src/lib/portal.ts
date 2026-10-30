/**
 * Customer and supplier portals: who a portal login belongs to, which files it may open,
 * and notifications to the people at a client or supplier.
 */
import type { Response } from 'express'
import type { UserRole } from '@prisma/client'
import { randomBytes } from 'crypto'
import prisma from './prisma'
import { notify } from './notifications'
import type { AuthRequest } from '../middleware/auth'

export const PORTAL_ROLES: UserRole[] = ['CUSTOMER', 'SUPPLIER']
export const isPortalRole = (role?: string | null) => role === 'CUSTOMER' || role === 'SUPPLIER'

/** The only API paths a portal login may use (checked in authenticate) */
export const PORTAL_PATHS = ['/api/auth/', '/api/files', '/api/portal/', '/api/supplier-portal/', '/api/notifications', '/api/settings/company']

export interface PortalUser { id: string; name: string; clientId: string | null; supplierId: string | null }

/** The signed-in portal user, still active and linked to a client (CUSTOMER) or supplier (SUPPLIER) */
export async function portalUser(req: AuthRequest, res: Response, role: 'CUSTOMER' | 'SUPPLIER'): Promise<PortalUser | null> {
  const u = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, firstName: true, lastName: true, role: true, isActive: true, clientId: true, supplierId: true },
  })
  const linked = role === 'CUSTOMER' ? u?.clientId : u?.supplierId
  if (!u || !u.isActive || u.role !== role || !linked) {
    res.status(403).json({ success: false, message: 'This login is not linked to a portal account — contact Santech' })
    return null
  }
  return { id: u.id, name: `${u.firstName} ${u.lastName}`, clientId: u.clientId, supplierId: u.supplierId }
}

/** Contract statuses a client sees (not internal drafts and approvals) */
export const CLIENT_CONTRACT_STATUSES = ['SIGNING', 'ACTIVE', 'COMPLETED', 'RENEWAL'] as const
/** Quotation statuses a client sees (sent to them or later) */
export const CLIENT_QUOTATION_STATUSES = ['SENT', 'VIEWED', 'NEGOTIATION', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'] as const

/** May a portal user open this stored file? (staff can open any file) */
export async function portalCanOpenFile(userId: string, fileId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true, clientId: true, supplierId: true } })
  if (!u || !u.isActive) return false
  const file = await prisma.storedFile.findUnique({ where: { id: fileId }, select: { uploadedById: true } })
  if (!file) return false
  if (file.uploadedById === userId) return true
  if (u.role === 'CUSTOMER' && u.clientId) {
    const [docs, contracts] = await Promise.all([
      prisma.document.count({ where: { fileId, clientId: u.clientId, sharedWithClient: true, status: 'ACTIVE' } }),
      prisma.contract.count({ where: { clientId: u.clientId, signedDocumentUrl: `/files/${fileId}`, status: { in: [...CLIENT_CONTRACT_STATUSES] } } }),
    ])
    return docs + contracts > 0
  }
  if (u.role === 'SUPPLIER' && u.supplierId) {
    return (await prisma.purchaseRequest.count({ where: { supplierId: u.supplierId, supplierInvoiceFileId: fileId } })) > 0
  }
  return false
}

type PortalNote = Parameters<typeof notify>[1]

/** Notify every active portal login of a client */
export async function notifyClientPortal(clientId: string | null | undefined, n: PortalNote): Promise<void> {
  if (!clientId) return
  const users = await prisma.user.findMany({ where: { clientId, role: 'CUSTOMER', isActive: true }, select: { id: true } })
  await Promise.all(users.map(u => notify(u.id, n)))
}

/** Notify every active portal login of a supplier */
export async function notifySupplierPortal(supplierId: string | null | undefined, n: PortalNote): Promise<void> {
  if (!supplierId) return
  const users = await prisma.user.findMany({ where: { supplierId, role: 'SUPPLIER', isActive: true }, select: { id: true } })
  await Promise.all(users.map(u => notify(u.id, n)))
}

const money = (n: number, cur: string) => `${cur} ${(Math.round(n * 100) / 100).toLocaleString('en-US')}`

/** An invoice, proforma or credit note was sent to the client */
export async function tellClientAboutInvoice(inv: { id: string; clientId: string; invoiceNumber: string; type: string; totalAmount: number; currency: string; dueDate: Date }): Promise<void> {
  const what = inv.type === 'PROFORMA' ? 'Proforma Invoice' : inv.type === 'CREDIT_NOTE' ? 'Credit Note' : 'New Invoice'
  await notifyClientPortal(inv.clientId, {
    type: inv.type === 'INVOICE' ? 'PAYMENT_DUE' : 'SYSTEM', title: what, link: '/portal?tab=invoices', key: `portal-inv-${inv.id}`,
    description: inv.type === 'CREDIT_NOTE' ? `${inv.invoiceNumber}: ${money(inv.totalAmount, inv.currency)} credited to your account`
      : `${inv.invoiceNumber}: ${money(inv.totalAmount, inv.currency)}${inv.type === 'INVOICE' ? `, due ${inv.dueDate.toISOString().slice(0, 10)}` : ''}`,
  })
}

/** A temporary password for a new portal login (shown once to the staff member who created it) */
export const tempPassword = () => `Portal-${randomBytes(4).toString('hex')}`
