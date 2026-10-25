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
  ADMIN: ['dashboard', 'crm', 'sales', 'marketing', 'contracts', 'finance', 'projects', 'team', 'support', 'reports', 'settings', 'notifications', 'reception', 'communication', 'training', 'documents', 'procurement'],
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
          const { data } = await api.post('/auth/login', { email, password })
          const { user, token } = data.data
          localStorage.setItem('santech_token', token)
          set({ user, token, isAuthenticated: true, isLoading: false })
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
