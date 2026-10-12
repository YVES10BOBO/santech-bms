import { useState } from 'react'
import { Plus, Search, X, Users, TrendingUp, Briefcase, Edit2, LayoutGrid, List } from 'lucide-react'
import { cn, formatCurrency, getInitials } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Department {
  id: string
  name: string
  description: string
  head: string           // Department head name
  headEmail: string
  budget: number         // Monthly budget in RWF
  employeeCount: number
  activeProjects: number
  avgPerformance: number
  color: string          // Tailwind color for the department badge
  createdAt: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockDepartments: Department[] = [
  {
    id: '1',
    name: 'Sales & Marketing',
    description: 'Responsible for finding new clients, field visits, lead generation, and promoting Santech products and services.',
    head: 'Alice Uwimana',
    headEmail: 'alice@santech.rw',
    budget: 2000000,
    employeeCount: 3,
    activeProjects: 2,
    avgPerformance: 78,
    color: 'bg-blue-100 text-blue-700',
    createdAt: '2023-01-01',
  },
  {
    id: '2',
    name: 'IT / Development',
    description: 'Builds and maintains all software systems including EVS, SANTRACK, REVIXSAN, websites, and custom client solutions.',
    head: 'Bob Nkurunziza',
    headEmail: 'bob@santech.rw',
    budget: 5000000,
    employeeCount: 4,
    activeProjects: 5,
    avgPerformance: 89,
    color: 'bg-purple-100 text-purple-700',
    createdAt: '2023-01-01',
  },
  {
    id: '3',
    name: 'Human Resources',
    description: 'Manages employee recruitment, onboarding, performance tracking, payroll, and staff welfare.',
    head: 'Claire Mukamana',
    headEmail: 'claire@santech.rw',
    budget: 1500000,
    employeeCount: 2,
    activeProjects: 1,
    avgPerformance: 75,
    color: 'bg-green-100 text-green-700',
    createdAt: '2023-01-01',
  },
  {
    id: '4',
    name: 'Finance',
    description: 'Manages all financial records, invoicing, payments, expenses, payroll processing, and financial reporting.',
    head: 'David Habimana',
    headEmail: 'david@santech.rw',
    budget: 1000000,
    employeeCount: 2,
    activeProjects: 0,
    avgPerformance: 65,
    color: 'bg-amber-100 text-amber-700',
    createdAt: '2023-01-01',
  },
  {
    id: '5',
    name: 'Operations',
    description: 'Handles day-to-day operations, logistics, client support, and system maintenance after deployment.',
    head: 'Frank Bizimana',
    headEmail: 'frank@santech.rw',
    budget: 800000,
    employeeCount: 2,
    activeProjects: 3,
    avgPerformance: 82,
    color: 'bg-teal-100 text-teal-700',
    createdAt: '2024-01-01',
  },
]

const scoreColor = (score: number) =>
  score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-500'

const scoreBg = (score: number) =>
  score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'

const DEPT_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
]

const emptyForm = {
  name: '',
  description: '',
  head: '',
  headEmail: '',
  budget: '',
  color: DEPT_COLORS[0],
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>(mockDepartments)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [viewDept, setViewDept] = useState<Department | null>(null)
  const [error, setError] = useState('')

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = departments.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.head.toLowerCase().includes(search.toLowerCase())
  )

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalEmployees = departments.reduce((s, d) => s + d.employeeCount, 0)
  const totalBudget = departments.reduce((s, d) => s + d.budget, 0)
  const avgPerformance = Math.round(departments.reduce((s, d) => s + d.avgPerformance, 0) / departments.length)
  const totalProjects = departments.reduce((s, d) => s + d.activeProjects, 0)

  const stats = [
    { label: 'Total Departments', value: departments.length, color: 'text-santech-600', icon: Briefcase },
    { label: 'Total Employees', value: totalEmployees, color: 'text-blue-600', icon: Users },
    { label: 'Active Projects', value: totalProjects, color: 'text-purple-600', icon: TrendingUp },
    { label: 'Avg Performance', value: `${avgPerformance}%`, color: scoreColor(avgPerformance), icon: TrendingUp },
  ]

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const openAdd = () => { setForm(emptyForm); setEditId(null); setError(''); setShowModal(true) }
  const openEdit = (d: Department) => {
    setForm({ name: d.name, description: d.description, head: d.head, headEmail: d.headEmail, budget: String(d.budget), color: d.color })
    setEditId(d.id); setError(''); setShowModal(true); setViewDept(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Department name is required.'); return }
    if (!form.head.trim()) { setError('Department head is required.'); return }

    const dept: Department = {
      id: editId || String(Date.now()),
      name: form.name,
      description: form.description,
      head: form.head,
      headEmail: form.headEmail,
      budget: parseFloat(form.budget) || 0,
      color: form.color,
      employeeCount: editId ? departments.find(d => d.id === editId)!.employeeCount : 0,
      activeProjects: editId ? departments.find(d => d.id === editId)!.activeProjects : 0,
      avgPerformance: editId ? departments.find(d => d.id === editId)!.avgPerformance : 0,
      createdAt: editId ? departments.find(d => d.id === editId)!.createdAt : new Date().toISOString().split('T')[0],
    }

    if (editId) setDepartments(prev => prev.map(d => d.id === editId ? dept : d))
    else setDepartments(prev => [...prev, dept])
    setShowModal(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Departments</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage company departments, heads, budgets and team structure</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 gap-0.5">
            <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-santech-600 text-white' : 'text-gray-400 hover:text-gray-600')} title="List view">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-santech-600 text-white' : 'text-gray-400 hover:text-gray-600')} title="Grid view">
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Department
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <s.icon className={cn('w-5 h-5', s.color)} />
            </div>
            <div>
              <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bms-card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search department or head..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
      </div>

      {/* ── GRID VIEW ── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(dept => (
            <div key={dept.id} className="bms-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewDept(dept)}>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm', dept.color)}>
                    {dept.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{dept.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', dept.color)}>
                      {dept.employeeCount} employee{dept.employeeCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); openEdit(dept) }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-500 line-clamp-2">{dept.description}</p>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-400">Head</p>
                  <p className="font-medium text-gray-700 truncate">{dept.head}</p>
                </div>
                <div>
                  <p className="text-gray-400">Monthly Budget</p>
                  <p className="font-medium text-gray-700">{formatCurrency(dept.budget)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Active Projects</p>
                  <p className="font-medium text-gray-700">{dept.activeProjects}</p>
                </div>
                <div>
                  <p className="text-gray-400">Avg Performance</p>
                  <p className={cn('font-semibold', scoreColor(dept.avgPerformance))}>{dept.avgPerformance}%</p>
                </div>
              </div>

              {/* Performance bar */}
              <div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className={cn('h-1.5 rounded-full transition-all', scoreBg(dept.avgPerformance))} style={{ width: `${dept.avgPerformance}%` }} />
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-3 bms-card p-12 text-center text-gray-400">
              <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No departments found.</p>
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="bms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Department', 'Head', 'Employees', 'Monthly Budget', 'Active Projects', 'Avg Performance', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No departments found.</td></tr>
                ) : filtered.map(dept => (
                  <tr key={dept.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewDept(dept)}>
                    {/* Department name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs', dept.color)}>
                          {dept.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-xs">{dept.name}</p>
                          <p className="text-xs text-gray-400 line-clamp-1">{dept.description.slice(0, 50)}...</p>
                        </div>
                      </div>
                    </td>
                    {/* Head */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-santech-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{getInitials(dept.head)}</span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-700 whitespace-nowrap">{dept.head}</p>
                          <p className="text-xs text-gray-400">{dept.headEmail}</p>
                        </div>
                      </div>
                    </td>
                    {/* Employees */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-medium text-gray-700">{dept.employeeCount}</span>
                      </div>
                    </td>
                    {/* Budget */}
                    <td className="px-4 py-3 text-xs font-medium text-gray-700">{formatCurrency(dept.budget)}</td>
                    {/* Projects */}
                    <td className="px-4 py-3 text-xs text-gray-600">{dept.activeProjects}</td>
                    {/* Performance */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div className={cn('h-1.5 rounded-full', scoreBg(dept.avgPerformance))} style={{ width: `${dept.avgPerformance}%` }} />
                        </div>
                        <span className={cn('text-xs font-semibold', scoreColor(dept.avgPerformance))}>{dept.avgPerformance}%</span>
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(dept)} className="text-xs text-santech-600 hover:underline font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{filtered.length} department{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* ── Detail Side Panel ── */}
      {viewDept && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setViewDept(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Department Details</h2>
              <button onClick={() => setViewDept(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Dept header */}
              <div className="flex items-center gap-4">
                <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl', viewDept.color)}>
                  {viewDept.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{viewDept.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{viewDept.employeeCount} employees · {viewDept.activeProjects} active projects</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs text-gray-400 mb-1 uppercase font-medium tracking-wide">About</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewDept.description}</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Department Head', value: viewDept.head },
                  { label: 'Head Email', value: viewDept.headEmail || '—' },
                  { label: 'Monthly Budget', value: formatCurrency(viewDept.budget) },
                  { label: 'Total Employees', value: String(viewDept.employeeCount) },
                  { label: 'Active Projects', value: String(viewDept.activeProjects) },
                  { label: 'Since', value: viewDept.createdAt },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-semibold text-gray-700 text-sm mt-0.5 truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Performance */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500 font-medium">Average Performance</span>
                  <span className={cn('font-bold', scoreColor(viewDept.avgPerformance))}>{viewDept.avgPerformance}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className={cn('h-3 rounded-full transition-all', scoreBg(viewDept.avgPerformance))} style={{ width: `${viewDept.avgPerformance}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {viewDept.avgPerformance >= 80 ? '🟢 Excellent performance' : viewDept.avgPerformance >= 50 ? '🟡 Good — room to improve' : '🔴 Needs attention'}
                </p>
              </div>

              {/* Actions */}
              <button onClick={() => openEdit(viewDept)} className="w-full py-2.5 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
                Edit Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{editId ? 'Edit Department' : 'Add Department'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department Name *</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Sales & Marketing" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="What does this department do?" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department Head *</label>
                  <input name="head" value={form.head} onChange={handleChange} placeholder="e.g. Alice Uwimana" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Head Email</label>
                  <input name="headEmail" type="email" value={form.headEmail} onChange={handleChange} placeholder="head@santech.rw" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Monthly Budget (RWF)</label>
                <input name="budget" type="number" value={form.budget} onChange={handleChange} placeholder="e.g. 2000000" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Department Color</label>
                <div className="flex flex-wrap gap-2">
                  {DEPT_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm(p => ({ ...p, color }))}
                      className={cn('w-8 h-8 rounded-lg border-2 transition-all text-xs font-bold', color, form.color === color ? 'border-santech-600 scale-110' : 'border-transparent')}>
                      A
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">{editId ? 'Save Changes' : 'Add Department'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React from 'react'
