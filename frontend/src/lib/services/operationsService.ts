import api from '../api'

type Body = Record<string, unknown>
const get = async (url: string) => (await api.get(url)).data
const post = async (url: string, body?: Body) => (await api.post(url, body ?? {})).data
const put = async (url: string, body: Body) => (await api.put(url, body)).data
const del = async (url: string) => (await api.delete(url)).data

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

/** Employee → Manager → Finance */
export const expenseClaimService = {
  getAll: () => get('/expense-claims'),
  create: (b: Body) => post('/expense-claims', b),
  approve: (id: string) => post(`/expense-claims/${id}/approve`),
  reject: (id: string, reason: string) => post(`/expense-claims/${id}/reject`, { reason }),
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

export const documentService = {
  /** Filters: search, category, clientId / projectId ("none" = not linked), status, from, to, limit */
  getAll: (filters: Record<string, string> = {}) => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
    return get(`/documents${qs ? `?${qs}` : ''}`)
  },
  /** Folder tree: automatic folders (clients → projects, company, types, archive) + admin-made folders */
  folders: () => get('/documents/folders'),
  /** Earlier files of a document, newest first (kept when a file is replaced) */
  versions: (id: string) => get(`/documents/${id}/versions`),
  /** Admin-made folders (admins only). Deleting moves the contents up one level. */
  createFolder: (b: Body) => post('/documents/folders', b),
  updateFolder: (id: string, b: Body) => put(`/documents/folders/${id}`, b),
  deleteFolder: (id: string) => del(`/documents/folders/${id}`),
  create: (b: Body) => post('/documents', b),
  update: (id: string, b: Body) => put(`/documents/${id}`, b),
  /** Permanent delete — admins only, document must be archived first */
  remove: (id: string) => del(`/documents/${id}`),
}

export const attendanceService = {
  getAll: () => get('/attendance'),
  /** Record a day (admins can record for others); include checkIn / checkOut */
  save: (b: Body) => post('/attendance', b),
  requestLeave: (b: Body) => post('/leave', b),
  reviewLeave: (id: string, decision: 'approve' | 'reject') => post(`/leave/${id}/${decision}`),
}

export const tenderService = {
  getAll: () => get('/tenders'),
  create: (b: Body) => post('/tenders', b),
  update: (id: string, b: Body) => put(`/tenders/${id}`, b),
}

export const purchaseService = {
  getAll: () => get('/purchases'),
  create: (b: Body) => post('/purchases', b),
  /** PENDING → APPROVED → ORDERED → DELIVERED (adds the expense) or CANCELLED */
  setStatus: (id: string, status: string) => put(`/purchases/${id}/status`, { status }),
}

export const trainingService = {
  getAll: () => get('/trainings'),
  create: (b: Body) => post('/trainings', b),
  update: (id: string, b: Body) => put(`/trainings/${id}`, b),
  addAttendee: (id: string, b: Body) => post(`/trainings/${id}/attendees`, b),
  updateAttendee: (id: string, attendeeId: string, b: Body) => put(`/trainings/${id}/attendees/${attendeeId}`, b),
}

export const articleService = {
  getAll: () => get('/articles'),
  create: (b: Body) => post('/articles', b),
  update: (id: string, b: Body) => put(`/articles/${id}`, b),
  view: (id: string) => post(`/articles/${id}/view`),
}

/** Top-bar quick search: only areas the user's role can open */
export interface SearchHit { type: string; title: string; subtitle: string; link: string }
export const searchService = {
  query: async (q: string): Promise<SearchHit[]> => (await get(`/search?q=${encodeURIComponent(q)}`)).data ?? [],
}

export const companyService = {
  get: () => get('/settings/company'),
  save: (b: Body) => put('/settings/company', b),
}

/** Exchange rates: RWF for 1 unit of each currency (finance edits) */
export const exchangeRateService = {
  get: () => get('/settings/exchange-rates'),
  save: (rates: Record<string, number>) => put('/settings/exchange-rates', { rates }),
}

/** Earlier versions of a contract or quotation */
export const versionService = {
  get: (entity: 'contract' | 'quotation', id: string) => get(`/versions/${entity}/${id}`),
}
