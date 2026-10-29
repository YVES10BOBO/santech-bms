/**
 * File upload / download. Files are stored in the database (StoredFile) because
 * Render's disk is wiped on every deploy. Uploads are sent as base64 JSON.
 */
import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = /^(application\/pdf|image\/(png|jpe?g|gif|webp)|text\/plain|text\/csv|application\/(msword|vnd\.openxmlformats-officedocument\.[a-z.]+|vnd\.ms-excel|zip))$/

const router = Router()
router.use(authenticate)

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, mimeType, base64 } = req.body ?? {}
    if (!name || !mimeType || !base64) { res.status(400).json({ success: false, message: 'File name, type and content are required' }); return }
    if (!ALLOWED.test(String(mimeType))) { res.status(400).json({ success: false, message: 'Only PDF, Word, Excel, images, text or zip files are allowed' }); return }
    const data = Buffer.from(String(base64), 'base64')
    if (data.length > MAX_BYTES) { res.status(413).json({ success: false, message: 'File is larger than 5 MB' }); return }
    const f = await prisma.storedFile.create({ data: { name: String(name).slice(0, 200), mimeType, size: data.length, data, uploadedById: req.user!.id } })
    await logAudit(req, { action: 'CREATE', entity: 'File', entityId: f.id, entityName: f.name, description: `Uploaded file ${f.name} (${Math.round(f.size / 1024)} KB)` })
    res.status(201).json({ success: true, data: { id: f.id, name: f.name, size: f.size, mimeType: f.mimeType, url: `/files/${f.id}` } })
  } catch (e) {
    console.error('upload error:', e)
    res.status(500).json({ success: false, message: 'Upload failed' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const f = await prisma.storedFile.findUnique({ where: { id: req.params.id } })
    if (!f) { res.status(404).json({ success: false, message: 'File not found' }); return }
    res.setHeader('Content-Type', f.mimeType)
    res.setHeader('Content-Length', String(f.size))
    res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(f.name)}"`)
    res.send(Buffer.from(f.data))
  } catch (e) {
    console.error('download error:', e)
    res.status(500).json({ success: false, message: 'Download failed' })
  }
})

export default router
