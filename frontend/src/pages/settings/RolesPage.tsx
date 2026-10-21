import React, { useState } from 'react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import {
  Shield,
  Plus,
  Edit2,
  Check,
  X,
  Users,
  ChevronRight,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type RoleName =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE_MANAGER'
  | 'SALES_STAFF'
  | 'PROJECT_MANAGER'
  | 'MARKETING_MANAGER'
  | 'EMPLOYEE'
  | 'RECEPTIONIST'

type ModuleName =
  | 'dashboard'
  | 'crm'
  | 'sales'
  | 'marketing'
  | 'contracts'
  | 'finance'
  | 'projects'
  | 'team'
  | 'support'
  | 'documents'
  | 'reports'
  | 'settings'
  | 'reception'
  | 'communication'
  | 'my-tasks'
  | 'notifications'
  | 'portal'

interface Role {
  id: string
  name: RoleName
  description: string
  userCount: number
  access: ModuleName[]
}

interface AddRoleForm {
  roleName: string
  description: string
  permissions: Record<ModuleName, boolean>
}

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_MODULES: ModuleName[] = [
  'dashboard',
  'crm',
  'sales',
  'marketing',
  'contracts',
  'finance',
  'projects',
  'team',
  'support',
  'documents',
  'reports',
  'settings',
  'reception',
  'communication',
  'my-tasks',
  'notifications',
  'portal',
]

const MATRIX_MODULES: ModuleName[] = [
  'dashboard',
  'crm',
  'sales',
  'marketing',
  'contracts',
  'finance',
  'projects',
  'team',
  'support',
  'documents',
  'reports',
  'settings',
  'reception',
  'communication',
]

const MODAL_MODULES: ModuleName[] = MATRIX_MODULES

const MODULE_LABELS: Record<ModuleName, string> = {
  dashboard: 'Dashboard',
  crm: 'CRM',
  sales: 'Sales',
  marketing: 'Marketing',
  contracts: 'Contracts',
  finance: 'Finance',
  projects: 'Projects',
  team: 'Team',
  support: 'Support',
  documents: 'Documents',
  reports: 'Reports',
  settings: 'Settings',
  reception: 'Reception',
  communication: 'Communication',
  'my-tasks': 'My Tasks',
  notifications: 'Notifications',
  portal: 'Portal',
}

const ROLE_BADGE_COLORS: Record<RoleName, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  FINANCE_MANAGER: 'bg-green-100 text-green-700',
  SALES_STAFF: 'bg-yellow-100 text-yellow-700',
  PROJECT_MANAGER: 'bg-indigo-100 text-indigo-700',
  MARKETING_MANAGER: 'bg-purple-100 text-purple-700',
  EMPLOYEE: 'bg-gray-100 text-gray-700',
  RECEPTIONIST: 'bg-orange-100 text-orange-700',
}

const ROLE_DISPLAY_NAMES: Record<RoleName, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  FINANCE_MANAGER: 'Finance Manager',
  SALES_STAFF: 'Sales Staff',
  PROJECT_MANAGER: 'Project Manager',
  MARKETING_MANAGER: 'Marketing Manager',
  EMPLOYEE: 'Employee',
  RECEPTIONIST: 'Receptionist',
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const ALL_ACCESS: ModuleName[] = [
  'dashboard', 'crm', 'sales', 'marketing', 'contracts', 'finance',
  'projects', 'team', 'support', 'documents', 'reports', 'settings',
  'reception', 'communication', 'my-tasks', 'notifications', 'portal',
]

const ADMIN_ACCESS: ModuleName[] = ALL_ACCESS.filter((m) => m !== 'portal')

const initialRoles: Role[] = [
  {
    id: '1',
    name: 'SUPER_ADMIN',
    description: 'Full system access — can manage all modules and users',
    userCount: 1,
    access: ALL_ACCESS,
  },
  {
    id: '2',
    name: 'ADMIN',
    description: 'Administrative access to most modules',
    userCount: 2,
    access: ADMIN_ACCESS,
  },
  {
    id: '3',
    name: 'FINANCE_MANAGER',
    description: 'Manages financial data, invoices, and reports',
    userCount: 1,
    access: ['dashboard', 'finance', 'contracts', 'reports'],
  },
  {
    id: '4',
    name: 'SALES_STAFF',
    description: 'Handles CRM, leads, quotations and pipeline',
    userCount: 3,
    access: ['dashboard', 'crm', 'sales', 'my-tasks'],
  },
  {
    id: '5',
    name: 'PROJECT_MANAGER',
    description: 'Manages projects, tasks and team workload',
    userCount: 1,
    access: ['dashboard', 'projects', 'team', 'reports'],
  },
  {
    id: '6',
    name: 'MARKETING_MANAGER',
    description: 'Manages campaigns and marketing content',
    userCount: 1,
    access: ['dashboard', 'crm', 'marketing', 'reports'],
  },
  {
    id: '7',
    name: 'EMPLOYEE',
    description: 'Basic access to personal tasks and notifications',
    userCount: 5,
    access: ['dashboard', 'my-tasks', 'notifications'],
  },
  {
    id: '8',
    name: 'RECEPTIONIST',
    description: 'Handles visitor log and reception desk',
    userCount: 1,
    access: ['dashboard', 'reception', 'notifications'],
  },
]

// Permission matrix: rows = MATRIX_MODULES, cols = roles (in order)
type MatrixRoleKey = 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE_MANAGER' | 'SALES_STAFF' | 'PROJECT_MANAGER' | 'MARKETING_MANAGER' | 'EMPLOYEE' | 'RECEPTIONIST'

const MATRIX_ROLE_HEADERS: { key: MatrixRoleKey; label: string }[] = [
  { key: 'SUPER_ADMIN', label: 'S.Admin' },
  { key: 'ADMIN', label: 'Admin' },
  { key: 'FINANCE_MANAGER', label: 'Finance' },
  { key: 'SALES_STAFF', label: 'Sales' },
  { key: 'PROJECT_MANAGER', label: 'PM' },
  { key: 'MARKETING_MANAGER', label: 'Marketing' },
  { key: 'EMPLOYEE', label: 'Employee' },
  { key: 'RECEPTIONIST', label: 'Reception' },
]

const PERMISSION_MATRIX: Record<ModuleName, Record<MatrixRoleKey, boolean>> = {
  dashboard:     { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: true,  SALES_STAFF: true,  PROJECT_MANAGER: true,  MARKETING_MANAGER: true,  EMPLOYEE: true,  RECEPTIONIST: true  },
  crm:           { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: false, SALES_STAFF: true,  PROJECT_MANAGER: false, MARKETING_MANAGER: true,  EMPLOYEE: false, RECEPTIONIST: false },
  sales:         { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: false, SALES_STAFF: true,  PROJECT_MANAGER: false, MARKETING_MANAGER: false, EMPLOYEE: false, RECEPTIONIST: false },
  marketing:     { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: false, SALES_STAFF: false, PROJECT_MANAGER: false, MARKETING_MANAGER: true,  EMPLOYEE: false, RECEPTIONIST: false },
  contracts:     { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: true,  SALES_STAFF: false, PROJECT_MANAGER: false, MARKETING_MANAGER: false, EMPLOYEE: false, RECEPTIONIST: false },
  finance:       { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: true,  SALES_STAFF: false, PROJECT_MANAGER: false, MARKETING_MANAGER: false, EMPLOYEE: false, RECEPTIONIST: false },
  projects:      { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: false, SALES_STAFF: false, PROJECT_MANAGER: true,  MARKETING_MANAGER: false, EMPLOYEE: false, RECEPTIONIST: false },
  team:          { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: false, SALES_STAFF: false, PROJECT_MANAGER: true,  MARKETING_MANAGER: false, EMPLOYEE: true,  RECEPTIONIST: false },
  support:       { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: false, SALES_STAFF: false, PROJECT_MANAGER: false, MARKETING_MANAGER: false, EMPLOYEE: false, RECEPTIONIST: false },
  documents:     { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: true,  SALES_STAFF: false, PROJECT_MANAGER: true,  MARKETING_MANAGER: false, EMPLOYEE: false, RECEPTIONIST: false },
  reports:       { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: true,  SALES_STAFF: false, PROJECT_MANAGER: true,  MARKETING_MANAGER: true,  EMPLOYEE: false, RECEPTIONIST: false },
  settings:      { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: false, SALES_STAFF: false, PROJECT_MANAGER: false, MARKETING_MANAGER: false, EMPLOYEE: false, RECEPTIONIST: false },
  reception:     { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: false, SALES_STAFF: false, PROJECT_MANAGER: false, MARKETING_MANAGER: false, EMPLOYEE: false, RECEPTIONIST: true  },
  communication: { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: false, SALES_STAFF: false, PROJECT_MANAGER: true,  MARKETING_MANAGER: false, EMPLOYEE: false, RECEPTIONIST: false },
  // Unused in matrix but needed for the record type
  'my-tasks':    { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: false, SALES_STAFF: true,  PROJECT_MANAGER: false, MARKETING_MANAGER: false, EMPLOYEE: true,  RECEPTIONIST: false },
  notifications: { SUPER_ADMIN: true,  ADMIN: true,  FINANCE_MANAGER: false, SALES_STAFF: false, PROJECT_MANAGER: false, MARKETING_MANAGER: false, EMPLOYEE: true,  RECEPTIONIST: true  },
  portal:        { SUPER_ADMIN: true,  ADMIN: false, FINANCE_MANAGER: false, SALES_STAFF: false, PROJECT_MANAGER: false, MARKETING_MANAGER: false, EMPLOYEE: false, RECEPTIONIST: false },
}

// ── Helper ────────────────────────────────────────────────────────────────────

function buildEmptyPermissions(): Record<ModuleName, boolean> {
  return ALL_MODULES.reduce((acc, mod) => {
    acc[mod] = false
    return acc
  }, {} as Record<ModuleName, boolean>)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RolesPage() {
  // suppress unused-import warnings for formatDate / formatCurrency
  void formatDate
  void formatCurrency

  const [roles] = useState<Role[]>(initialRoles)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<AddRoleForm>({
    roleName: '',
    description: '',
    permissions: buildEmptyPermissions(),
  })

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openModal = () => {
    setForm({ roleName: '', description: '', permissions: buildEmptyPermissions() })
    setShowModal(true)
  }

  const closeModal = () => setShowModal(false)

  const togglePermission = (mod: ModuleName) => {
    setForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [mod]: !prev.permissions[mod] },
    }))
  }

  const handleCreate = () => {
    // No API — just close modal (data is mock)
    closeModal()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Roles &amp; Permissions</h1>
            <p className="text-sm text-gray-500">Manage system roles and module access</p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Role
        </button>
      </div>

      {/* ── Section 1: Role Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="bms-card p-4 flex flex-col gap-3">
            {/* Role name badge + user count */}
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                  ROLE_BADGE_COLORS[role.name],
                )}
              >
                {ROLE_DISPLAY_NAMES[role.name]}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="w-3.5 h-3.5" />
                {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed">{role.description}</p>

            {/* Module access chips */}
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1.5">Module Access</p>
              <div className="flex flex-wrap gap-1">
                {role.access.map((mod) => (
                  <span
                    key={mod}
                    className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                  >
                    {MODULE_LABELS[mod]}
                  </span>
                ))}
              </div>
            </div>

            {/* Edit button */}
            <div className="pt-1 border-t border-gray-100 flex justify-end">
              <button className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Section 2: Permission Matrix ── */}
      <div className="bms-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-800">Permission Matrix</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap border-b border-r border-gray-200 min-w-[140px]">
                  Module
                </th>
                {MATRIX_ROLE_HEADERS.map((rh) => (
                  <th
                    key={rh.key}
                    className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200"
                  >
                    {rh.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_MODULES.map((mod, idx) => (
                <tr
                  key={mod}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
                  )}
                >
                  <td className="sticky left-0 bg-inherit px-4 py-2 text-xs font-medium text-gray-700 border-r border-gray-200 whitespace-nowrap">
                    {MODULE_LABELS[mod]}
                  </td>
                  {MATRIX_ROLE_HEADERS.map((rh) => {
                    const hasAccess = PERMISSION_MATRIX[mod][rh.key]
                    return (
                      <td key={rh.key} className="px-3 py-2 text-center">
                        {hasAccess ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" aria-label="Access granted" />
                        ) : (
                          <X className="w-4 h-4 text-red-400 mx-auto" aria-label="No access" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Role Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-role-title"
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 id="add-role-title" className="text-base font-semibold text-gray-900">
                Add New Role
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {/* Role Name */}
              <div>
                <label htmlFor="role-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={form.roleName}
                  onChange={(e) => setForm((prev) => ({ ...prev, roleName: e.target.value }))}
                  placeholder="e.g. SUPPORT_AGENT"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="role-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="role-description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this role can do..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Permissions checkboxes */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Permissions</p>
                <div className="grid grid-cols-2 gap-2">
                  {MODAL_MODULES.map((mod) => (
                    <label
                      key={mod}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions[mod]}
                        onChange={() => togglePermission(mod)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{MODULE_LABELS[mod]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
