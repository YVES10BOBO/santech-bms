import api from '../api'

export interface FieldVisitFilters {
  page?: number
  limit?: number
  category?: string
  outcome?: string
  search?: string
}

export const fieldVisitService = {
  getAll: async (filters: FieldVisitFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', String(filters.page))
    if (filters.limit) params.append('limit', String(filters.limit))
    if (filters.category) params.append('category', filters.category)
    if (filters.outcome) params.append('outcome', filters.outcome)
    if (filters.search) params.append('search', filters.search)
    const { data } = await api.get(`/field-visits?${params.toString()}`)
    return data
  },

  getOne: async (id: string) => {
    const { data } = await api.get(`/field-visits/${id}`)
    return data.data
  },

  create: async (visit: Record<string, unknown>) => {
    const { data } = await api.post('/field-visits', visit)
    return data.data
  },

  update: async (id: string, visit: Record<string, unknown>) => {
    const { data } = await api.put(`/field-visits/${id}`, visit)
    return data.data
  },
}
