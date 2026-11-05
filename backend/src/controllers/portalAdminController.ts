/**
 * Staff side of the portals: suppliers (procurement) and the portal logins of clients and suppliers.
 * Client logins: admins and the sales manager. Supplier logins and suppliers: finance and admins.
 */
import { Response } from 'express'
import bcrypt from 'bcryptjs'
import type { UserRole } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { ADMINS, FINANCE, hasRole } from '../lib/roles'
import { tempPassword } from '../lib/portal'
import { deliver, deliveryMessage, appUrl, type Delivery } from '../lib/messaging'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, e: unknown, where: string) => {
  console.error(`${where} error:`, e)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
export const CLIENT_PORTAL_MANAGERS: UserRole[] = [...ADMINS, 'SALES_MANAGER']
export const SUPPLIER_MANAGERS: UserRole[] = FINANCE
const SUPPLIER_CATEGORIES = ['IT_EQUIPMENT', 'OFFICE_SUPPLIES', 'HARDWARE', 'SOFTWARE', 'SERVICES', 'OTHER']
const userSelect = { id: true, firstName: true, lastName: true, email: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true, role: true }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Emails a portal login its sign-in details (new login or new temporary password) */
async function emailLoginDetails(req: AuthRequest, u: { id: string; firstName: string; email: string }, role: 'CUSTOMER' | 'SUPPLIER', ownerName: string, password: string, isReset: boolean): Promise<Delivery> {
  const portal = role === 'CUSTOMER' ? 'Customer Portal' : 'Supplier Portal'
  const what = role === 'CUSTOMER'
    ? 'your quotations (and accept them), invoices, contracts, projects, support tickets and shared documents'
    : 'the purchase orders we place with you: confirm them, mark them dispatched and send your invoices'
  const text = [
    `Hello ${u.firstName},`,
    isReset
      ? `A new temporary password was created for your Santech ${portal} login (${ownerName}).`
      : `You now have a login to the Santech ${portal} for ${ownerName}. There you can see ${what}.`,
    `Sign in at: ${appUrl('/login')}\nEmail: ${u.email}\nTemporary password: ${password}`,
    'Please change the password after you sign in (Account tab).',
  ].join('\n\n')
  return deliver({
    channel: 'EMAIL', to: u.email, subject: isReset ? `Your new Santech ${portal} password` : `Your Santech ${portal} login`,
    text, link: '/login', event: 'portal-login', userId: u.id, createdById: req.user!.id,
  })
}

/** Creates a portal login and returns it with a temporary password (shown once) */
async function createLogin(req: AuthRequest, res: Response, role: 'CUSTOMER' | 'SUPPLIER', link: { clientId?: string; supplierId?: string }, ownerName: string) {
  const b = req.body ?? {}
  const firstName = String(b.firstName ?? '').trim(), lastName = String(b.lastName ?? '').trim()
  const email = String(b.email ?? '').trim().toLowerCase()
  if (!firstName || !lastName) { res.status(400).json({ success: false, message: 'First and last name are required' }); return }
  if (!EMAIL.test(email)) { res.status(400).json({ success: false, message: 'Enter a valid email — it is the login' }); return }
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) { res.status(409).json({ success: false, message: 'Someone already logs in with this email' }); return }
  const password = tempPassword()
  const user = await prisma.user.create({
    data: { firstName, lastName, email, phone: b.phone?.trim() || null, role, password: await bcrypt.hash(password, 12), ...link },
    select: userSelect,
  })
  await logAudit(req, {
    action: 'CREATE', entity: 'User', entityId: user.id, entityName: `${firstName} ${lastName}`,
    description: `Created ${role === 'CUSTOMER' ? 'customer' : 'supplier'} portal login for ${firstName} ${lastName} (${email}) — ${ownerName}`,
    newValue: { email, role, [role === 'CUSTOMER' ? 'client' : 'supplier']: ownerName },
  })
  // the sign-in details go by email unless the staff member unticked it
  const emailed = b.sendEmail === false ? null : await emailLoginDetails(req, user, role, ownerName, password, false)
  res.status(201).json({
    success: true, data: { user, tempPassword: password, emailStatus: emailed?.status ?? null },
    message: emailed?.status === 'SENT'
      ? `Portal login created for ${firstName}. ${deliveryMessage(emailed)}.`
      : `Portal login created for ${firstName}. Share the email and temporary password with them; they can change it under Account.${emailed ? ` (${deliveryMessage(emailed)})` : ''}`,
  })
}

// ── Client portal logins ──────────────────────────────────────────────────────

export async function getClientPortalUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.user.findMany({ where: { clientId: req.params.clientId, role: 'CUSTOMER' }, select: userSelect, orderBy: { createdAt: 'asc' } })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getClientPortalUsers') }
}

export async function createClientPortalUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const c = await prisma.client.findUnique({ where: { id: req.params.clientId }, select: { id: true, companyName: true, fullName: true, teamName: true, delegationName: true } })
    if (!c) { res.status(404).json({ success: false, message: 'Client not found' }); return }
    await createLogin(req, res, 'CUSTOMER', { clientId: c.id }, c.companyName || c.fullName || c.teamName || c.delegationName || 'client')
  } catch (e) { fail(res, e, 'createClientPortalUser') }
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function getSuppliers(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.supplier.findMany({
      include: {
        users: { where: { role: 'SUPPLIER' }, select: userSelect },
        _count: { select: { purchases: true } },
      },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: rows, categories: SUPPLIER_CATEGORIES })
  } catch (e) { fail(res, e, 'getSuppliers') }
}

export async function saveSupplier(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id
    const b = req.body ?? {}
    const name = b.name !== undefined ? String(b.name).trim() : undefined
    if (!id && !name) { res.status(400).json({ success: false, message: 'Supplier name is required' }); return }
    if (name === '') { res.status(400).json({ success: false, message: 'Supplier name is required' }); return }
    if (b.email && !EMAIL.test(String(b.email).trim())) { res.status(400).json({ success: false, message: 'Email is not valid' }); return }
    if (b.category !== undefined && !SUPPLIER_CATEGORIES.includes(b.category)) { res.status(400).json({ success: false, message: 'Pick a category from the list' }); return }
    const opt = (v: unknown) => (v === undefined ? undefined : String(v).trim() || null)
    const data = {
      ...(name !== undefined && { name }),
      ...(b.contactName !== undefined && { contactName: opt(b.contactName) }),
      ...(b.email !== undefined && { email: opt(b.email)?.toLowerCase() ?? null }),
      ...(b.phone !== undefined && { phone: opt(b.phone) }),
      ...(b.address !== undefined && { address: opt(b.address) }),
      ...(b.tin !== undefined && { tin: opt(b.tin) }),
      ...(b.bankName !== undefined && { bankName: opt(b.bankName) }),
      ...(b.bankAccount !== undefined && { bankAccount: opt(b.bankAccount) }),
      ...(b.notes !== undefined && { notes: opt(b.notes) }),
      ...(b.category !== undefined && { category: b.category }),
      ...(b.isActive !== undefined && { isActive: !!b.isActive }),
    }
    const s = id
      ? await prisma.supplier.update({ where: { id }, data })
      : await prisma.supplier.create({ data: { name: name!, ...data } })
    await logAudit(req, { action: id ? 'UPDATE' : 'CREATE', entity: 'Supplier', entityId: s.id, entityName: s.name, description: `${id ? 'Updated' : 'Added'} supplier ${s.name}` })
    res.status(id ? 200 : 201).json({ success: true, data: s, message: id ? 'Supplier updated' : 'Supplier added' })
  } catch (e) { fail(res, e, 'saveSupplier') }
}

export async function createSupplierPortalUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const s = await prisma.supplier.findUnique({ where: { id: req.params.supplierId }, select: { id: true, name: true, isActive: true } })
    if (!s) { res.status(404).json({ success: false, message: 'Supplier not found' }); return }
    if (!s.isActive) { res.status(400).json({ success: false, message: 'This supplier is inactive' }); return }
    await createLogin(req, res, 'SUPPLIER', { supplierId: s.id }, s.name)
  } catch (e) { fail(res, e, 'createSupplierPortalUser') }
}

// ── Either kind of portal login ───────────────────────────────────────────────

/** PUT /portal-admin/users/:id { isActive?, resetPassword? } */
export async function updatePortalUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const u = await prisma.user.findUnique({ where: { id: req.params.id }, select: { ...userSelect, clientId: true, supplierId: true } })
    if (!u || (u.role !== 'CUSTOMER' && u.role !== 'SUPPLIER')) { res.status(404).json({ success: false, message: 'Portal login not found' }); return }
    const allowed = u.role === 'CUSTOMER' ? CLIENT_PORTAL_MANAGERS : SUPPLIER_MANAGERS
    if (!hasRole(req.user!.role, allowed)) { res.status(403).json({ success: false, message: 'Access denied' }); return }
    const b = req.body ?? {}
    let password: string | null = null
    const data: { isActive?: boolean; password?: string } = {}
    if (b.isActive !== undefined) data.isActive = !!b.isActive
    if (b.resetPassword) { password = tempPassword(); data.password = await bcrypt.hash(password, 12) }
    if (!Object.keys(data).length) { res.status(400).json({ success: false, message: 'Nothing to change' }); return }
    const updated = await prisma.user.update({ where: { id: u.id }, data, select: userSelect })
    const what = password ? 'Reset the password of' : data.isActive ? 'Re-enabled' : 'Disabled'
    await logAudit(req, { action: 'UPDATE', entity: 'User', entityId: u.id, entityName: `${u.firstName} ${u.lastName}`, description: `${what} portal login ${u.email}` })
    let emailed: Delivery | null = null
    if (password && b.sendEmail !== false) {
      const owner = u.clientId
        ? await prisma.client.findUnique({ where: { id: u.clientId }, select: { companyName: true, fullName: true, teamName: true, delegationName: true } })
        : u.supplierId ? await prisma.supplier.findUnique({ where: { id: u.supplierId }, select: { name: true } }) : null
      const ownerName = owner ? ('name' in owner ? owner.name : owner.companyName || owner.fullName || owner.teamName || owner.delegationName) ?? '' : ''
      emailed = await emailLoginDetails(req, u, u.role as 'CUSTOMER' | 'SUPPLIER', ownerName, password, true)
    }
    res.json({
      success: true, data: { user: updated, ...(password && { tempPassword: password, emailStatus: emailed?.status ?? null }) },
      message: password
        ? emailed?.status === 'SENT' ? `New temporary password created. ${deliveryMessage(emailed)}.` : `New temporary password created — share it with them${emailed ? ` (${deliveryMessage(emailed)})` : ''}`
        : data.isActive ? 'Portal login enabled' : 'Portal login disabled — they can no longer sign in',
    })
  } catch (e) { fail(res, e, 'updatePortalUser') }
}
