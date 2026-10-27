import { useState, useEffect } from 'react'
import { Plus, Search, X, User, LayoutGrid, List, Loader2 } from 'lucide-react'
import PhoneInput from '@/components/shared/PhoneInput'
import { cn, formatDate, formatCurrency, getInitials } from '@/lib/utils'
import { employeeService } from '@/lib/services/employeeService'
import toast from 'react-hot-toast'

type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED'

interface Employee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  hireDate: string
  employmentStatus: EmploymentStatus
  baseSalary: number
  performanceScore: number
  skills: string[]
}

const DEPARTMENTS = ['All', 'Sales & Marketing', 'IT', 'HR', 'Finance']
const STATUS_OPTIONS: { value: EmploymentStatus | 'All'; label: string }[] = [
  { value: 'All', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'TERMINATED', label: 'Terminated' },
]

const statusStyle: Record<EmploymentStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ON_LEAVE: 'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  TERMINATED: 'bg-red-100 text-red-700',
}

const scoreColor = (score: number) =>
  score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'

const emptyForm = {
  employeeCode: '', firstName: '', lastName: '', email: '', phone: '',
  department: 'Sales & Marketing', position: '', hireDate: '',
  baseSalary: '', performanceScore: '0', employmentStatus: 'ACTIVE' as EmploymentStatus,
  skills: '',
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    employeeService.getAll()
      .then(res => setEmployees(res.data ?? []))
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoading(false))
  }, [])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<EmploymentStatus | 'All'>('All')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filtered = employees.filter(e => {
    const s = search.toLowerCase()
    const matchSearch = !search || `${e.firstName} ${e.lastName}`.toLowerCase().includes(s) || e.email.toLowerCase().includes(s) || e.employeeCode.toLowerCase().includes(s)
    const matchDept = deptFilter === 'All' || e.department === deptFilter
    const matchStatus = statusFilter === 'All' || e.employmentStatus === statusFilter
    return matchSearch && matchDept && matchStatus
  })

  const openAdd = () => { setForm(emptyForm); setEditId(null); setError(''); setShowModal(true) }
  const openEdit = (emp: Employee) => {
    setForm({ ...emp, baseSalary: String(emp.baseSalary), performanceScore: String(emp.performanceScore), skills: emp.skills.join(', ') })
    setEditId(emp.id); setError(''); setShowModal(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.employeeCode || !form.firstName || !form.lastName || !form.position || !form.hireDate || !form.baseSalary) {
      setError('Please fill in all required fields.'); return
    }
    const payload = {
      ...form,
      baseSalary: parseFloat(form.baseSalary),
      performanceScore: parseFloat(form.performanceScore) || 0,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
    }
    try {
      if (editId) {
        const updated = await employeeService.update(editId, payload)
        setEmployees(prev => prev.map(e => e.id === editId ? { ...e, ...updated, ...payload } : e))
        toast.success('Employee updated')
      } else {
        const created = await employeeService.create(payload)
        setEmployees(prev => [created, ...prev])
        toast.success('Employee added')
      }
      setShowModal(false)
    } catch {
      toast.error('Failed to save employee')
    }
  }

  const stats = [
    { label: 'Total Employees', value: employees.length, color: 'text-santech-600' },
    { label: 'Active', value: employees.filter(e => e.employmentStatus === 'ACTIVE').length, color: 'text-green-600' },
    { label: 'On Leave', value: employees.filter(e => e.employmentStatus === 'ON_LEAVE').length, color: 'text-yellow-600' },
    { label: 'Avg Performance', value: employees.length ? `${Math.round(employees.reduce((a, e) => a + e.performanceScore, 0) / employees.length)}%` : '0%', color: 'text-purple-600' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-santech-600" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage all staff profiles and performance</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle — like Google Drive */}

          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 gap-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-santech-600 text-white' : 'text-gray-400 hover:text-gray-600')}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-santech-600 text-white' : 'text-gray-400 hover:text-gray-600')}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="kpi-card p-4 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bms-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search name, email, code..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as EmploymentStatus | 'All')} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* ── GRID VIEW (Cards) ── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(emp => (
            <div key={emp.id} className="bms-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-santech-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{getInitials(`${emp.firstName} ${emp.lastName}`)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-gray-500">{emp.position}</p>
                    <p className="text-xs text-gray-400">{emp.employeeCode}</p>
                  </div>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusStyle[emp.employmentStatus])}>
                  {emp.employmentStatus.replace('_', ' ')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div><span className="text-gray-400">Dept:</span> <span className="text-gray-700 font-medium">{emp.department}</span></div>
                <div><span className="text-gray-400">Hired:</span> <span className="text-gray-700">{formatDate(emp.hireDate)}</span></div>
                <div><span className="text-gray-400">Salary:</span> <span className="text-gray-700 font-medium">{formatCurrency(emp.baseSalary)}</span></div>
                <div><span className="text-gray-400">Phone:</span> <span className="text-gray-700">{emp.phone}</span></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Performance</span>
                  <span className="font-semibold text-gray-700">{emp.performanceScore}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={cn('h-2 rounded-full transition-all', scoreColor(emp.performanceScore))} style={{ width: `${emp.performanceScore}%` }} />
                </div>
              </div>
              {emp.skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {emp.skills.slice(0, 3).map(s => (
                    <span key={s} className="text-xs bg-santech-50 text-santech-700 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                  {emp.skills.length > 3 && <span className="text-xs text-gray-400">+{emp.skills.length - 3}</span>}
                </div>
              )}
              <button onClick={() => openEdit(emp)} className="w-full mt-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                Edit Profile
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 bms-card p-12 text-center text-gray-400">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No employees found matching your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW (Table) ── */}
      {viewMode === 'list' && (
        <div className="bms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Employee', 'Code', 'Department', 'Position', 'Phone', 'Hire Date', 'Salary', 'Performance', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400 text-sm">No employees found.</td></tr>
                ) : filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    {/* Employee name + avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-santech-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">{getInitials(`${emp.firstName} ${emp.lastName}`)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-xs whitespace-nowrap">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-santech-700 font-semibold">{emp.employeeCode}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{emp.department}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{emp.position}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{emp.phone}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(emp.hireDate)}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">{formatCurrency(emp.baseSalary)}</td>
                    {/* Performance bar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div className={cn('h-1.5 rounded-full', scoreColor(emp.performanceScore))} style={{ width: `${emp.performanceScore}%` }} />
                        </div>
                        <span className={cn('text-xs font-semibold', emp.performanceScore >= 80 ? 'text-green-600' : emp.performanceScore >= 50 ? 'text-yellow-600' : 'text-red-500')}>
                          {emp.performanceScore}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', statusStyle[emp.employmentStatus])}>
                        {emp.employmentStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(emp)} className="text-xs text-santech-600 hover:underline font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{filtered.length} employee{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{editId ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                  <input name="lastName" value={form.lastName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Employee Code *</label>
                  <input name="employeeCode" value={form.employeeCode} onChange={handleChange} placeholder="ST-007" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <PhoneInput
                    label="Phone"
                    value={form.phone}
                    onChange={val => setForm(prev => ({ ...prev, phone: val }))}
                    defaultCountry="RW"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department *</label>
                  <select name="department" value={form.department} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {DEPARTMENTS.filter(d => d !== 'All').map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Position *</label>
                  <input name="position" value={form.position} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hire Date *</label>
                  <input name="hireDate" type="date" value={form.hireDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Base Salary (RWF) *</label>
                  <input name="baseSalary" type="number" value={form.baseSalary} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select name="employmentStatus" value={form.employmentStatus} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500">
                    {STATUS_OPTIONS.filter(s => s.value !== 'All').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Performance Score (0-100)</label>
                  <input name="performanceScore" type="number" min="0" max="100" value={form.performanceScore} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Skills (comma separated)</label>
                <input name="skills" value={form.skills} onChange={handleChange} placeholder="React, Node.js, Sales" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-santech-600 text-white rounded-lg text-sm hover:bg-santech-700 font-medium">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
