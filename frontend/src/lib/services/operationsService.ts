import api from '../api'

type Body = Record<string, unknown>
const get = async (url: string) => (await api.get(url)).data
const post = async (url: string, body?: Body) => (await api.post(url, body ?? {})).data
const put = async (url: string, body: Body) => (await api.put(url, body)).data

export const leadService = {
  getAll: () => get('/leads'),
  create: (b: Body) => post('/leads', b),
  update: (id: string, b: Body) => put(`/leads/${id}`, b),
  advance: (id: string) => post(`/leads/${id}/advance`),
  /** Creates (or finds) the client and adds a deal to the pipeline */
  convert: (id: string) => post(`/leads/${id}/convert`),
}

export const quotationService = {
  getAll: () => get('/quotations'),
  create: (b: Body) => post('/quotations', b),
  update: (id: string, b: Body) => put(`/quotations/${id}`, b),
  advance: (id: string) => post(`/quotations/${id}/advance`),
  reject: (id: string, reason: string) => post(`/quotations/${id}/reject`, { reason }),
  /** Accepted quotation → new draft contract */
  convert: (id: string) => post(`/quotations/${id}/convert`),
}

export const ticketService = {
  getAll: () => get('/tickets'),
  create: (b: Body) => post('/tickets', b),
  update: (id: string, b: Body) => put(`/tickets/${id}`, b),
}

export const productService = {
  getAll: () => get('/products'),
  create: (b: Body) => post('/products', b),
  update: (id: string, b: Body) => put(`/products/${id}`, b),
}

export const departmentService = {
  getAll: () => get('/departments'),
  create: (b: Body) => post('/departments', b),
  update: (id: string, b: Body) => put(`/departments/${id}`, b),
}

export const userService = {
  getAll: () => get('/users'),
  create: (b: Body) => post('/users', b),
  update: (id: string, b: Body) => put(`/users/${id}`, b),
}

export const visitorService = {
  getAll: () => get('/visitors'),
  create: (b: Body) => post('/visitors', b),
  action: (id: string, action: 'check-in' | 'check-out' | 'no-show') => post(`/visitors/${id}/${action}`),
}

export const notificationService = {
  getAll: () => get('/notifications'),
  unreadCount: async (): Promise<number> => (await get('/notifications/unread-count')).data.unread,
  markRead: (ids?: string[]) => post('/notifications/read', ids ? { ids } : {}),
}

export const communicationService = {
  getAll: (clientId?: string) => get(`/communications${clientId ? `?clientId=${clientId}` : ''}`),
  create: (b: Body) => post('/communications', b),
  update: (id: string, b: Body) => put(`/communications/${id}`, b),
}

export const meetingService = {
  getAll: () => get('/meetings'),
  create: (b: Body) => post('/meetings', b),
  update: (id: string, b: Body) => put(`/meetings/${id}`, b),
}

export const subscriptionService = {
  getAll: () => get('/client-services'),
  create: (b: Body) => post('/client-services', b),
  update: (id: string, b: Body) => put(`/client-services/${id}`, b),
  /** Records the payment as Finance income */
  pay: (id: string) => post(`/client-services/${id}/pay`),
  /** Moves the renewal date forward one billing cycle */
  renew: (id: string) => post(`/client-services/${id}/renew`),
}

export const campaignService = {
  getAll: () => get('/campaigns'),
  create: (b: Body) => post('/campaigns', b),
  update: (id: string, b: Body) => put(`/campaigns/${id}`, b),
}

export const timesheetService = {
  getAll: () => get('/timesheets'),
  create: (b: Body) => post('/timesheets', b),
  review: (id: string, decision: 'approve' | 'reject') => post(`/timesheets/${id}/${decision}`),
}
