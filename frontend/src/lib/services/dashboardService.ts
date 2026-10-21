import api from '../api'

export const dashboardService = {
  getKPIs: async () => {
    const { data } = await api.get('/dashboard/kpis')
    return data.data
  },
}
