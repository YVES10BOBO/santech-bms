import React, { useEffect, useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Edit2,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { User, UserRole } from '@/types'
import { userService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { useAuthStore } from '@/store/authStore'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

// ─── API → page shape ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toUser = (u: any): User => ({
  id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone ?? '',
  role: u.role, department: u.employee?.department ?? '', position: u.employee?.position ?? '',
  isActive: u.isActive, createdAt: u.createdAt, updatedAt: u.updatedAt,
})

const ALL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE_MANAGER',
  'SALES_MANAGER',
  'MARKETING_MANAGER',
  'PROJECT_MANAGER',
  'SALES_STAFF',
  'EMPLOYEE',
  'CUSTOMER',
]

// ─── Role badge colours ────────────────────────────────────────────────────────

function getRoleBadgeClass(role: UserRole): string {
  const map: Record<UserRole, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    SALES_STAFF: 'bg-green-100 text-green-700',
    EMPLOYEE: 'bg-gray-100 text-gray-700',
    FINANCE_MANAGER: 'bg-orange-100 text-orange-700',
    SALES_MANAGER: 'bg-indigo-100 text-indigo-700',
    MARKETING_MANAGER: 'bg-pink-100 text-pink-700',
    PROJECT_MANAGER: 'bg-teal-100 text-teal-700',
    CUSTOMER: 'bg-yellow-100 text-yellow-700',
  }
  return map[role] ?? 'bg-gray-100 text-gray-700'
}

function formatRoleLabel(role: UserRole): string {
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

// ─── Form state type ───────────────────────────────────────────────────────────

interface UserFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  department: string
  position: string
  password: string
  confirmPassword: string
}

const EMPTY_FORM: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'EMPLOYEE',
  department: '',
  position: '',
  password: '',
  confirmPassword: '',
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { user: me } = useAuthStore()

  useEffect(() => {
    userService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setUsers((res.data ?? []).map(toUser)))
      .catch(err => toast.error(apiError(err, 'Failed to load users')))
      .finally(() => setLoading(false))
  }, [])

  // Search / filter
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(10)
  const [page, setPage] = useState(1)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormState, string>>>({})

  // ── Derived stats ────────────────────────────────────────────────────────────

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.isActive).length
  const admins = users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN').length
  const staff = users.filter((u) => u.role !== 'SUPER_ADMIN' && u.role !== 'ADMIN').length

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      const matchesRole = !roleFilter || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  // ── Pagination ───────────────────────────────────────────────────────────────

  const totalPages =
    rowsPerPage === 'All' ? 1 : Math.max(1, Math.ceil(filtered.length / rowsPerPage))

  const currentPage = Math.min(page, totalPages)

  const paginated = useMemo(() => {
    if (rowsPerPage === 'All') return filtered
    const start = (currentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, rowsPerPage, currentPage])

  // ── Modal helpers ────────────────────────────────────────────────────────────

  function openAddModal() {
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  function openEditModal(user: User) {
    setEditingUser(user)
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      department: user.department ?? '',
      position: user.position ?? '',
      password: '',
      confirmPassword: '',
    })
    setErrors({})
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Partial<Record<keyof UserFormState, string>> = {}

    if (!form.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required'

    if (!form.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address'
    }

    if (!form.phone.trim()) newErrors.phone = 'Phone is required'
    if (!form.department.trim()) newErrors.department = 'Department is required'
    if (!form.position.trim()) newErrors.position = 'Position is required'

    if (!editingUser) {
      // Password required only for new users
      if (!form.password) {
        newErrors.password = 'Password is required'
      } else if (form.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      }
      if (!form.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm the password'
      } else if (form.password !== form.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    } else {
      // For edits, validate only if password is provided
      if (form.password) {
        if (form.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters'
        }
        if (form.password !== form.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── Save handler ─────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return
    const payload = {
      firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim(),
      role: form.role, department: form.department.trim(), position: form.position.trim(),
      ...(form.password ? { password: form.password } : {}),
    }
    setSaving(true)
    try {
      if (editingUser) {
        const res = await userService.update(editingUser.id, payload)
        setUsers(prev => prev.map(u => (u.id === editingUser.id ? toUser(res.data) : u)))
        toast.success('User updated')
      } else {
        const res = await userService.create({ ...payload, email: form.email.trim() })
        setUsers(prev => [...prev, toUser(res.data)])
        toast.success(`User created — they can log in with ${form.email.trim()}`)
      }
      closeModal()
    } catch (err) {
      toast.error(apiError(err, 'Failed to save user'))
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

  async function toggleActive(id: string) {
    const target = users.find(u => u.id === id)
    if (!target) return
    if (target.id === me?.id) { toast.error('You cannot deactivate your own account'); return }
    try {
      const res = await userService.update(id, { isActive: !target.isActive })
      setUsers(prev => prev.map(u => (u.id === id ? toUser(res.data) : u)))
      toast.success(res.message)
    } catch (err) {
      toast.error(apiError(err, 'Failed to update user'))
    }
  }

  if (loading) return <PageLoader />

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage system users, roles, and access permissions.
        </p>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Users</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{totalUsers}</p>
          <p className="text-xs text-gray-400 mt-1">Registered accounts</p>
        </div>
        <div className="kpi-card p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Users</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{activeUsers}</p>
          <p className="text-xs text-gray-400 mt-1">Currently active</p>
        </div>
        <div className="kpi-card p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Admins</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{admins}</p>
          <p className="text-xs text-gray-400 mt-1">Super Admin + Admin</p>
        </div>
        <div className="kpi-card p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Staff</p>
          <p className="text-3xl font-bold text-santech-600 mt-1">{staff}</p>
          <p className="text-xs text-gray-400 mt-1">All other roles</p>
        </div>
      </div>

      {/* Table card */}
      <div className="bms-card">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-gray-100">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email or role…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600"
            />
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as UserRole | ''); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600 min-w-[160px]"
          >
            <option value="">All Roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>{formatRoleLabel(r)}</option>
            ))}
          </select>

          {/* Rows per page */}
          <select
            value={rowsPerPage}
            onChange={(e) => {
              const v = e.target.value
              setRowsPerPage(v === 'All' ? 'All' : Number(v))
              setPage(1)
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600"
          >
            {[5, 10, 20].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
            <option value="All">All</option>
          </select>

          {/* Add user */}
          <button
            onClick={openAddModal}
            className="bg-santech-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-santech-700 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-santech-700 uppercase tracking-wider py-3 px-4">Name</th>
                <th className="text-left text-xs font-semibold text-santech-700 uppercase tracking-wider py-3 px-4">Email</th>
                <th className="text-left text-xs font-semibold text-santech-700 uppercase tracking-wider py-3 px-4 hidden md:table-cell">Phone</th>
                <th className="text-left text-xs font-semibold text-santech-700 uppercase tracking-wider py-3 px-4">Role</th>
                <th className="text-left text-xs font-semibold text-santech-700 uppercase tracking-wider py-3 px-4 hidden lg:table-cell">Department</th>
                <th className="text-left text-xs font-semibold text-santech-700 uppercase tracking-wider py-3 px-4">Status</th>
                <th className="text-left text-xs font-semibold text-santech-700 uppercase tracking-wider py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((user) => (
                  <tr key={user.id}>
                    {/* Name */}
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-santech-100 flex items-center justify-center text-xs font-bold text-santech-700 shrink-0">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{user.position}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 text-sm text-gray-700">{user.email}</td>

                    {/* Phone */}
                    <td className="py-3 px-4 text-sm text-gray-700 hidden md:table-cell">
                      {user.phone ?? '—'}
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
                          getRoleBadgeClass(user.role)
                        )}
                      >
                        <Shield className="w-3 h-3" />
                        {formatRoleLabel(user.role)}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 text-sm text-gray-700 hidden lg:table-cell">
                      {user.department ?? '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <span
                        className={cn(
                          'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                          user.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          title="Edit user"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-santech-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(user.id)}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            user.isActive
                              ? 'text-gray-500 hover:bg-red-50 hover:text-red-600'
                              : 'text-gray-500 hover:bg-green-50 hover:text-green-600'
                          )}
                        >
                          {user.isActive ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {filtered.length === 0
              ? 'No results'
              : rowsPerPage === 'All'
              ? `Showing all ${filtered.length} user${filtered.length !== 1 ? 's' : ''}`
              : `Page ${currentPage} of ${totalPages} — ${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
          </p>
          {rowsPerPage !== 'All' && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-medium border',
                    n === currentPage
                      ? 'bg-santech-600 text-white border-santech-600'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">

              {/* First & Last name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleFormChange}
                    placeholder="Jean"
                    className={cn(
                      'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600',
                      errors.firstName && 'border-red-400 focus:ring-red-400'
                    )}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleFormChange}
                    placeholder="Mutabazi"
                    className={cn(
                      'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600',
                      errors.lastName && 'border-red-400 focus:ring-red-400'
                    )}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  disabled={!!editingUser}
                  title={editingUser ? 'Email is the login and cannot be changed' : undefined}
                  placeholder="user@santech.rw"
                  className={cn(
                    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600',
                    errors.email && 'border-red-400 focus:ring-red-400'
                  )}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleFormChange}
                  placeholder="+250780001001"
                  className={cn(
                    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600',
                    errors.phone && 'border-red-400 focus:ring-red-400'
                  )}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{formatRoleLabel(r)}</option>
                  ))}
                </select>
              </div>

              {/* Department & Position */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={form.department}
                    onChange={handleFormChange}
                    placeholder="Sales & Marketing"
                    className={cn(
                      'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600',
                      errors.department && 'border-red-400 focus:ring-red-400'
                    )}
                  />
                  {errors.department && (
                    <p className="text-xs text-red-500 mt-1">{errors.department}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={form.position}
                    onChange={handleFormChange}
                    placeholder="Sales Manager"
                    className={cn(
                      'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600',
                      errors.position && 'border-red-400 focus:ring-red-400'
                    )}
                  />
                  {errors.position && (
                    <p className="text-xs text-red-500 mt-1">{errors.position}</p>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password{!editingUser && <span className="text-red-500"> *</span>}
                  {editingUser && (
                    <span className="text-gray-400 font-normal"> (leave blank to keep current)</span>
                  )}
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleFormChange}
                  placeholder="••••••••"
                  className={cn(
                    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600',
                    errors.password && 'border-red-400 focus:ring-red-400'
                  )}
                />
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Confirm Password{!editingUser && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleFormChange}
                  placeholder="••••••••"
                  className={cn(
                    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-santech-600',
                    errors.confirmPassword && 'border-red-400 focus:ring-red-400'
                  )}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-santech-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-santech-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingUser ? 'Save Changes' : 'Add User'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
