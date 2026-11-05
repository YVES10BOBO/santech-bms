/**
 * Demo data for the complete customer and supplier portals:
 * bank details to pay to, supplier invoices at each stage (approved, rejected, paid), conversations on an
 * order and a ticket, a payment a customer reported, a contract waiting for the customer's signature,
 * supplier documents, and two requests for quotation.
 * Safe to run on every deploy: fixed ids, only fills what is missing.
 */
import { PrismaClient } from '@prisma/client'
import { simplePdf } from './documentLinks'

const days = (n: number) => new Date(Date.now() + n * 24 * 3600 * 1000)

export async function seedPortalExtras(prisma: PrismaClient) {
  const [admin, finance, supplierUser, customerUser] = await Promise.all(
    ['admin@santech.rw', 'david@santech.rw', 'supplier@santech.rw', 'customer@santech.rw'].map(email => prisma.user.findUnique({ where: { email } })),
  )
  if (!admin || !supplierUser) return
  const financeUser = finance ?? admin

  const makeFile = async (name: string, lines: string[], uploadedById: string) => {
    const data = simplePdf(name.replace(/\.pdf$/i, ''), ['Santech Innovate - SAN-BMS', ...lines, '', 'Sample file created for the SAN-BMS demonstration.'])
    return prisma.storedFile.create({ data: { name, mimeType: 'application/pdf', size: data.length, data, uploadedById } })
  }

  // ── Where customers pay (Settings → Company Profile) ──
  const company = await prisma.setting.findUnique({ where: { key: 'company' } })
  const value = { ...((company?.value ?? {}) as Record<string, string>) }
  if (!value.bankName) {
    Object.assign(value, {
      bankName: 'Bank of Kigali', bankAccountName: 'Santech Innovate Ltd', bankAccountNumber: '00012-4567890-12',
      momoCode: '*182*8*1*123456#', paymentInstructions: 'Write the invoice number as the payment reference.',
    })
    await prisma.setting.upsert({ where: { key: 'company' }, update: { value }, create: { key: 'company', value } })
  }

  // ── Supplier: bank details ──
  await prisma.supplier.updateMany({ where: { id: 'sup-techhub', bankName: null }, data: { bankName: 'Equity Bank Rwanda', bankAccount: '4001-2200-8891', tin: '106 482 913' } })

  // ── Supplier invoices at every stage ──
  const zk = await prisma.purchaseRequest.findFirst({ where: { id: 'pr-01', supplierInvoiceFileId: null, status: 'DELIVERED' } })
  if (zk) {
    const total = zk.quantity * zk.unitPrice
    const f = await makeFile('ZKTeco invoice INV-8841.pdf', [`Order: ${zk.poNumber}`, `Amount: RWF ${total.toLocaleString('en-US')}`], supplierUser.id)
    await prisma.purchaseRequest.update({
      where: { id: zk.id },
      data: { supplierInvoiceFileId: f.id, supplierInvoiceName: f.name, supplierInvoiceAmount: total, supplierInvoiceStatus: 'PAID', supplierInvoicePaidAmount: total, supplierInvoicePaidAt: days(-6), supplierInvoiceReference: 'BK-TRF-260918' },
    })
  }
  const orders = [
    { id: 'pr-th-1', po: 'PO-2026-021', item: 'Network switches 24-port', qty: 4, price: 185000, status: 'APPROVED', note: null, ordered: -20 },
    { id: 'pr-th-2', po: 'PO-2026-022', item: 'Laptop chargers (65W)', qty: 10, price: 22000, status: 'REJECTED', note: 'The amount on the invoice does not match the purchase order. Please send a corrected invoice', ordered: -16 },
    { id: 'pr-th-3', po: 'PO-2026-020', item: 'Wireless access points', qty: 6, price: 95000, status: 'PAID', note: null, ordered: -34 },
  ]
  for (const o of orders) {
    if (await prisma.purchaseRequest.findUnique({ where: { id: o.id }, select: { id: true } })) continue
    const total = o.qty * o.price
    const f = await makeFile(`TechHub invoice for ${o.po}.pdf`, [`Order: ${o.po}`, `Amount: RWF ${(o.status === 'REJECTED' ? total + 20000 : total).toLocaleString('en-US')}`], supplierUser.id)
    await prisma.purchaseRequest.create({
      data: {
        id: o.id, itemName: o.item, category: 'IT_EQUIPMENT', quantity: o.qty, unitPrice: o.price, supplier: 'TechHub Kigali', supplierId: 'sup-techhub',
        status: 'DELIVERED', requestedById: admin.id, approvedById: financeUser.id, requestDate: days(o.ordered - 3), poNumber: o.po, orderedAt: days(o.ordered), deliveredAt: days(o.ordered + 6),
        supplierStatus: 'DISPATCHED', expectedDelivery: days(o.ordered + 6), supplierNote: 'Delivered to the Kigali office',
        supplierInvoiceFileId: f.id, supplierInvoiceName: f.name, supplierInvoiceAmount: o.status === 'REJECTED' ? total + 20000 : total,
        supplierInvoiceStatus: o.status, supplierInvoiceNote: o.note, supplierUpdatedAt: days(o.ordered + 7),
        ...(o.status === 'PAID' && { supplierInvoicePaidAmount: total, supplierInvoicePaidAt: days(o.ordered + 20), supplierInvoiceReference: 'EQ-TRF-260903' }),
      },
    })
  }

  // ── A conversation on a supplier order ──
  const open = await prisma.purchaseRequest.findFirst({ where: { supplierId: 'sup-techhub', status: 'ORDERED' }, orderBy: { orderedAt: 'asc' } })
  if (open && !(await prisma.portalMessage.count({ where: { orderId: open.id } }))) {
    await prisma.portalMessage.createMany({
      data: [
        { orderId: open.id, authorId: supplierUser.id, fromPortal: true, body: `Good morning. Can we deliver ${open.poNumber} to the Kigali office on Thursday morning?`, createdAt: days(-2) },
        { orderId: open.id, authorId: financeUser.id, fromPortal: false, body: 'Yes, Thursday morning works. Please ask for the receptionist and bring the delivery note.', createdAt: days(-1) },
      ],
    })
  }

  // ── Customer: a ticket conversation, a reported payment, a contract to sign ──
  if (customerUser?.clientId) {
    const ticket = await prisma.supportTicket.findFirst({ where: { clientId: customerUser.clientId }, orderBy: { createdAt: 'desc' } })
    if (ticket && !(await prisma.portalMessage.count({ where: { ticketId: ticket.id } }))) {
      await prisma.portalMessage.createMany({
        data: [
          { ticketId: ticket.id, authorId: financeUser.id, fromPortal: false, body: 'We reset the device and checked the sync. Please tell us if it happens again.', createdAt: days(-3) },
          { ticketId: ticket.id, authorId: customerUser.id, fromPortal: true, body: 'Thank you, it works now.', createdAt: days(-2) },
        ],
      })
    }
    const invoice = await prisma.invoice.findFirst({ where: { clientId: customerUser.clientId, type: 'INVOICE', status: { in: ['PARTIALLY_PAID', 'SENT', 'DUE', 'OVERDUE'] } }, orderBy: { issueDate: 'desc' } })
    if (invoice && !(await prisma.paymentNotice.findUnique({ where: { id: 'pn-demo-1' }, select: { id: true } }))) {
      const left = Math.max(0, invoice.totalAmount - invoice.paidAmount - invoice.creditedAmount)
      if (left > 0) {
        await prisma.paymentNotice.create({
          data: { id: 'pn-demo-1', invoiceId: invoice.id, clientId: customerUser.clientId, amount: Math.min(left, 500000), method: 'MOBILE_MONEY', reference: 'MP261103.1514.B48213', paidOn: days(-1), note: 'Paid from our MTN MoMo account', createdById: customerUser.id },
        })
      }
    }
    if (!(await prisma.contract.findUnique({ where: { id: 'ct-ntplast-sla' }, select: { id: true } }))) {
      await prisma.contract.create({
        data: {
          id: 'ct-ntplast-sla', contractNumber: 'CT-2026-901', clientId: customerUser.clientId, projectName: 'SANTRACK support and maintenance, year 2', value: 1800000, currency: 'RWF',
          startDate: days(5), endDate: days(370), paymentTerms: 'Quarterly in advance, 30 days', deliverables: 'Monthly device health check, 24h response on tickets, software updates',
          status: 'SIGNING', responsibleManagerId: admin.id,
          signatories: [{ name: `${customerUser.firstName} ${customerUser.lastName}`, status: 'PENDING', signedAt: null }, { name: 'System Admin', status: 'SIGNED', signedAt: days(-1).toISOString() }],
        },
      })
    }
  }

  // ── Supplier documents ──
  if (!(await prisma.document.findUnique({ where: { id: 'sdoc-01' }, select: { id: true } }))) {
    const f = await makeFile('Santech supplier code of conduct.pdf', ['Rules every supplier of Santech Innovate agrees to.', 'Honest pricing, on-time delivery, no gifts to staff.'], admin.id)
    await prisma.document.create({ data: { id: 'sdoc-01', name: f.name, category: 'POLICY', description: 'What we expect from every supplier', status: 'ACTIVE', fileId: f.id, supplierId: 'sup-techhub', sharedWithSupplier: true, uploadedById: admin.id, size: '2 KB' } })
  }
  if (!(await prisma.document.findUnique({ where: { id: 'sdoc-02' }, select: { id: true } }))) {
    const f = await makeFile('TechHub RDB registration certificate.pdf', ['Company: TechHub Kigali', 'Registered with the Rwanda Development Board'], supplierUser.id)
    await prisma.document.create({ data: { id: 'sdoc-02', name: f.name, category: 'CERTIFICATE', description: 'Company registration', status: 'ACTIVE', fileId: f.id, supplierId: 'sup-techhub', sharedWithSupplier: false, uploadedById: supplierUser.id, expiryDate: new Date('2027-03-31T00:00:00.000Z'), size: '2 KB' } })
  }

  // ── Requests for quotation ──
  if (!(await prisma.rfq.findUnique({ where: { id: 'rfq-01' }, select: { id: true } }))) {
    await prisma.rfq.create({
      data: {
        id: 'rfq-01', rfqNo: 'RFQ-2026-001', title: 'UPS 1500VA for the server room', description: 'Line-interactive, at least 20 minutes of backup at 600W, 2-year warranty. Delivery to Kigali office.',
        category: 'HARDWARE', quantity: 3, unit: 'pcs', deadline: days(10), createdById: financeUser.id,
        quotes: { create: [{ supplierId: 'sup-techhub' }, { supplierId: 'sup-zkteco' }, { supplierId: 'sup-electro', status: 'QUOTED', unitPrice: 168000, deliveryDays: 5, validUntil: days(30), note: 'Includes 2-year warranty', quotedAt: days(-1) }] },
      },
    })
  }
  if (!(await prisma.rfq.findUnique({ where: { id: 'rfq-02' }, select: { id: true } }))) {
    await prisma.rfq.create({
      data: {
        id: 'rfq-02', rfqNo: 'RFQ-2026-002', title: 'Biometric terminals ZK-F18', description: 'Fingerprint terminals with network and card options, for client installations.',
        category: 'HARDWARE', quantity: 5, unit: 'pcs', deadline: days(6), createdById: financeUser.id,
        quotes: {
          create: [
            { supplierId: 'sup-techhub', status: 'QUOTED', unitPrice: 142000, deliveryDays: 7, validUntil: days(21), note: 'Stock available in Kigali', quotedAt: days(-2) },
            { supplierId: 'sup-zkteco', status: 'QUOTED', unitPrice: 128500, deliveryDays: 10, validUntil: days(21), note: 'Manufacturer price, import lead time included', quotedAt: days(-1) },
            { supplierId: 'sup-electro', status: 'DECLINED', note: 'We do not stock this model' },
          ],
        },
      },
    })
  }

  console.log('✅ Portal extras seeded (bank details, supplier invoice stages, messages, payment notice, contract to sign, documents, quotation requests)')
}
