import api from '../api'

export const projectService = {
  getAll: async (filters: Record<string, string> = {}) => {
    const params = new URLSearchParams(filters)
    const { data } = await api.get(`/projects?${params.toString()}`)
    return data
  },

  getOne: async (id: string) => {
    const { data } = await api.get(`/projects/${id}`)
    return data.data
  },

  create: async (project: Record<string, unknown>) => {
    const { data } = await api.post('/projects', project)
    return data.data
  },

  update: async (id: string, project: Record<string, unknown>) => {
    const { data } = await api.put(`/projects/${id}`, project)
    return data.data
  },
}
