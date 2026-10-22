import api from '../api'

export interface FieldVisitFilters {
  page?: number
  limit?: number
  category?: string
  outcome?: string
  search?: string
  product?: string
  contractWon?: boolean
  dateFrom?: string
  dateTo?: string
}

function fromRecord(record: Record<string, any>) {
  const dateOnly = (value?: string | Date | null) => value ? new Date(value).toISOString().slice(0, 10) : ''
  return {
    ...record,
    visitDate: dateOnly(record.visitDate),
    followUpDate: dateOnly(record.followUpDate),
    contactName: record.contactName ?? '',
    location: record.location ?? '',
    comments: record.comments ?? '',
    amountPromising: record.amountPromising ?? null,
    recordedBy: record.recordedBy ?? { firstName: 'Sales', lastName: 'Staff' },
  }
}

function toRecord(visit: Record<string, unknown>) {
  return {
    companyName: visit.companyName,
    category: visit.category,
    contactName: visit.contactName || null,
    contactPhone: visit.contactPhone,
    location: visit.location || null,
    whatSantechCanSell: visit.whatSantechCanSell,
    needsAndObservation: visit.needsAndObservation,
    outcome: visit.outcome,
    comments: visit.comments || null,
    contractWon: visit.contractWon,
    visitDate: visit.visitDate ? new Date(String(visit.visitDate)).toISOString() : undefined,
    followUpDate: visit.followUpDate ? new Date(String(visit.followUpDate)).toISOString() : null,
    amountPromising: visit.amountPromising === '' || visit.amountPromising == null ? null : Number(visit.amountPromising),
  }
}

export const fieldVisitService = {
  getAll: async (filters: FieldVisitFilters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.append(key, String(value))
    })
    const { data } = await api.get(`/field-visits?${params.toString()}`)
    return { ...data, data: (data.data as Record<string, any>[]).map(fromRecord) }
  },

  getOne: async (id: string) => {
    const { data } = await api.get(`/field-visits/${id}`)
    return fromRecord(data.data)
  },

  create: async (visit: Record<string, unknown>) => {
    const { data } = await api.post('/field-visits', toRecord(visit))
    return fromRecord(data.data)
  },

  update: async (id: string, visit: Record<string, unknown>) => {
    const { data } = await api.put(`/field-visits/${id}`, toRecord(visit))
    return fromRecord(data.data)
  },
}
