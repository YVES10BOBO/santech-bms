import api from '../api'

export const taskService = {
  getAll: async (filters: Record<string, string> = {}) => {
    const params = new URLSearchParams(filters)
    const { data } = await api.get(`/tasks?${params.toString()}`)
    return data
  },

  getMyTasks: async () => {
    const { data } = await api.get('/tasks/my-tasks')
    return data
  },

  create: async (task: Record<string, unknown>) => {
    const { data } = await api.post('/tasks', task)
    return data.data
  },

  markComplete: async (id: string) => {
    const { data } = await api.put(`/tasks/${id}/complete`)
    return data.data
  },

  approve: async (id: string) => {
    const { data } = await api.put(`/tasks/${id}/approve`)
    return data.data
  },

  reject: async (id: string, reason: string) => {
    const { data } = await api.put(`/tasks/${id}/reject`, { reason })
    return data.data
  },
}
