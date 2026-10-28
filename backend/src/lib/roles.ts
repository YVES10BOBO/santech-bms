import type { UserRole } from '@prisma/client'

// Role groups used by route guards. Keep in sync with frontend/src/store/authStore.ts.
export const ADMINS: UserRole[] = ['SUPER_ADMIN', 'ADMIN']
export const FINANCE: UserRole[] = [...ADMINS, 'FINANCE_MANAGER']
export const PROJECT_LEADS: UserRole[] = [...ADMINS, 'PROJECT_MANAGER']
export const SALES: UserRole[] = [...ADMINS, 'SALES_MANAGER', 'SALES_STAFF', 'MARKETING_MANAGER']
export const CONTRACT_VIEWERS: UserRole[] = [...FINANCE, 'SALES_MANAGER', 'PROJECT_MANAGER']
// Who may see salary figures (HR + finance)
export const PAYROLL: UserRole[] = FINANCE

export function hasRole(role: UserRole | undefined, group: UserRole[]): boolean {
  return !!role && group.includes(role)
}
