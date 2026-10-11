import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns'

// Merge tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency in RWF
export function formatCurrency(amount: number, currency = 'RWF'): string {
  if (currency === 'RWF') {
    return `RWF ${amount.toLocaleString('en-RW')}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Format date
export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  return format(new Date(date), fmt)
}

// Format date with time
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy, HH:mm')
}

// Relative time (e.g. "3 days ago")
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// Check if date is overdue
export function isOverdue(date: string | Date): boolean {
  return isBefore(new Date(date), new Date())
}

// Check if date is coming soon (within X days)
export function isComingSoon(date: string | Date, days = 7): boolean {
  const d = new Date(date)
  return isAfter(d, new Date()) && isBefore(d, addDays(new Date(), days))
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Truncate text
export function truncate(text: string, length = 50): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

// Status color mapping
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Client status
    PROSPECT: 'bg-gray-100 text-gray-700',
    LEAD: 'bg-blue-100 text-blue-700',
    QUALIFIED: 'bg-purple-100 text-purple-700',
    CONTRACTOR: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-500',
    LOST: 'bg-red-100 text-red-700',
    // Task status
    CREATED: 'bg-gray-100 text-gray-700',
    ASSIGNED: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-indigo-100 text-indigo-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    REVIEW: 'bg-purple-100 text-purple-700',
    PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    // Project status
    PLANNING: 'bg-gray-100 text-gray-700',
    NOT_STARTED: 'bg-slate-100 text-slate-700',
    ON_HOLD: 'bg-yellow-100 text-yellow-700',
    AT_RISK: 'bg-orange-100 text-orange-700',
    DELAYED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-red-200 text-red-800',
    // Invoice status
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    DUE: 'bg-yellow-100 text-yellow-700',
    PARTIALLY_PAID: 'bg-indigo-100 text-indigo-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    // Pipeline
    NEW_LEAD: 'bg-gray-100 text-gray-700',
    CONTACTED: 'bg-blue-100 text-blue-700',
    REQUIREMENT_ANALYSIS: 'bg-indigo-100 text-indigo-700',
    PROPOSAL: 'bg-purple-100 text-purple-700',
    NEGOTIATION: 'bg-orange-100 text-orange-700',
    WON: 'bg-green-100 text-green-700',
    // Visit outcome
    PENDING: 'bg-yellow-100 text-yellow-700',
    FOLLOW_UP: 'bg-blue-100 text-blue-700',
    INTERESTED: 'bg-purple-100 text-purple-700',
    NOT_INTERESTED: 'bg-gray-100 text-gray-500',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

// Format percentage
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

// Generate a readable client category label
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    SELF_EMPLOYED: 'Self Employed',
    INSTITUTION: 'Institution',
    INDUSTRY: 'Industry',
    DISTRIBUTOR: 'Distributor',
  }
  return labels[category] || category
}
