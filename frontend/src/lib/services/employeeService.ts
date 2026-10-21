import api from '../api'

export const employeeService = {
  getAll: async (filters: Record<string, string> = {}) => {
    const params = new URLSearchParams(filters)
    const { data } = await api.get(`/employees?${params.toString()}`)
    return data
  },

  getOne: async (id: string) => {
    const { data } = await api.get(`/employees/${id}`)
    return data.data
  },

  create: async (employee: Record<string, unknown>) => {
    const { data } = await api.post('/employees', employee)
    return data.data
  },

  update: async (id: string, employee: Record<string, unknown>) => {
    const { data } = await api.put(`/employees/${id}`, employee)
    return data.data
  },
}
