import React, { useEffect, useState } from 'react'
import { ShieldCheck, Check, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { userService } from '@/lib/services/operationsService'
import { MODULES, roleCanOpen, modulesFor } from '@/lib/roles'

interface RoleDefinition {
  role: UserRole
  label: string
  /** column heading in the table */
  short: string
  description: string
  color: string
}

const ROLES: RoleDefinition[] = [
  { role: 'SUPER_ADMIN', label: 'Super Admin', short: 'Super Admin', color: 'bg-red-100 text-red-700',
    description: 'Everything, including system settings.' },
  { role: 'ADMIN', label: 'Admin', short: 'Admin', color: 'bg-orange-100 text-orange-700',
    description: 'Runs the company day to day: every module and the settings.' },
  { role: 'FINANCE_MANAGER', label: 'Finance Manager', short: 'Finance', color: 'bg-green-100 text-green-700',
    description: 'Finance, contracts and reports; approves expense claims.' },
  { role: 'SALES_MANAGER', label: 'Sales Manager', short: 'Sales Mgr', color: 'bg-blue-100 text-blue-700',
    description: 'Customers, leads, deals, quotations, marketing and reports.' },
  { role: 'MARKETING_MANAGER', label: 'Marketing Manager', short: 'Marketing', color: 'bg-purple-100 text-purple-700',
    description: 'Customers, leads, campaigns and reports.' },
  { role: 'PROJECT_MANAGER', label: 'Project Manager', short: 'Project Mgr', color: 'bg-indigo-100 text-indigo-700',
    description: 'Projects, the team and their workload, and reports.' },
  { role: 'SALES_STAFF', label: 'Sales Staff', short: 'Sales Staff', color: 'bg-cyan-100 text-cyan-700',
    description: 'Customers, leads and the deal pipeline; own tasks.' },
  { role: 'EMPLOYEE', label: 'Employee', short: 'Employee', color: 'bg-gray-100 text-gray-700',
    description: 'Own tasks, expense claims, the team directory.' },
  { role: 'CUSTOMER', label: 'Customer', short: 'Customer', color: 'bg-yellow-100 text-yellow-700',
    description: 'Customer portal only. Created from the client 360° page.' },
  { role: 'SUPPLIER', label: 'Supplier', short: 'Supplier', color: 'bg-lime-100 text-lime-700',
    description: 'Supplier portal only. Created from Procurement → Suppliers.' },
]

const STAFF_MODULES = MODULES.filter(m => !m.portal)
const PORTAL_MODULES = MODULES.filter(m => m.portal)

export default function RolesPage() {
  const [selected, setSelected] = useState<UserRole | null>(null)
  // null until loaded (only admins can list users)
  const [counts, setCounts] = useState<Partial<Record<UserRole, number>> | null>(null)
  const { user } = useAuthStore()

  // Live number of active users per role (admins only — the users list is restricted)
  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') return
    userService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        const c: Partial<Record<UserRole, number>> = {}
        for (const u of res.data ?? []) if (u.isActive) c[u.role as UserRole] = (c[u.role as UserRole] ?? 0) + 1
        setCounts(c)
      })
      .catch(() => { /* counts are optional */ })
  }, [user?.role])

  const pick = (role: UserRole) => setSelected(prev => (prev === role ? null : role))
  // portal logins are not in the users list (they are managed per client / supplier), so no count for them
  const usersLabel = (role: UserRole) => {
    if (!counts || role === 'CUSTOMER' || role === 'SUPPLIER') return null
    const n = counts[role] ?? 0
    return `${n} user${n === 1 ? '' : 's'}`
  }
  const accessLabel = (role: UserRole) => {
    if (role === 'CUSTOMER' || role === 'SUPPLIER') return 'Portal only'
    const n = modulesFor(role).length
    return n === STAFF_MODULES.length ? 'All modules' : `${n} of ${STAFF_MODULES.length} modules`
  }
  // the highlighted column: the role picked above
  const colCls = (role: UserRole) => (selected === role ? 'bg-santech-50' : '')

  const row = (m: (typeof MODULES)[number]) => (
    <tr key={m.key} className="group border-t border-gray-100">
      <th scope="row" className="sticky left-0 z-10 bg-white group-hover:bg-[#f5f7fd] text-left font-normal px-4 py-2 min-w-[210px]">
        <span className="block text-sm font-medium text-gray-800">{m.label}</span>
        <span className="block text-[11px] text-gray-400">{m.hint}</span>
      </th>
      {ROLES.map(r => {
        const yes = roleCanOpen(r.role, m.key)
        return (
          <td key={r.role} className={cn('text-center px-2 py-2', colCls(r.role))}>
            {yes
              ? <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-green-100 text-green-700" title={`${r.label} can open ${m.label}`}><Check className="w-3.5 h-3.5" strokeWidth={3} /></span>
              : <span className="text-gray-300" title={`${r.label} cannot open ${m.label}`} aria-label="No">—</span>}
          </td>
        )
      })}
    </tr>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Roles & Permissions</h1>
        <p className="text-gray-500 text-sm mt-0.5">What each role can open in SAN-BMS. Click a role to highlight it in the table.</p>
      </div>

      {/* Info banner */}
      <div className="bms-card p-4 flex items-start gap-3 bg-blue-50 border border-blue-100">
        <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          These rules are enforced on every page and by the server. A user gets a role in Settings → User Management; contact your system administrator to change what a role can open.
        </p>
      </div>

      {/* Role cards */}
      {/* 2 per row, 5 per row on wide screens (10 roles = 2 full rows) */}
      <div className="grid-cols-2 xl:grid-cols-5" style={{ display: 'grid', gap: '0.75rem' }}>
        {ROLES.map(r => (
          <button key={r.role} type="button" onClick={() => pick(r.role)} aria-pressed={selected === r.role}
            className={cn('bms-card text-left px-4 py-3 transition-shadow hover:shadow-md flex flex-col gap-1.5',
              selected === r.role && 'ring-2 ring-santech-500')}>
            <span className="flex items-center justify-between gap-2">
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', r.color)}>{r.label}</span>
              {user?.role === r.role && <span className="text-[10px] font-semibold uppercase text-santech-700">You</span>}
            </span>
            <span className="text-xs text-gray-600 flex-1">{r.description}</span>
            <span className="flex items-center justify-between flex-wrap gap-x-2 text-[11px] text-gray-400">
              <span>{accessLabel(r.role)}</span>
              {usersLabel(r.role) && <span className="flex items-center gap-1 text-gray-500"><Users className="w-3 h-3" />{usersLabel(r.role)}</span>}
            </span>
          </button>
        ))}
      </div>

      {/* Who can open what */}
      <div className="bms-card overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Who can open what</h2>
          <p className="text-xs text-gray-500 flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="inline-flex w-4 h-4 items-center justify-center rounded-full bg-green-100 text-green-700"><Check className="w-2.5 h-2.5" strokeWidth={3} /></span> can open</span>
            <span className="flex items-center gap-1"><span className="text-gray-300">—</span> cannot</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-[#f0f3fb] text-left align-top text-xs font-semibold px-4 py-2.5">Module</th>
                {ROLES.map(r => (
                  <th key={r.role} scope="col" className={cn('px-2 py-2.5 text-center align-top min-w-[84px]', colCls(r.role))}>
                    <button type="button" onClick={() => pick(r.role)} className="text-xs font-semibold leading-tight hover:underline">{r.short}</button>
                    {usersLabel(r.role) && <span className="block text-[10px] font-normal text-gray-400">{usersLabel(r.role)}</span>}
                    {user?.role === r.role && <span className="block text-[10px] font-semibold uppercase text-santech-700">You</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAFF_MODULES.map(row)}
              <tr className="border-t border-gray-200">
                <td colSpan={ROLES.length + 1} className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Portals (for logins outside Santech)</td>
              </tr>
              {PORTAL_MODULES.map(row)}
              <tr className="border-t border-gray-200 bg-gray-50">
                <th scope="row" className="sticky left-0 z-10 bg-gray-50 text-left text-xs font-semibold text-gray-600 px-4 py-2">Modules open</th>
                {ROLES.map(r => (
                  <td key={r.role} className={cn('text-center px-2 py-2 text-xs font-semibold text-gray-700', colCls(r.role))}>{modulesFor(r.role).length}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
