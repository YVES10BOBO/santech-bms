import api from '../api'
import type { DashboardKPIs } from '@/types'

export const dashboardService = {
  getKPIs: async (): Promise<{ data: DashboardKPIs }> => {
    const { data } = await api.get('/dashboard/kpis')
    return data
  },
}
