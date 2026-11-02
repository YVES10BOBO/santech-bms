import type { UserRole } from '@/types'
import { roleAccess } from '@/store/authStore'

/** The parts of the app a role can be given, in the order of the sidebar menu */
export const MODULES: { key: string; label: string; hint: string; portal?: boolean }[] = [
  { key: 'dashboard', label: 'Dashboard', hint: 'Home page and KPIs' },
  { key: 'crm', label: 'CRM', hint: 'Customers, leads, field visits' },
  { key: 'sales', label: 'Sales', hint: 'Deal pipeline, quotations, tenders' },
  { key: 'marketing', label: 'Marketing', hint: 'Campaigns' },
  { key: 'training', label: 'Training (SANHUB)', hint: 'Courses and attendees' },
  { key: 'contracts', label: 'Contracts', hint: 'Contracts, client services' },
  { key: 'finance', label: 'Finance', hint: 'P&L, invoices, payments' },
  { key: 'procurement', label: 'Procurement', hint: 'Purchases, suppliers, stock' },
  { key: 'reports', label: 'Reports', hint: 'All reports' },
  { key: 'support', label: 'Support', hint: 'Tickets, knowledge base' },
  { key: 'reception', label: 'Reception', hint: 'Visitor log' },
  { key: 'communication', label: 'Communication', hint: 'Meetings, communication log' },
  { key: 'documents', label: 'Documents', hint: 'Company documents' },
  { key: 'projects', label: 'Projects', hint: 'Projects, tasks, milestones, timesheets' },
  { key: 'team', label: 'Team', hint: 'Employees, departments, workload, attendance' },
  { key: 'my-tasks', label: 'My Tasks', hint: 'Tasks given to you' },
  { key: 'expenses', label: 'Expense Claims', hint: 'Claim money you spent for work' },
  { key: 'settings', label: 'Settings', hint: 'Users, company, roles, products, audit' },
  { key: 'notifications', label: 'Notifications', hint: 'Alerts and reminders' },
  { key: 'portal', label: 'Customer portal', hint: 'Own quotations, invoices, contracts, tickets', portal: true },
  { key: 'supplier-portal', label: 'Supplier portal', hint: 'Own purchase orders and invoices', portal: true },
]

/** Same rule the sidebar uses (authStore.canAccess). A portal is only for its own login, never "all modules". */
export function roleCanOpen(role: UserRole, moduleKey: string): boolean {
  const access = roleAccess[role] ?? []
  const mod = MODULES.find(m => m.key === moduleKey)
  if (mod?.portal) return access.includes(moduleKey)
  return access.includes('*') || access.includes(moduleKey)
}

/** The modules a role can open, as listed in MODULES */
export const modulesFor = (role: UserRole) => MODULES.filter(m => roleCanOpen(role, m.key))
