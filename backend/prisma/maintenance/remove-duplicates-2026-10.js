/**
 * One-off clean-up (29 Oct 2026): removes duplicate demo data left by older seed versions
 * that ran several times on 26–27 Oct 2026 — duplicate clients, projects, a duplicate
 * contract, field visits, deals, tasks, triple-counted payments — and fixes links between them.
 *
 * Run from the backend folder (uses DIRECT_URL, else DATABASE_URL, from backend/.env):
 *   node prisma/maintenance/remove-duplicates-2026-10.js           → dry run: prints the plan only
 *   node prisma/maintenance/remove-duplicates-2026-10.js --apply   → applies it in ONE transaction
 *
 * Safe by design: survivors are the records the current seed recreates (cl-*, proj-*, fv-*,
 * opp-*, task-*); only records created before 28 Oct 2026 can be removed, never one changed
 * in the app (Audit Trail) except the Serena deal copies listed in ALLOW_EDITED; checks run
 * before commit and any problem rolls everything back. Back up first (see CHANGELOG).
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const APPLY = process.argv.includes('--apply')
const url = process.env.DIRECT_URL || process.env.DATABASE_URL || ''
const host = (url.match(/@([^/:?]+)/) || [])[1] || '?'
const prisma = new PrismaClient({ datasources: { db: { url } } }) // direct connection: one long transaction

const CUTOFF = new Date('2026-10-28T00:00:00Z')
const SEEDED_PROJECTS = ['proj-santrack', 'proj-evs-sabban', 'proj-website', 'proj-stock', 'proj-hospital', 'proj-cta']
const CONTRACT_DUPES = { 'CT-2026-003': 'CT-2026-004' } // the same N&T SANTRACK deal under two numbers
// Copies of the Serena deal that were only dragged between pipeline stages on 29 Oct (no other changes)
const ALLOW_EDITED = new Set(['cmvpdnn0i002ileb818nmjx9r', 'cmvpefl2d002iuwy4k5b33iax'])
const SEED_PLANS = { 'proj-evs-sabban': { // the current seed's plan: percentage + deadline
  'site survey': [30, '2026-11-15'], 'hardware procurement': [0, '2026-12-15'], 'installation & testing': [40, '2027-02-28'], 'training & handover': [30, '2027-04-30'] } }

const day = v => (v ? new Date(v).toISOString().slice(0, 10) : '')
const low = v => (v ?? '').toString().trim().toLowerCase()
const norm = v => low(v).replace(/\b(ltd|limited|plc)\b/g, '').replace(/[^a-z0-9]/g, '')
const base = name => norm((name || '').split(' — ')[0])
let AUDITED = new Set()
const old = r => r.createdAt < CUTOFF && (!AUDITED.has(r.id) || ALLOW_EDITED.has(r.id))
const nameOf = c => c.companyName || c.fullName || c.teamName || c.delegationName || ''
const groupBy = (rows, key) => { const g = {}; for (const r of rows) (g[JSON.stringify(key(r))] ??= []).push(r); return Object.values(g) }
const byAge = (a, b) => a.createdAt - b.createdAt

async function buildPlan() {
  const plan = { clients: [], contracts: [], projects: [], milestones: [], projectContracts: [], payments: [], visits: [], deals: [], tasks: [], notifications: [], kept: [] }
  const skip = (what, r, why) => plan.kept.push(`${what} ${r.id}: ${why}`)
  AUDITED = new Set((await prisma.auditLog.findMany({ select: { entityId: true } })).map(a => a.entityId))

  // 1. Clients: same name → keep the seeded cl-* record
  const clients = await prisma.client.findMany()
  const clientMap = {}
  for (const g of groupBy(clients, c => norm(nameOf(c))).filter(g => g.length > 1)) {
    const canon = g.filter(c => c.id.startsWith('cl-'))
    if (canon.length !== 1) { g.forEach(c => skip('client', c, 'duplicate name but no single seeded cl-* record')); continue }
    const keep = canon[0]
    const remove = g.filter(c => c !== keep && (old(c) || (skip('client', c, 'edited in the app, kept'), false)))
    remove.forEach(c => (clientMap[c.id] = keep.id))
    if (remove.length) plan.clients.push({ keep, remove })
  }
  const cid = id => (id ? clientMap[id] ?? id : id)

  // 2. Contracts: duplicate numbers for the same deal
  const contracts = await prisma.contract.findMany()
  const ctByNo = Object.fromEntries(contracts.map(c => [c.contractNumber, c]))
  const ctMap = {}
  for (const [dupNo, keepNo] of Object.entries(CONTRACT_DUPES)) {
    const dup = ctByNo[dupNo], keep = ctByNo[keepNo]
    if (!dup || !keep) continue
    if (cid(dup.clientId) !== cid(keep.clientId) || dup.value !== keep.value) { skip('contract', dup, 'not the same client/value, kept'); continue }
    if (!old(dup)) { skip('contract', dup, 'edited in the app, kept'); continue }
    ctMap[dup.id] = keep.id
    plan.contracts.push({ keep, remove: dup })
  }
  const ctid = id => (id ? ctMap[id] ?? id : id)
  const ctClient = Object.fromEntries(contracts.map(c => [c.id, cid(c.clientId)]))

  // 3. Projects: same client + same base name → keep the seeded proj-* record
  const projects = await prisma.project.findMany({ include: { milestones: true } })
  const projMap = {}
  for (const keep of projects.filter(p => SEEDED_PROJECTS.includes(p.id))) {
    const dupes = projects.filter(p => !SEEDED_PROJECTS.includes(p.id) && cid(p.clientId) === cid(keep.clientId) && base(p.name) === base(keep.name))
    const remove = dupes.filter(p => old(p) || (skip('project', p, 'edited in the app, kept'), false))
    if (!remove.length) continue
    remove.forEach(p => (projMap[p.id] = keep.id))
    plan.projects.push({ keep, remove })
    const byName = Object.fromEntries(keep.milestones.map(m => [low(m.name), m]))
    for (const p of remove) for (const m of p.milestones) {
      const twin = byName[low(m.name)]
      if (twin && m.invoiceId && !twin.invoiceId) plan.milestones.push({ action: 'move invoice link', from: m, to: twin })
      if (twin || !m.invoiceId) plan.milestones.push({ action: 'delete copy', m })
      else plan.milestones.push({ action: 'move to kept project', m, to: keep.id })
    }
    // Project must point at a contract of its own client
    const current = ctid(keep.contractId)
    if (!current || ctClient[current] !== cid(keep.clientId)) {
      const own = remove.map(p => ctid(p.contractId)).find(c => c && ctClient[c] === cid(keep.clientId)) ?? null
      if (own !== current) plan.projectContracts.push({ project: keep.id, from: keep.contractId, to: own })
    }
  }
  // Seed milestone plan (only where the percentages no longer add up to 100%)
  for (const [pid, wanted] of Object.entries(SEED_PLANS)) {
    const ms = (projects.find(p => p.id === pid)?.milestones ?? [])
    const total = ms.reduce((s, m) => s + (m.paymentPercentage ?? 0), 0)
    if (total === 100) continue
    for (const m of ms) {
      if (low(m.name) in wanted) {
        const [pct, deadline] = wanted[low(m.name)]
        if (m.paymentPercentage !== pct || day(m.deadline) !== deadline) plan.milestones.push({ action: 'set plan values', m, pct, deadline })
      }
      else if (m.status === 'NOT_STARTED' && !m.invoiceId && old(m)) plan.milestones.push({ action: 'delete old plan', m })
      else skip('milestone', m, 'not in the plan but started, invoiced or edited in the app, kept')
    }
    plan.milestones.push({ action: 'renumber by deadline', project: pid })
  }

  // 4. Payments recorded 3× by an old seed → keep the oldest
  const payments = await prisma.payment.findMany({ include: { incomeEntry: true } })
  for (const g of groupBy(payments, p => [p.invoiceId, p.amount, day(p.paymentDate)]).filter(g => g.length > 1)) {
    const [keep, ...rest] = g.sort(byAge)
    const remove = rest.filter(p => old(p) || (skip('payment', p, 'edited in the app, kept'), false))
    if (remove.length) plan.payments.push({ keep, remove })
  }

  // 5. Field visits: same day + client/company + outcome → keep fv-* (else the oldest)
  const visits = await prisma.fieldVisit.findMany()
  for (const g of groupBy(visits, v => [day(v.visitDate), cid(v.clientId) || norm(v.companyName), v.outcome]).filter(g => g.length > 1)) {
    const keep = g.find(v => v.id.startsWith('fv-')) ?? g.sort(byAge)[0]
    const remove = g.filter(v => v !== keep && (old(v) || (skip('visit', v, 'edited in the app, kept'), false)))
    if (remove.length) plan.visits.push({ keep, remove })
  }

  // 6. Deals: same client + value (+ same name, or a seeded opp-* in the group) → keep opp-*
  const deals = await prisma.opportunity.findMany({ include: { products: true } })
  for (const g of groupBy(deals, o => [cid(o.clientId), o.estimatedValue]).filter(g => g.length > 1)) {
    const seeded = g.filter(o => o.id.startsWith('opp-'))
    const sameName = new Set(g.map(o => norm(o.name))).size === 1
    if (seeded.length > 1 || (!seeded.length && !sameName)) { g.forEach(o => skip('deal', o, 'similar deals, not clearly copies')); continue }
    const keep = seeded[0] ?? g.sort(byAge)[0]
    const remove = g.filter(o => o !== keep && (old(o) || (skip('deal', o, 'edited in the app, kept'), false)))
    if (remove.length) plan.deals.push({ keep, remove })
  }

  // 7. Tasks: same title + assignee → keep task-* (else the oldest)
  const tasks = await prisma.task.findMany()
  const removedTasks = []
  for (const g of groupBy(tasks, t => [low(t.title), t.assignedToId]).filter(g => g.length > 1)) {
    const seeded = g.filter(t => t.id.startsWith('task-'))
    const keep = seeded.length === 1 ? seeded[0] : g.sort(byAge)[0]
    const remove = g.filter(t => t !== keep && (old(t) || (skip('task', t, 'edited in the app, kept'), false)))
    removedTasks.push(...remove.map(t => t.id))
    if (remove.length) plan.tasks.push({ keep, remove })
  }

  // 8. Notifications that point at a removed task
  const notes = await prisma.notification.findMany({ where: { key: { not: null } } })
  plan.notifications = notes.filter(n => removedTasks.some(id => n.key.includes(id)))
  return { plan, clientMap, projMap, ctMap }
}

function printPlan(plan) {
  const n = (k, arr, f) => console.log(`\n${k}: ${arr.length}` + (arr.length ? '\n' + arr.map(f).join('\n') : ''))
  n('CLIENT merges', plan.clients, g => `  ${nameOf(g.keep)}: keep ${g.keep.id} ← remove ${g.remove.map(c => c.id).join(', ')}`)
  n('CONTRACT merges', plan.contracts, g => `  keep ${g.keep.contractNumber} ← remove ${g.remove.contractNumber}`)
  n('PROJECT merges', plan.projects, g => `  "${g.keep.name}": keep ${g.keep.id} ← remove ${g.remove.map(p => p.id).join(', ')}`)
  n('MILESTONE changes', plan.milestones, m => `  ${m.action}: ${m.m ? `"${m.m.name}" (${m.m.id})` : m.from ? `"${m.from.name}" ${m.from.id} → ${m.to.id}` : m.project}${m.pct !== undefined ? ` → ${m.pct}%, due ${m.deadline}` : ''}`)
  n('PROJECT contract fixes', plan.projectContracts, f => `  ${f.project}: ${f.from ?? '-'} → ${f.to ?? 'none'}`)
  n('PAYMENT copies', plan.payments, g => `  keep ${g.keep.id} ← remove ${g.remove.map(p => `${p.id}${p.incomeEntry ? ' (+income ' + p.incomeEntry.id + ')' : ''}`).join(', ')}`)
  n('FIELD VISIT copies', plan.visits, g => `  ${day(g.keep.visitDate)} ${g.keep.companyName}: keep ${g.keep.id} ← remove ${g.remove.length}`)
  n('DEAL copies', plan.deals, g => `  "${g.keep.name}": keep ${g.keep.id} ← remove ${g.remove.length}`)
  n('TASK copies', plan.tasks, g => `  "${g.keep.title}": keep ${g.keep.id} ← remove ${g.remove.length}`)
  n('NOTIFICATIONS for removed tasks', plan.notifications, x => `  ${x.id} "${x.title}"`)
  n('KEPT on purpose', plan.kept, x => `  ${x}`)
}

const CLIENT_FK = ['clientMember', 'fieldVisit', 'opportunity', 'contract', 'invoice', 'project', 'incomeEntry', 'quotation', 'supportTicket', 'communication', 'meeting', 'clientSubscription', 'document', 'lead']
const SKIP_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'status', 'category', 'kind', 'companyName', 'clientType', 'services', 'active'])

async function apply({ plan }) {
  await prisma.$transaction(async tx => {
    // Clients
    for (const { keep, remove } of plan.clients) {
      const ids = remove.map(c => c.id)
      for (const m of CLIENT_FK) await tx[m].updateMany({ where: { clientId: { in: ids } }, data: { clientId: keep.id } })
      await tx.incomeEntry.updateMany({ where: { clientId: keep.id }, data: { clientName: nameOf(keep) } })
      const fill = {}
      for (const c of [...remove].sort(byAge)) for (const [k, v] of Object.entries(c)) {
        if (SKIP_FIELDS.has(k) || v === null || v === '' || fill[k] !== undefined) continue
        if (keep[k] === null || keep[k] === '') fill[k] = v
      }
      if (remove.some(c => c.clientType === 'CONTRACTOR')) fill.clientType = 'CONTRACTOR'
      const services = [...new Set([...(keep.services ?? []), ...remove.flatMap(c => c.services ?? [])])]
      if (services.length !== (keep.services ?? []).length) fill.services = services
      if (Object.keys(fill).length) await tx.client.update({ where: { id: keep.id }, data: fill })
      await tx.client.deleteMany({ where: { id: { in: ids } } })
    }
    // Contracts
    for (const { keep, remove } of plan.contracts) {
      for (const m of ['invoice', 'project', 'quotation', 'opportunity']) await tx[m].updateMany({ where: { contractId: remove.id }, data: { contractId: keep.id } })
      await tx.contract.delete({ where: { id: remove.id } })
    }
    // Projects + milestones
    for (const m of plan.milestones.filter(x => x.action === 'move invoice link')) {
      await tx.milestone.update({ where: { id: m.from.id }, data: { invoiceId: null } })
      await tx.milestone.update({ where: { id: m.to.id }, data: { invoiceId: m.from.invoiceId } })
    }
    for (const m of plan.milestones.filter(x => x.action === 'move to kept project')) await tx.milestone.update({ where: { id: m.m.id }, data: { projectId: m.to } })
    for (const m of plan.milestones.filter(x => x.action === 'delete copy' || x.action === 'delete old plan')) await tx.milestone.delete({ where: { id: m.m.id } })
    for (const m of plan.milestones.filter(x => x.action === 'set plan values')) await tx.milestone.update({ where: { id: m.m.id }, data: { paymentPercentage: m.pct, deadline: new Date(m.deadline) } })
    for (const { keep, remove } of plan.projects) {
      const ids = remove.map(p => p.id)
      for (const m of ['invoice', 'task', 'timesheet', 'document']) await tx[m].updateMany({ where: { projectId: { in: ids } }, data: { projectId: keep.id } })
      await tx.project.deleteMany({ where: { id: { in: ids } } })
    }
    for (const f of plan.projectContracts) await tx.project.update({ where: { id: f.project }, data: { contractId: f.to } })
    for (const m of plan.milestones.filter(x => x.action === 'renumber by deadline')) {
      const ms = await tx.milestone.findMany({ where: { projectId: m.project }, orderBy: { deadline: 'asc' } })
      for (const [i, x] of ms.entries()) if (x.milestoneNumber !== i + 1) await tx.milestone.update({ where: { id: x.id }, data: { milestoneNumber: i + 1 } })
    }
    // Payments (and the income they booked)
    for (const { remove } of plan.payments) {
      const ids = remove.map(p => p.id)
      await tx.incomeEntry.deleteMany({ where: { paymentId: { in: ids } } })
      await tx.payment.deleteMany({ where: { id: { in: ids } } })
    }
    // Field visits, deals, tasks, notifications
    await tx.fieldVisit.deleteMany({ where: { id: { in: plan.visits.flatMap(g => g.remove.map(v => v.id)) } } })
    for (const { keep, remove } of plan.deals) {
      const ids = remove.map(o => o.id)
      await tx.lead.updateMany({ where: { opportunityId: { in: ids } }, data: { opportunityId: keep.id } })
      const have = new Set(keep.products.map(p => p.productId))
      for (const p of remove.flatMap(o => o.products)) if (!have.has(p.productId)) { await tx.opportunityProduct.create({ data: { opportunityId: keep.id, productId: p.productId } }); have.add(p.productId) }
      const newest = [keep, ...remove].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      if (newest !== keep && newest.stage !== keep.stage) await tx.opportunity.update({ where: { id: keep.id }, data: { stage: newest.stage, probability: newest.probability } })
      await tx.opportunityProduct.deleteMany({ where: { opportunityId: { in: ids } } })
      await tx.opportunity.deleteMany({ where: { id: { in: ids } } })
    }
    await tx.task.deleteMany({ where: { id: { in: plan.tasks.flatMap(g => g.remove.map(t => t.id)) } } })
    await tx.notification.deleteMany({ where: { id: { in: plan.notifications.map(n => n.id) } } })

    // Checks before commit — any failure rolls everything back
    const problems = []
    const cl = await tx.client.findMany()
    if (groupBy(cl, c => norm(nameOf(c))).some(g => g.length > 1)) problems.push('duplicate client names remain')
    const inv = await tx.invoice.findMany({ include: { contract: true, project: true } })
    for (const i of inv) {
      if (i.contract && i.contract.clientId !== i.clientId) problems.push(`invoice ${i.invoiceNumber}: contract of another client`)
      if (i.project && i.project.clientId !== i.clientId) problems.push(`invoice ${i.invoiceNumber}: project of another client`)
      const paid = (await tx.payment.aggregate({ where: { invoiceId: i.id }, _sum: { amount: true } }))._sum.amount ?? 0
      if (paid > i.totalAmount) problems.push(`invoice ${i.invoiceNumber}: payments exceed total`)
    }
    const pr = await tx.project.findMany({ include: { contract: true, milestones: true } })
    for (const p of pr) {
      if (p.contract && p.contract.clientId !== p.clientId) problems.push(`project ${p.id}: contract of another client`)
      const pct = p.milestones.reduce((s, m) => s + (m.paymentPercentage ?? 0), 0)
      if (SEEDED_PROJECTS.includes(p.id) && p.milestones.length && pct !== 100) problems.push(`project ${p.id}: milestones add up to ${pct}%`)
    }
    if (problems.length) throw new Error('Checks failed, nothing changed:\n  ' + problems.join('\n  '))
  }, { timeout: 240000, maxWait: 30000 })
}

;(async () => {
  console.log(`Database host: ${host}   mode: ${APPLY ? 'APPLY' : 'dry run'}`)
  const built = await buildPlan()
  printPlan(built.plan)
  if (APPLY) { await apply(built); console.log('\n✅ Applied in one transaction') }
  await prisma.$disconnect()
})().catch(async e => { console.error('\n❌ ' + e.message); await prisma.$disconnect(); process.exit(1) })
