import api from '../api'

export interface PLReport {
  period: string
  totalRevenue: number
  totalExpenses: number
  grossProfit: number
  netIncome: number
  outstandingReceivables: number
  revenueByCategory: { category: string; amount: number }[]
  expensesByCategory: { category: string; amount: number }[]
  monthly: { month: string; year: number; revenue: number; expenses: number }[]
}

export const financeService = {
  getInvoices: async (filters: Record<string, string> = {}) => {
    const params = new URLSearchParams(filters)
    const { data } = await api.get(`/finance/invoices?${params.toString()}`)
    return data
  },

  createInvoice: async (invoice: Record<string, unknown>) => {
    const { data } = await api.post('/finance/invoices', invoice)
    return data.data
  },

  recordPayment: async (invoiceId: string, payment: Record<string, unknown>) => {
    const { data } = await api.post(`/finance/invoices/${invoiceId}/payment`, payment)
    return data.data
  },

  getIncome: async (filters: Record<string, string> = {}) => {
    const params = new URLSearchParams(filters)
    const { data } = await api.get(`/finance/income?${params.toString()}`)
    return data
  },

  createIncome: async (income: Record<string, unknown>) => {
    const { data } = await api.post('/finance/income', income)
    return data.data
  },

  getExpenses: async (filters: Record<string, string> = {}) => {
    const params = new URLSearchParams(filters)
    const { data } = await api.get(`/finance/expenses?${params.toString()}`)
    return data
  },

  createExpense: async (expense: Record<string, unknown>) => {
    const { data } = await api.post('/finance/expenses', expense)
    return data.data
  },

  getPL: async (month: number, year: number): Promise<PLReport> => {
    const { data } = await api.get(`/finance/pl?month=${month}&year=${year}`)
    return data.data
  },
}
