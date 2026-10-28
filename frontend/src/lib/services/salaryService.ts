import api from '../api'

export const salaryService = {
  /** Payroll for a month (records are generated automatically for past/current months) */
  getPayroll: async (month: number, year: number) => {
    const { data } = await api.get(`/salary?month=${month}&year=${year}`)
    return data
  },

  adjust: async (id: string, body: { type: 'bonus' | 'deduction'; amount: number; reason?: string }) => {
    const { data } = await api.put(`/salary/${id}/adjust`, body)
    return data.data
  },

  /** Marks paid and books a Salaries expense in Finance */
  pay: async (id: string) => {
    const { data } = await api.put(`/salary/${id}/pay`)
    return data.data
  },

  promote: async (employeeId: string, body: { newPosition: string; salaryRaise: number; reason?: string }) => {
    const { data } = await api.post(`/salary/promote/${employeeId}`, body)
    return data
  },
}
