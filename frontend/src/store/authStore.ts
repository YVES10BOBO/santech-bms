import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/types'
import api from '@/lib/api'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (user: Partial<User>) => void
  hasRole: (roles: UserRole[]) => boolean
  canAccess: (module: string) => boolean
}

// Role-based module access map
const roleAccess: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['dashboard', 'crm', 'sales', 'marketing', 'contracts', 'finance', 'projects', 'team', 'support', 'reports', 'settings', 'notifications'],
  FINANCE_MANAGER: ['dashboard', 'finance', 'contracts', 'reports', 'notifications'],
  SALES_MANAGER: ['dashboard', 'crm', 'sales', 'marketing', 'reports', 'notifications'],
  MARKETING_MANAGER: ['dashboard', 'crm', 'marketing', 'reports', 'notifications'],
  PROJECT_MANAGER: ['dashboard', 'projects', 'team', 'my-tasks', 'reports', 'notifications'],
  SALES_STAFF: ['dashboard', 'crm', 'sales', 'my-tasks', 'notifications'],
  EMPLOYEE: ['dashboard', 'my-tasks', 'notifications', 'team'],
  CUSTOMER: ['portal'],
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          // ── Mock login (frontend only — backend integration coming soon) ──
          const mockUsers: Record<string, { user: User; password: string }> = {
            'admin@santech.rw': {
              password: 'Admin@2026',
              user: { id: '1', firstName: 'System', lastName: 'Admin', email: 'admin@santech.rw', phone: '+250788000000', role: 'SUPER_ADMIN', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
            },
            'hr@santech.rw': {
              password: 'Hr@2026',
              user: { id: '2', firstName: 'HR', lastName: 'Manager', email: 'hr@santech.rw', phone: '+250788000001', role: 'ADMIN', department: 'Human Resources', position: 'HR Manager', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
            },
            'sales@santech.rw': {
              password: 'Sales@2026',
              user: { id: '3', firstName: 'Alice', lastName: 'Uwimana', email: 'sales@santech.rw', phone: '+250788000002', role: 'SALES_STAFF', department: 'Sales & Marketing', position: 'Sales Executive', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
            },
            'finance@santech.rw': {
              password: 'Finance@2026',
              user: { id: '4', firstName: 'David', lastName: 'Habimana', email: 'finance@santech.rw', phone: '+250788000003', role: 'FINANCE_MANAGER', department: 'Finance', position: 'Finance Manager', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
            },
            'employee@santech.rw': {
              password: 'Employee@2026',
              user: { id: '5', firstName: 'Bob', lastName: 'Nkurunziza', email: 'employee@santech.rw', phone: '+250788000004', role: 'EMPLOYEE', department: 'IT', position: 'Software Developer', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
            },
          }

          const found = mockUsers[email.toLowerCase()]
          if (!found || found.password !== password) {
            set({ isLoading: false })
            throw new Error('Invalid email or password')
          }

          const token = 'mock-jwt-token-' + found.user.role
          localStorage.setItem('santech_token', token)
          set({ user: found.user, token, isAuthenticated: true, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem('santech_token')
        set({ user: null, token: null, isAuthenticated: false })
        window.location.href = '/login'
      },

      updateUser: (updatedUser) => {
        const current = get().user
        if (current) {
          set({ user: { ...current, ...updatedUser } })
        }
      },

      hasRole: (roles) => {
        const user = get().user
        if (!user) return false
        return roles.includes(user.role)
      },

      canAccess: (module) => {
        const user = get().user
        if (!user) return false
        const access = roleAccess[user.role]
        if (!access) return false
        if (access.includes('*')) return true
        return access.includes(module)
      },
    }),
    {
      name: 'santech_auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
