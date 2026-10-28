import api from '../api'
import type { DashboardKPIs } from '@/types'

export interface DashboardCharts {
  revenueVsExpenses: { month: string; year: number; revenue: number; expenses: number }[]
  pipeline: { stage: string; count: number }[]
  revenueByService: { name: string; value: number }[]
}

export const dashboardService = {
  getKPIs: async (): Promise<{ data: DashboardKPIs }> => {
    const { data } = await api.get('/dashboard/kpis')
    return data
  },

  getCharts: async (): Promise<{ data: DashboardCharts }> => {
    const { data } = await api.get('/dashboard/charts')
    return data
  },
}
