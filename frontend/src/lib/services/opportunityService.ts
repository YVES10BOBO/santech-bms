import api from '../api'

export const opportunityService = {
  getAll: async (filters: Record<string, string> = {}) => {
    const params = new URLSearchParams(filters)
    const { data } = await api.get(`/finance/opportunities?${params.toString()}`)
    return data
  },

  create: async (opp: Record<string, unknown>) => {
    const { data } = await api.post('/finance/opportunities', opp)
    return data.data
  },

  update: async (id: string, opp: Record<string, unknown>) => {
    const { data } = await api.put(`/finance/opportunities/${id}`, opp)
    return data.data
  },
}
