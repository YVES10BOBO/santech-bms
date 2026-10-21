import api from '../api'

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

  getExpenses: async (filters: Record<string, string> = {}) => {
    const params = new URLSearchParams(filters)
    const { data } = await api.get(`/finance/expenses?${params.toString()}`)
    return data
  },

  getPL: async (month: number, year: number) => {
    const { data } = await api.get(`/finance/pl?month=${month}&year=${year}`)
    return data.data
  },
}
