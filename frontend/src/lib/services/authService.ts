import api from '../api'
import type { User } from '@/types'

export interface LoginResponse {
  user: User
  token: string
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/login', { email, password })
    return data.data
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get('/auth/me')
    return data.data
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.put('/auth/change-password', { currentPassword, newPassword })
  },
}
