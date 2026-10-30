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

  /** Status / notes / due date (the status of a real invoice follows its payments) */
  updateInvoice: async (id: string, changes: Record<string, unknown>) => (await api.put(`/finance/invoices/${id}`, changes)).data,
  /** Reduce what is owed on an invoice: { amount, reason } */
  createCreditNote: async (id: string, body: { amount: number; reason: string }) => (await api.post(`/finance/invoices/${id}/credit-note`, body)).data,
  /** Proforma → real invoice */
  convertProforma: async (id: string, dueDate?: string) => (await api.post(`/finance/invoices/${id}/convert`, { dueDate })).data,
  /** Raise the client-service invoices due within 14 days */
  raiseRecurring: async () => (await api.post('/finance/invoices/raise-recurring')).data,

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
