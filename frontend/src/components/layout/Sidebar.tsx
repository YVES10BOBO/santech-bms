import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  Users,
  UserSearch,
  MapPin,
  TrendingUp,
  Megaphone,
  FileText,
  DollarSign,
  FolderKanban,
  CheckSquare,
  UserCog,
  ListTodo,
  Wallet,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  Bell,
  BarChart2,
  Headphones,
  DoorOpen,
  MessageSquare,
  FolderOpen,
  ShoppingCart,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  label: string
  icon: React.ElementType
  path?: string
  module: string
  children?: { label: string; path: string; module: string }[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    module: 'dashboard',
  },
  {
    label: 'CRM',
    icon: Users,
    module: 'crm',
    children: [
      { label: 'Customers', path: '/crm/customers', module: 'crm' },
      { label: 'Leads', path: '/crm/leads', module: 'crm' },
      { label: 'Field Visits', path: '/crm/field-visits', module: 'crm' },
    ],
  },
  {
    label: 'Sales',
    icon: TrendingUp,
    module: 'sales',
    children: [
      { label: 'Deal Pipeline', path: '/sales/pipeline', module: 'sales' },
      { label: 'Quotations', path: '/sales/quotations', module: 'sales' },
      { label: 'Tenders', path: '/sales/tenders', module: 'sales' },
    ],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    module: 'marketing',
    children: [
      { label: 'Campaigns', path: '/marketing/campaigns', module: 'marketing' },
      { label: 'Training (SANHUB)', path: '/training', module: 'training' },
    ],
  },
  {
    label: 'Contracts',
    icon: FileText,
    module: 'contracts',
    children: [
      { label: 'All Contracts', path: '/contracts', module: 'contracts' },
      { label: 'Client Services', path: '/contracts/services', module: 'contracts' },
    ],
  },
  {
    label: 'Finance',
    icon: DollarSign,
    module: 'finance',
    children: [
      { label: 'Overview & P&L', path: '/finance', module: 'finance' },
      { label: 'Invoices & Payments', path: '/finance/invoices', module: 'finance' },
    ],
  },
  {
    label: 'Procurement',
    icon: ShoppingCart,
    module: 'procurement',
    children: [
      { label: 'Purchases & Stock', path: '/procurement', module: 'procurement' },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart2,
    path: undefined,
    module: 'reports',
    children: [{ label: 'All Reports', path: '/reports', module: 'reports' }],
  },
  {
    label: 'Support',
    icon: Headphones,
    path: undefined,
    module: 'support',
    children: [
      { label: 'Support Tickets', path: '/support', module: 'support' },
      { label: 'Knowledge Base', path: '/support/knowledge-base', module: 'support' },
    ],
  },
  {
    label: 'Reception',
    icon: DoorOpen,
    module: 'reception',
    children: [
      { label: 'Visitor Log', path: '/reception', module: 'reception' },
    ],
  },
  {
    label: 'Communication',
    icon: MessageSquare,
    module: 'communication',
    children: [
      { label: 'Meetings', path: '/communication/meetings', module: 'communication' },
      { label: 'Communication Log', path: '/communication/log', module: 'communication' },
    ],
  },
  {
    label: 'Documents',
    icon: FolderOpen,
    module: 'documents',
    children: [
      { label: 'All Documents', path: '/documents', module: 'documents' },
    ],
  },
  {
    label: 'Projects',
    icon: FolderKanban,
    module: 'projects',
    children: [
      { label: 'All Projects', path: '/projects', module: 'projects' },
      { label: 'Tasks', path: '/projects/tasks', module: 'projects' },
      { label: 'Milestones', path: '/projects/milestones', module: 'projects' },
      { label: 'Timesheets', path: '/projects/timesheets', module: 'projects' },
    ],
  },
  {
    label: 'Team',
    icon: UserCog,
    module: 'team',
    children: [
      { label: 'Employees', path: '/team/employees', module: 'team' },
      { label: 'Departments', path: '/team/departments', module: 'team' },
      { label: 'Workload', path: '/team/workload', module: 'team' },
      { label: 'My Tasks', path: '/team/my-tasks', module: 'my-tasks' },
      { label: 'Salary', path: '/team/salary', module: 'team' },
      { label: 'Attendance & Leave', path: '/team/attendance', module: 'team' },
      { label: 'Expense Claims', path: '/team/expenses', module: 'expenses' },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    module: 'settings',
    children: [
      { label: 'User Management', path: '/settings/users', module: 'settings' },
      { label: 'Company Profile', path: '/settings/company', module: 'settings' },
      { label: 'Roles & Permissions', path: '/settings/roles', module: 'settings' },
      { label: 'Product Catalog', path: '/settings/products', module: 'settings' },
      { label: 'Audit Trail', path: '/settings/audit', module: 'settings' },
    ],
  },
  {
    label: 'Notifications',
    icon: Bell,
    path: '/notifications',
    module: 'notifications',
  },
]

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onMobileClose: () => void
  /** Desktop only: collapse / expand the sidebar (menu button in the sidebar's top-right corner) */
  onToggle?: () => void
}

export default function Sidebar({ collapsed, mobileOpen, onMobileClose, onToggle }: SidebarProps) {
  const { user, canAccess, logout } = useAuthStore()
  const location = useLocation()
  const [openMenus, setOpenMenus] = useState<string[]>(['CRM', 'Team', 'Settings', 'Reports', 'Support'])

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    )
  }

  const isMenuOpen = (label: string) => openMenus.includes(label)

  const isActive = (path: string) => location.pathname === path
  const isParentActive = (children?: { path: string }[]) =>
    children?.some((c) => location.pathname.startsWith(c.path)) ?? false

  return (
    <aside
      className={cn(
        'flex flex-col h-full sidebar-transition z-30',
        'fixed lg:static lg:translate-x-0',
        collapsed ? 'w-16' : 'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
      style={{ background: 'linear-gradient(180deg, #0b1f44 0%, #0a1c3d 60%, #07152f 100%)' }}
    >
      {/* Imigongo subtle pattern overlay on sidebar */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/assets/imingogo-trimmed.png')",
          backgroundSize: '80px auto',
          backgroundRepeat: 'repeat',
          opacity: 0.03,
        }}
      />
      {/* Logo + menu button (top-right). Collapsed: only the menu button, to expand again */}
      <div className={cn(
        'relative flex items-center gap-3 px-4 py-5 border-b border-santech-700',
        collapsed ? 'justify-center px-2' : ''
      )}>
        {!collapsed && (
          <>
            <div className="w-8 h-8 bg-santech-400 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-santech-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight text-white">Santech</p>
              <p className="text-santech-300 text-xs">Business Management</p>
            </div>
          </>
        )}
        {onToggle ? (
          <button
            onClick={onToggle}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            className="flex-shrink-0 p-1.5 rounded-md text-white hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onMobileClose}
            title="Close menu"
            aria-label="Close menu"
            className="flex-shrink-0 p-1.5 rounded-md text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav-scroll flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => {
          // Show a menu when the role can open it or at least one page in it (e.g. My Tasks under Team)
          if (!canAccess(item.module) && !item.children?.some((c) => canAccess(c.module))) return null

          // Single link (no children)
          if (item.path && !item.children) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive(item.path)
                    ? 'bg-santech-500 text-white'
                    : 'text-santech-200 hover:bg-santech-800 hover:text-white',
                  collapsed ? 'justify-center' : ''
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          }

          // Expandable menu
          const parentActive = isParentActive(item.children)
          const open = isMenuOpen(item.label)

          return (
            <div key={item.label}>
              <button
                onClick={() => !collapsed && toggleMenu(item.label)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  parentActive
                    ? 'bg-santech-800 text-white'
                    : 'text-santech-200 hover:bg-santech-800 hover:text-white',
                  collapsed ? 'justify-center' : ''
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {open ? (
                      <ChevronDown className="w-3.5 h-3.5 text-santech-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-santech-400" />
                    )}
                  </>
                )}
              </button>

              {/* Children */}
              {!collapsed && open && item.children && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-santech-700 pl-3">
                  {item.children.map((child) => {
                    if (!canAccess(child.module)) return null
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onMobileClose}
                        className={cn(
                          'flex items-center px-2 py-1.5 rounded-md text-xs font-medium transition-all',
                          isActive(child.path)
                            ? 'bg-santech-500 text-white'
                            : 'text-santech-300 hover:text-white hover:bg-santech-800'
                        )}
                      >
                        {child.label}
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User profile at bottom */}
      {!collapsed && user && (
        <div className="border-t border-santech-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-santech-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-santech-300 truncate capitalize">
                {user.role.replace('_', ' ').toLowerCase()}
              </p>
            </div>
            <button
              onClick={logout}
              className="text-santech-400 hover:text-white transition-colors text-xs"
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
