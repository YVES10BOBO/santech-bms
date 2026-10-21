import api from '../api'

export interface ClientFilters {
  page?: number
  limit?: number
  category?: string
  status?: string
  search?: string
}

export const clientService = {
  getAll: async (filters: ClientFilters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)) })
    const { data } = await api.get(`/clients?${params.toString()}`)
    return data
  },

  getOne: async (id: string) => {
    const { data } = await api.get(`/clients/${id}`)
    return data.data
  },

  create: async (client: Record<string, unknown>) => {
    const { data } = await api.post('/clients', client)
    return data.data
  },

  update: async (id: string, client: Record<string, unknown>) => {
    const { data } = await api.put(`/clients/${id}`, client)
    return data.data
  },

  delete: async (id: string) => {
    await api.delete(`/clients/${id}`)
  },
}
