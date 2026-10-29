import React, { useEffect, useState } from 'react'
import { ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'
import { roleAccess, useAuthStore } from '@/store/authStore'
import { userService } from '@/lib/services/operationsService'

interface RoleDefinition {
  role: UserRole
  label: string
  description: string
  modules: string[]
  color: string
}

const ALL_MODULES = [
  'dashboard', 'crm', 'sales', 'marketing', 'contracts', 'finance',
  'projects', 'team', 'support', 'reports', 'settings', 'notifications',
  'reception', 'communication', 'training', 'documents', 'procurement',
]

const ROLES: RoleDefinition[] = [
  {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    description: 'Full unrestricted access to all modules and settings.',
    modules: ['*'],
    color: 'bg-red-100 text-red-700',
  },
  {
    role: 'ADMIN',
    label: 'Admin',
    description: 'Full access excluding super-admin system settings.',
    modules: ['dashboard', 'crm', 'sales', 'marketing', 'contracts', 'finance', 'projects', 'team', 'support', 'reports', 'settings', 'notifications', 'reception', 'communication', 'training', 'documents', 'procurement'],
    color: 'bg-orange-100 text-orange-700',
  },
  {
    role: 'FINANCE_MANAGER',
    label: 'Finance Manager',
    description: 'Access to finance, contracts, and reporting modules.',
    modules: ['dashboard', 'finance', 'contracts', 'reports', 'notifications'],
    color: 'bg-green-100 text-green-700',
  },
  {
    role: 'SALES_MANAGER',
    label: 'Sales Manager',
    description: 'Access to CRM, sales, marketing, and reports.',
    modules: ['dashboard', 'crm', 'sales', 'marketing', 'reports', 'notifications'],
    color: 'bg-blue-100 text-blue-700',
  },
  {
    role: 'MARKETING_MANAGER',
    label: 'Marketing Manager',
    description: 'Access to CRM, marketing campaigns, and reports.',
    modules: ['dashboard', 'crm', 'marketing', 'reports', 'notifications'],
    color: 'bg-purple-100 text-purple-700',
  },
  {
    role: 'PROJECT_MANAGER',
    label: 'Project Manager',
    description: 'Access to projects, team management, and reports.',
    modules: ['dashboard', 'projects', 'team', 'my-tasks', 'reports', 'notifications'],
    color: 'bg-indigo-100 text-indigo-700',
  },
  {
    role: 'SALES_STAFF',
    label: 'Sales Staff',
    description: 'Access to CRM, sales pipeline, and personal tasks.',
    modules: ['dashboard', 'crm', 'sales', 'my-tasks', 'notifications'],
    color: 'bg-cyan-100 text-cyan-700',
  },
  {
    role: 'EMPLOYEE',
    label: 'Employee',
    description: 'Access to personal tasks, team directory, and notifications.',
    modules: ['dashboard', 'my-tasks', 'notifications', 'team'],
    color: 'bg-gray-100 text-gray-700',
  },
  {
    role: 'CUSTOMER',
    label: 'Customer',
    description: 'Access to the customer portal only.',
    modules: ['portal'],
    color: 'bg-yellow-100 text-yellow-700',
  },
]

export default function RolesPage() {
  const [expanded, setExpanded] = useState<UserRole | null>(null)
  const [counts, setCounts] = useState<Partial<Record<UserRole, number>>>({})
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

  const toggle = (role: UserRole) => setExpanded(prev => prev === role ? null : role)

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Roles & Permissions</h1>
        <p className="text-gray-500 text-sm mt-0.5">View the module access permissions for each system role</p>
      </div>

      {/* Info banner */}
      <div className="bms-card p-4 flex items-start gap-3 bg-blue-50 border border-blue-100">
        <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Role permissions are enforced across all modules. Contact your system administrator to request permission changes.
        </p>
      </div>

      {/* Role list */}
      <div className="space-y-2">
        {ROLES.map(r => {
          const isOpen = expanded === r.role
          // The rules actually used by the app (authStore), not a separate copy
          const modules = roleAccess[r.role] ?? r.modules
          const moduleList = modules[0] === '*' ? ALL_MODULES : modules

          return (
            <div key={r.role} className="bms-card overflow-hidden">
              <button
                onClick={() => toggle(r.role)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold shrink-0', r.color)}>
                  {r.label}
                </span>
                <p className="flex-1 text-sm text-gray-600">{r.description}</p>
                <span className="text-xs text-gray-400 shrink-0 mr-2">
                  {counts[r.role] !== undefined && <span className="mr-2 text-gray-500">{counts[r.role]} user{counts[r.role] === 1 ? '' : 's'} ·</span>}
                  {modules[0] === '*' ? 'All modules' : `${modules.length} module${modules.length !== 1 ? 's' : ''}`}
                </span>
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="px-5 pb-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mt-3 mb-2 uppercase tracking-wide">Accessible Modules</p>
                  <div className="flex flex-wrap gap-2">
                    {moduleList.map(mod => (
                      <span
                        key={mod}
                        className="text-xs px-2.5 py-1 bg-santech-50 text-santech-700 rounded-full font-medium capitalize"
                      >
                        {mod.replace(/-/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
