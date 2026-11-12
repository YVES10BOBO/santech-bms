/**
 * E-signatures: each person saves signature / initials images once (a company stamp, "cachet", is saved by an
 * admin and shared), then places them on a PDF or image document inside the system. The server stamps the images
 * onto a new copy of the document, adds a signature certificate page and keeps the original file untouched.
 */
import { Response } from 'express'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import QRCode from 'qrcode'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { ADMINS, CONTRACT_VIEWERS, hasRole } from '../lib/roles'
import type { AuthRequest } from '../middleware/auth'
import { buildContractPdf } from '../lib/contractPdf'

const fail = (res: Response, error: unknown, where: string) => {
  console.error(`${where} error:`, error)
  res.status(500).json({ success: false, message: 'Internal server error' })
}

const KINDS = ['SIGNATURE', 'INITIALS', 'STAMP']
/** The company stamp (cachet) means "the company agrees": only these roles can see it and place it on a document */
const canStamp = (role?: string) => hasRole(role as never, CONTRACT_VIEWERS)
const MAX_IMAGE_BYTES = 600 * 1024
const MAX_PER_USER = 12
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const toDto = (s: { id: string; userId: string | null; kind: string; name: string; data: Uint8Array; width: number; height: number; isDefault: boolean }) => ({
  id: s.id, kind: s.kind, name: s.name, width: s.width, height: s.height, isDefault: s.isDefault, shared: s.userId === null,
  dataUrl: `data:image/png;base64,${Buffer.from(s.data).toString('base64')}`,
})

/** GET /signatures — my own signatures plus the company stamps */
export async function getSignatures(req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.savedSignature.findMany({
      where: { OR: [{ userId: req.user!.id }, ...(canStamp(req.user?.role) ? [{ userId: null }] : [])] },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    res.json({ success: true, data: rows.map(toDto) })
  } catch (e) { fail(res, e, 'getSignatures') }
}

/** POST /signatures { kind, name, dataUrl, width, height } — the browser sends a trimmed PNG with a transparent background */
export async function createSignature(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { kind, name, dataUrl, width, height } = req.body ?? {}
    if (!KINDS.includes(kind)) { res.status(400).json({ success: false, message: 'Choose signature, initials or stamp' }); return }
    if (kind === 'STAMP' && !hasRole(req.user?.role, ADMINS)) { res.status(403).json({ success: false, message: 'Only an admin can save the company stamp' }); return }
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? ''))
    if (!match) { res.status(400).json({ success: false, message: 'Send the image as a PNG' }); return }
    const data = Buffer.from(match[1], 'base64')
    if (data.length < 100 || !data.subarray(0, 8).equals(PNG_MAGIC)) { res.status(400).json({ success: false, message: 'That is not a valid PNG image' }); return }
    if (data.length > MAX_IMAGE_BYTES) { res.status(413).json({ success: false, message: 'The image is too large (max 600 KB after resizing)' }); return }
    const owner = kind === 'STAMP' ? null : req.user!.id
    if (await prisma.savedSignature.count({ where: { userId: owner } }) >= MAX_PER_USER) {
      res.status(400).json({ success: false, message: `You can keep up to ${MAX_PER_USER} images. Delete one first.` }); return
    }
    const cleanName = String(name ?? '').trim().slice(0, 60) || (kind === 'STAMP' ? 'Company stamp' : kind === 'INITIALS' ? 'My initials' : 'My signature')
    const isFirst = owner !== null && kind !== 'STAMP' && (await prisma.savedSignature.count({ where: { userId: owner, kind: { not: 'STAMP' } } })) === 0
    const row = await prisma.savedSignature.create({
      data: { userId: owner, kind, name: cleanName, data, width: Math.round(Number(width)) || 1, height: Math.round(Number(height)) || 1, isDefault: isFirst },
    })
    await logAudit(req, {
      action: 'CREATE', entity: 'Signature', entityId: row.id, entityName: cleanName,
      description: kind === 'STAMP' ? `Saved the company stamp "${cleanName}"` : `Saved ${kind.toLowerCase()} "${cleanName}"`,
    })
    res.status(201).json({ success: true, data: toDto(row), message: 'Saved' })
  } catch (e) { fail(res, e, 'createSignature') }
}

async function ownOrStamp(req: AuthRequest, id: string) {
  const row = await prisma.savedSignature.findUnique({ where: { id } })
  if (!row) return null
  if (row.userId === req.user!.id) return row
  if (row.userId === null && hasRole(req.user?.role, ADMINS)) return row
  return null
}

export async function updateSignature(req: AuthRequest, res: Response): Promise<void> {
  try {
    const row = await ownOrStamp(req, req.params.id)
    if (!row) { res.status(404).json({ success: false, message: 'Not found' }); return }
    const { name, isDefault } = req.body ?? {}
    if (isDefault === true && row.userId) await prisma.savedSignature.updateMany({ where: { userId: row.userId }, data: { isDefault: false } })
    const updated = await prisma.savedSignature.update({
      where: { id: row.id },
      data: { ...(name !== undefined && String(name).trim() && { name: String(name).trim().slice(0, 60) }), ...(isDefault !== undefined && row.userId && { isDefault: !!isDefault }) },
    })
    res.json({ success: true, data: toDto(updated), message: 'Updated' })
  } catch (e) { fail(res, e, 'updateSignature') }
}

export async function deleteSignature(req: AuthRequest, res: Response): Promise<void> {
  try {
    const row = await ownOrStamp(req, req.params.id)
    if (!row) { res.status(404).json({ success: false, message: 'Not found' }); return }
    await prisma.savedSignature.delete({ where: { id: row.id } })
    await logAudit(req, { action: 'DELETE', entity: 'Signature', entityId: row.id, entityName: row.name, description: `Deleted ${row.kind.toLowerCase()} "${row.name}"` })
    res.json({ success: true, message: 'Deleted' })
  } catch (e) { fail(res, e, 'deleteSignature') }
}

// ── SIGNING A DOCUMENT ────────────────────────────────────────────────────────

interface Placement { signatureId: string; page: number; x: number; y: number; w: number; h: number }
interface Signatory { name: string; status: 'PENDING' | 'SIGNED'; signedAt?: string }

const sha256 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const inUnit = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= -0.05 && n <= 1.05

/**
 * POST /signatures/sign
 * { fileId, placements: [{ signatureId, page, x, y, w, h }], password, contractId?, signatoryName? }
 * x, y, w, h are fractions (0–1) of the page, measured from its top-left corner.
 */
export async function signDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { fileId, placements, password, contractId, signatoryName } = req.body ?? {}
    if (!fileId) { res.status(400).json({ success: false, message: 'Choose the document to sign' }); return }
    if (!Array.isArray(placements) || placements.length === 0) { res.status(400).json({ success: false, message: 'Place at least one signature on the document' }); return }
    if (placements.length > 40) { res.status(400).json({ success: false, message: 'Too many items on the document (max 40)' }); return }
    if (!password) { res.status(400).json({ success: false, message: 'Type your password to confirm it is you' }); return }

    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, firstName: true, lastName: true, email: true, role: true, password: true } })
    if (!me || !(await bcrypt.compare(String(password), me.password))) { res.status(400).json({ success: false, message: 'Wrong password' }); return }

    const source = await prisma.storedFile.findUnique({ where: { id: String(fileId) } })
    if (!source) { res.status(404).json({ success: false, message: 'Document not found' }); return }
    const isPdf = source.mimeType === 'application/pdf'
    const isImage = /^image\/(png|jpe?g)$/.test(source.mimeType)
    if (!isPdf && !isImage) { res.status(400).json({ success: false, message: 'Only PDF and PNG / JPG documents can be signed here. Save a Word file as PDF first.' }); return }

    let contract: Awaited<ReturnType<typeof prisma.contract.findUnique>> = null
    let signatories: Signatory[] = []
    if (contractId) {
      if (!hasRole(me.role, CONTRACT_VIEWERS)) { res.status(403).json({ success: false, message: 'You are not allowed to sign contracts' }); return }
      contract = await prisma.contract.findUnique({ where: { id: String(contractId) } })
      if (!contract) { res.status(404).json({ success: false, message: 'Contract not found' }); return }
      signatories = (contract.signatories as unknown as Signatory[] | null) ?? []
      if (!signatories.some(s => s.name === signatoryName)) { res.status(400).json({ success: false, message: 'Choose which signatory you are signing as' }); return }
    }

    // The images used must be mine or a company stamp
    const ids = [...new Set((placements as Placement[]).map(p => p.signatureId))]
    const images = await prisma.savedSignature.findMany({ where: { id: { in: ids }, OR: [{ userId: me.id }, ...(canStamp(me.role) ? [{ userId: null }] : [])] } })
    if (images.length !== ids.length) { res.status(400).json({ success: false, message: 'One of the signatures or the company stamp is not available to you' }); return }

    const bytes = new Uint8Array(source.data)
    let pdf: PDFDocument
    if (isPdf) {
      try { pdf = await PDFDocument.load(bytes) } catch { res.status(400).json({ success: false, message: 'This PDF is protected or damaged, so it cannot be signed' }); return }
    } else {
      // a picture of a document becomes a one-page PDF (A4 width)
      pdf = await PDFDocument.create()
      const img = source.mimeType === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
      const w = 595.28, h = (img.height / img.width) * w
      pdf.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h })
    }

    const pages = pdf.getPages()
    const embedded = new Map<string, Awaited<ReturnType<PDFDocument['embedPng']>>>()
    for (const img of images) embedded.set(img.id, await pdf.embedPng(new Uint8Array(img.data)))

    for (const p of placements as Placement[]) {
      if (!Number.isInteger(p.page) || p.page < 1 || p.page > pages.length || ![p.x, p.y, p.w, p.h].every(inUnit) || p.w <= 0 || p.h <= 0) {
        res.status(400).json({ success: false, message: 'A signature is placed outside the document' }); return
      }
      const page = pages[p.page - 1]
      if (page.getRotation().angle % 360 !== 0) { res.status(400).json({ success: false, message: 'Rotated pages cannot be signed yet. Rotate the PDF upright first.' }); return }
      const { width: pw, height: ph } = page.getSize()
      page.drawImage(embedded.get(p.signatureId)!, { x: p.x * pw, y: ph - (p.y + p.h) * ph, width: p.w * pw, height: p.h * ph })
    }

    // Certificate page: who signed, when, from where, and the fingerprint of the document they signed
    const when = new Date()
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip || 'unknown'
    const originalHash = sha256(bytes)
    // The QR code on the certificate opens the public page that lists the signers and can check a file
    const code = randomBytes(16).toString('hex')
    const appUrl = (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/+$/, '')
    const verifyUrl = `${appUrl}/verify/signed/${code}`
    const qrPng = await pdf.embedPng(await QRCode.toBuffer(verifyUrl, { margin: 1, width: 360, errorCorrectionLevel: 'M' }))
    const earlier = await prisma.signedDocument.findUnique({ where: { fileId: source.id }, select: { code: true } })
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const cert = pdf.addPage([595.28, 841.89])
    let y = 780
    const line = (text: string, o: { b?: boolean; size?: number; gap?: number } = {}) => {
      cert.drawText(text, { x: 56, y, size: o.size ?? 10.5, font: o.b ? bold : font, color: rgb(0.1, 0.12, 0.2) })
      y -= o.gap ?? 20
    }
    const who = `${me.firstName} ${me.lastName}`
    line('Signature certificate', { b: true, size: 20, gap: 34 })
    line('This page records an electronic signature made inside SAN-BMS.', { gap: 30 })
    line('Document', { b: true, gap: 16 }); line(source.name.slice(0, 90), { gap: 24 })
    line('Signed by', { b: true, gap: 16 }); line(`${who} (${me.email})`, { gap: 24 })
    if (contract) { line('Contract', { b: true, gap: 16 }); line(`${contract.contractNumber}, as ${signatoryName}`, { gap: 24 }) }
    line('Date and time (UTC)', { b: true, gap: 16 }); line(when.toISOString().replace('T', ' ').slice(0, 19), { gap: 24 })
    line('Network address', { b: true, gap: 16 }); line(ip, { gap: 24 })
    line('Items placed', { b: true, gap: 16 }); line(`${placements.length} (${images.map(i => i.name).join(', ').slice(0, 80)})`, { gap: 24 })
    line('Fingerprint of the document before signing (SHA-256)', { b: true, gap: 16 })
    line(originalHash.slice(0, 32), { gap: 14 }); line(originalHash.slice(32), { gap: 24 })
    line('The signer confirmed their identity with their account password before signing.', { size: 9, gap: 14 })
    line('The original file is kept unchanged in the system; this is a signed copy.', { size: 9 })
    // Verification block: QR + short code
    y -= 18
    cert.drawImage(qrPng, { x: 56, y: y - 110, width: 110, height: 110 })
    const tx = 180
    cert.drawText('Verify this signed document', { x: tx, y: y - 22, size: 11, font: bold, color: rgb(0.1, 0.12, 0.2) })
    cert.drawText('Scan the QR code, or open the address below.', { x: tx, y: y - 40, size: 9, font, color: rgb(0.3, 0.33, 0.4) })
    cert.drawText(verifyUrl.replace(/^https?:\/\//, '').slice(0, 62), { x: tx, y: y - 56, size: 8, font, color: rgb(0.3, 0.33, 0.4) })
    cert.drawText(`Code ${code.slice(0, 8).toUpperCase()}`, { x: tx, y: y - 74, size: 9, font: bold, color: rgb(0.1, 0.12, 0.2) })
    cert.drawText('The page lists who signed and can check that a file is exactly this signed copy.', { x: tx, y: y - 92, size: 8, font, color: rgb(0.3, 0.33, 0.4) })

    const out = Buffer.from(await pdf.save())
    const base = source.name.replace(/\.[a-z0-9]+$/i, '').replace(/ \(signed\)$/i, '')
    const file = await prisma.storedFile.create({ data: { name: `${base} (signed).pdf`.slice(0, 200), mimeType: 'application/pdf', size: out.length, data: out, uploadedById: me.id } })

    const outHash = sha256(out)
    await prisma.signedDocument.create({
      data: {
        code, fileId: file.id, fileName: file.name, sha256: outHash, originalSha256: originalHash, documentName: source.name,
        contractId: contract?.id ?? null, contractNumber: contract?.contractNumber ?? null, signatoryName: contract ? String(signatoryName) : null,
        signerId: me.id, signerName: who, signerEmail: me.email, ipAddress: ip, itemCount: placements.length, previousCode: earlier?.code ?? null,
      },
    })

    if (contract) {
      const next = signatories.map(s => (s.name === signatoryName ? { ...s, status: 'SIGNED' as const, signedAt: when.toISOString() } : s))
      await prisma.contract.update({
        where: { id: contract.id },
        data: { signatories: next as unknown as object, signedDocumentUrl: `/files/${file.id}`, signedDocumentName: file.name },
      })
    }
    await logAudit(req, {
      action: 'APPROVE', entity: contract ? 'Contract' : 'File', entityId: contract ? contract.id : file.id,
      entityName: contract ? contract.contractNumber : file.name,
      description: contract ? `${who} signed contract ${contract.contractNumber} as ${signatoryName}` : `${who} signed the document ${source.name}`,
      newValue: { signedFile: file.name, originalSha256: originalHash, signedSha256: outHash, verifyCode: code.slice(0, 8), items: placements.length },
    })
    res.status(201).json({ success: true, data: { id: file.id, name: file.name, size: file.size, mimeType: file.mimeType, url: `/files/${file.id}` }, message: 'Document signed' })
  } catch (e) { fail(res, e, 'signDocument') }
}

// ── THE CONTRACT DOCUMENT, WRITTEN BY THE SYSTEM ─────────────────────────────

/** GET /signatures/contract/:id/document — the contract as a PDF, to read before signing (not stored) */
export async function previewContractDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!hasRole(req.user?.role, CONTRACT_VIEWERS)) { res.status(403).json({ success: false, message: 'You are not allowed to open contracts' }); return }
    const doc = await buildContractPdf(req.params.id)
    if (!doc) { res.status(404).json({ success: false, message: 'Contract not found' }); return }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.name)}"`)
    res.send(doc.bytes)
  } catch (e) { fail(res, e, 'previewContractDocument') }
}

/** POST /signatures/contract/:id/document — saves the contract PDF so it can be signed online */
export async function prepareContractDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!hasRole(req.user?.role, CONTRACT_VIEWERS)) { res.status(403).json({ success: false, message: 'You are not allowed to sign contracts' }); return }
    const doc = await buildContractPdf(req.params.id)
    if (!doc) { res.status(404).json({ success: false, message: 'Contract not found' }); return }
    const file = await prisma.storedFile.create({ data: { name: doc.name, mimeType: 'application/pdf', size: doc.bytes.length, data: doc.bytes, uploadedById: req.user!.id } })
    res.status(201).json({ success: true, data: { id: file.id, name: file.name, size: file.size, mimeType: file.mimeType, url: `/files/${file.id}` } })
  } catch (e) { fail(res, e, 'prepareContractDocument') }
}
