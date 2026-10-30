/**
 * Demo data for the customer and supplier portals:
 * suppliers (from the names already on purchase requests), PO numbers on placed orders,
 * a customer portal login for N&T PLASTIC and a supplier portal login for TechHub Kigali,
 * and N&T documents shared with the client.
 * Safe to run on every deploy: fixed ids and emails, only fills what is missing.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

const SUPPLIERS = [
  { id: 'sup-zkteco', name: 'ZKTeco Rwanda', category: 'HARDWARE', contactName: 'Sales desk', phone: '+250 788 400 101', email: 'sales@zkteco-rw.example' },
  { id: 'sup-techhub', name: 'TechHub Kigali', category: 'IT_EQUIPMENT', contactName: 'Claudine Uwase', phone: '+250 788 400 202', email: 'orders@techhub-kigali.example', address: 'KN 4 Ave, Kigali' },
  { id: 'sup-furniture', name: 'Kigali Furniture', category: 'OFFICE_SUPPLIES', contactName: 'Showroom', phone: '+250 788 400 303' },
  { id: 'sup-dell', name: 'Dell Rwanda', category: 'IT_EQUIPMENT', contactName: 'Business sales' },
  { id: 'sup-electro', name: 'ElectroParts RW', category: 'HARDWARE', contactName: 'Counter sales', phone: '+250 788 400 505' },
  { id: 'sup-adobe', name: 'Adobe Inc', category: 'SOFTWARE', notes: 'Online subscription' },
]

export async function seedPortals(prisma: PrismaClient) {
  // ── Suppliers, linked to the purchase requests that name them ──
  for (const s of SUPPLIERS) {
    if (!(await prisma.supplier.findUnique({ where: { id: s.id } }))) await prisma.supplier.create({ data: s })
    await prisma.purchaseRequest.updateMany({ where: { supplier: s.name, supplierId: null }, data: { supplierId: s.id } })
  }

  // ── PO numbers for orders already placed (oldest first) ──
  const placed = await prisma.purchaseRequest.findMany({ where: { status: { in: ['ORDERED', 'DELIVERED'] }, poNumber: null }, orderBy: { requestDate: 'asc' } })
  for (const p of placed) {
    const numbers = (await prisma.purchaseRequest.findMany({ where: { poNumber: { startsWith: 'PO-2026-' } }, select: { poNumber: true } }))
      .map(r => Number(r.poNumber!.slice('PO-2026-'.length))).filter(Number.isFinite)
    await prisma.purchaseRequest.update({
      where: { id: p.id },
      data: { poNumber: `PO-2026-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`, orderedAt: p.orderedAt ?? p.updatedAt },
    })
  }
  // The delivered ZKTeco order already has the supplier's invoice and confirmation
  await prisma.purchaseRequest.updateMany({
    where: { id: 'pr-01', supplierStatus: null, status: 'DELIVERED' },
    data: { supplierStatus: 'DISPATCHED', expectedDelivery: d('2026-10-12'), supplierNote: 'Delivered with installation kit', supplierUpdatedAt: d('2026-10-11') },
  })

  // ── Portal logins (password Santech@2026, like the other demo accounts) ──
  const password = await bcrypt.hash('Santech@2026', 12)
  if (await prisma.client.findUnique({ where: { id: 'cl-ntplast' }, select: { id: true } })) {
    if (!(await prisma.user.findUnique({ where: { email: 'customer@santech.rw' } }))) {
      await prisma.user.create({ data: { firstName: 'Patrick', lastName: 'Habineza', email: 'customer@santech.rw', phone: '+250 788 610 220', role: 'CUSTOMER', password, clientId: 'cl-ntplast' } })
    }
    // N&T documents the client may see in the portal
    await prisma.document.updateMany({ where: { id: { in: ['doc-09', 'doc-10', 'doc-11'] }, clientId: 'cl-ntplast', sharedWithClient: false }, data: { sharedWithClient: true } })
  }
  if (!(await prisma.user.findUnique({ where: { email: 'supplier@santech.rw' } }))) {
    await prisma.user.create({ data: { firstName: 'Claudine', lastName: 'Uwase', email: 'supplier@santech.rw', phone: '+250 788 400 202', role: 'SUPPLIER', password, supplierId: 'sup-techhub' } })
  }

  console.log('✅ Suppliers, purchase orders, portal logins and shared documents seeded')
}
