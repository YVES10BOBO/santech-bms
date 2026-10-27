import api from '../api'

export const milestoneService = {
  getAll: async (projectId?: string) => {
    const params = projectId ? `?projectId=${projectId}` : ''
    const { data } = await api.get(`/projects/milestones/all${params}`)
    return data
  },

  create: async (milestone: Record<string, unknown>) => {
    const { data } = await api.post('/projects/milestones', milestone)
    return data.data
  },

  update: async (id: string, milestone: Record<string, unknown>) => {
    const { data } = await api.put(`/projects/milestones/${id}`, milestone)
    return data.data
  },
}
