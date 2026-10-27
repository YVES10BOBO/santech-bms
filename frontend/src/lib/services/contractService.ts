import api from '../api'

export const contractService = {
  getAll: async (filters: Record<string, string> = {}) => {
    const params = new URLSearchParams(filters)
    const { data } = await api.get(`/finance/contracts?${params.toString()}`)
    return data
  },

  create: async (contract: Record<string, unknown>) => {
    const { data } = await api.post('/finance/contracts', contract)
    return data.data
  },

  update: async (id: string, contract: Record<string, unknown>) => {
    const { data } = await api.put(`/finance/contracts/${id}`, contract)
    return data.data
  },
}
