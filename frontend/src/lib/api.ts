import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('santech_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle global errors (401 → logout, etc.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = String(error.config?.url ?? '').includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      // Session expired: clear it and go to the login page (no reload loop if already there)
      localStorage.removeItem('santech_token')
      localStorage.removeItem('santech_user')
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
