/**
 * Drop-down lists managed by admins (Settings): add a choice, rename it, hide it, delete it when unused.
 */
import { Response } from 'express'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { findList, ensureDefaults } from '../lib/listOptions'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, error: unknown, where: string) => {
  console.error(`${where} error:`, error)
  res.status(500).json({ success: false, message: 'Internal server error' })
}

const slug = (label: string) => label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)

/** GET /lists/:list — every choice with its isActive flag (hidden ones are still needed to show old records) */
export async function getListOptions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const def = findList(req.params.list)
    if (!def) { res.status(404).json({ success: false, message: 'Unknown list' }); return }
    try { await ensureDefaults(def) } catch { /* another request saved them first */ }
    const rows = await prisma.listOption.findMany({
      where: { list: def.key },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    // "Other" always goes last
    const data = [...rows.filter(r => r.value !== def.other), ...rows.filter(r => r.value === def.other)]
    res.json({
      success: true,
      data: data.map(r => ({ id: r.id, value: r.value, label: r.label, isActive: r.isActive, isOther: r.value === def.other })),
      meta: { title: def.title, other: def.other },
    })
  } catch (e) { fail(res, e, 'getListOptions') }
}

export async function addListOption(req: AuthRequest, res: Response): Promise<void> {
  try {
    const def = findList(req.params.list)
    if (!def) { res.status(404).json({ success: false, message: 'Unknown list' }); return }
    const label = String(req.body.label ?? '').trim().slice(0, 60)
    if (!label) { res.status(400).json({ success: false, message: 'Type the name of the new choice' }); return }
    await ensureDefaults(def).catch(() => undefined)
    const rows = await prisma.listOption.findMany({ where: { list: def.key } })
    if (rows.some(r => r.label.toLowerCase() === label.toLowerCase())) { res.status(409).json({ success: false, message: 'This choice already exists' }); return }
    // Lists that store readable text keep the text itself as the value; the others use a code
    const usesCodes = def.defaults.some(d => d.value !== d.label)
    let value = usesCodes ? slug(label) : label
    if (!value) { res.status(400).json({ success: false, message: 'Use letters or numbers in the name' }); return }
    if (rows.some(r => r.value === value)) value = `${value}_${rows.length + 1}`
    const sortOrder = rows.filter(r => r.value !== def.other).length
    const row = await prisma.listOption.create({ data: { list: def.key, value, label, sortOrder } })
    await logAudit(req, {
      action: 'CREATE', entity: 'ListOption', entityId: row.id, entityName: label,
      description: `Added "${label}" to ${def.title}`, newValue: { list: def.key, value, label },
    })
    res.status(201).json({ success: true, data: row, message: 'Choice added' })
  } catch (e) { fail(res, e, 'addListOption') }
}

/** Rename, hide / show (isActive) or reorder (sortOrder). "Other" cannot be changed. */
export async function updateListOption(req: AuthRequest, res: Response): Promise<void> {
  try {
    const def = findList(req.params.list)
    const before = def ? await prisma.listOption.findUnique({ where: { id: req.params.id } }) : null
    if (!def || !before || before.list !== def.key) { res.status(404).json({ success: false, message: 'Choice not found' }); return }
    if (before.value === def.other) { res.status(400).json({ success: false, message: '"Other" is built in and cannot be changed' }); return }
    const { label, isActive, sortOrder } = req.body
    const newLabel = label !== undefined ? String(label).trim().slice(0, 60) : undefined
    if (newLabel !== undefined && !newLabel) { res.status(400).json({ success: false, message: 'The name cannot be empty' }); return }
    if (newLabel) {
      const dup = await prisma.listOption.findFirst({ where: { list: def.key, id: { not: before.id }, label: { equals: newLabel, mode: 'insensitive' } } })
      if (dup) { res.status(409).json({ success: false, message: 'This choice already exists' }); return }
    }
    const row = await prisma.listOption.update({
      where: { id: before.id },
      data: {
        ...(newLabel !== undefined && { label: newLabel }),
        ...(isActive !== undefined && { isActive: !!isActive }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) || 0 }),
      },
    })
    const toggled = isActive !== undefined && isActive !== before.isActive
    await logAudit(req, {
      action: 'UPDATE', entity: 'ListOption', entityId: row.id, entityName: row.label,
      description: toggled ? `${row.isActive ? 'Showed' : 'Hid'} "${row.label}" in ${def.title}` : `Renamed "${before.label}" to "${row.label}" in ${def.title}`,
      oldValue: { label: before.label, isActive: before.isActive }, newValue: { label: row.label, isActive: row.isActive },
    })
    res.json({ success: true, data: row, message: toggled ? (row.isActive ? 'Choice shown' : 'Choice hidden') : 'Choice updated' })
  } catch (e) { fail(res, e, 'updateListOption') }
}

/** Deleting is only allowed when no record uses the choice; otherwise hide it instead. */
export async function deleteListOption(req: AuthRequest, res: Response): Promise<void> {
  try {
    const def = findList(req.params.list)
    const row = def ? await prisma.listOption.findUnique({ where: { id: req.params.id } }) : null
    if (!def || !row || row.list !== def.key) { res.status(404).json({ success: false, message: 'Choice not found' }); return }
    if (row.value === def.other) { res.status(400).json({ success: false, message: '"Other" is built in and cannot be deleted' }); return }
    const used = await def.usage(row.value)
    if (used > 0) {
      res.status(409).json({ success: false, message: `${used} record${used === 1 ? ' uses' : 's use'} this choice. Hide it instead of deleting it.` })
      return
    }
    await prisma.listOption.delete({ where: { id: row.id } })
    await logAudit(req, { action: 'DELETE', entity: 'ListOption', entityId: row.id, entityName: row.label, description: `Deleted "${row.label}" from ${def.title}` })
    res.json({ success: true, message: 'Choice deleted' })
  } catch (e) { fail(res, e, 'deleteListOption') }
}
