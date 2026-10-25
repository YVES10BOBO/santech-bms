import api from '../api'

export interface ClientFilters {
  page?: number
  limit?: number
  category?: string
  status?: string
  search?: string
}

type ClientProfile = Record<string, unknown> & {
  id?: string
  kind?: 'INDIVIDUAL' | 'BUSINESS' | 'TEAM' | 'DELEGATION'
  status?: 'ACTIVE' | 'INACTIVE'
  createdAt?: string
  services?: string[]
  notes?: string
}

type ClientRecord = Record<string, unknown> & {
  id: string
  companyName: string
  phone: string
  profileKind?: ClientProfile['kind'] | null
  profileData?: ClientProfile | null
  services?: string[]
  isActive?: boolean
  createdAt?: string
}

function fromRecord(record: ClientRecord): ClientProfile {
  const profile = record.profileData ?? {}
  const kind = record.profileKind ?? 'BUSINESS'
  return {
    ...profile,
    id: record.id,
    kind,
    status: record.isActive === false ? 'INACTIVE' : 'ACTIVE',
    createdAt: record.createdAt,
    services: record.services ?? [],
    notes: typeof record.notes === 'string' ? record.notes : profile.notes,
    // These defaults let older CRM records without profile data remain visible.
    companyName: profile.companyName ?? (kind === 'BUSINESS' ? record.companyName : undefined),
    fullName: profile.fullName ?? (kind === 'INDIVIDUAL' ? record.companyName : undefined),
    teamName: profile.teamName ?? (kind === 'TEAM' ? record.companyName : undefined),
    delegationName: profile.delegationName ?? (kind === 'DELEGATION' ? record.companyName : undefined),
    phone: profile.phone ?? record.phone,
    email: profile.email ?? record.email,
    address: profile.address ?? record.address,
    location: profile.location ?? record.location,
    industry: profile.industry ?? record.industry,
    website: profile.website ?? record.website,
    repName: profile.repName ?? record.contactPersonName,
    repEmail: profile.repEmail ?? record.contactPersonEmail,
    repPhone: profile.repPhone ?? record.contactPersonPhone ?? record.phone,
    leaderName: profile.leaderName ?? record.contactPersonName,
    leaderEmail: profile.leaderEmail ?? record.contactPersonEmail,
    leaderPhone: profile.leaderPhone ?? record.contactPersonPhone ?? record.phone,
    delegationRepName: profile.delegationRepName ?? record.contactPersonName,
    delegationRepEmail: profile.delegationRepEmail ?? record.contactPersonEmail,
    delegationRepPhone: profile.delegationRepPhone ?? record.contactPersonPhone ?? record.phone,
  }
}

function toRecord(client: object) {
  const profile = client as ClientProfile
  const kind = profile.kind ?? 'BUSINESS'
  const companyName = String(
    kind === 'INDIVIDUAL' ? profile.fullName
      : kind === 'TEAM' ? profile.teamName
        : kind === 'DELEGATION' ? profile.delegationName
          : profile.companyName ?? ''
  )
  const phone = String(
    kind === 'INDIVIDUAL' ? profile.phone
      : kind === 'TEAM' ? profile.leaderPhone
        : kind === 'DELEGATION' ? profile.delegationRepPhone
          : profile.repPhone ?? ''
  )
  const contactPersonName = String(
    kind === 'INDIVIDUAL' ? profile.fullName
      : kind === 'TEAM' ? profile.leaderName
        : kind === 'DELEGATION' ? profile.delegationRepName
          : profile.repName ?? ''
  )
  const contactPersonPhone = phone
  const contactPersonEmail = String(
    kind === 'INDIVIDUAL' ? profile.email
      : kind === 'TEAM' ? profile.leaderEmail
        : kind === 'DELEGATION' ? profile.delegationRepEmail
          : profile.repEmail ?? ''
  )
  const email = String(kind === 'INDIVIDUAL' ? profile.email ?? '' : profile.repEmail ?? profile.leaderEmail ?? profile.delegationRepEmail ?? '')
  const address = String(
    kind === 'INDIVIDUAL' ? profile.location
      : kind === 'TEAM' ? profile.teamLocation
        : kind === 'DELEGATION' ? profile.delegationRepLocation
          : profile.address ?? ''
  )

  return {
    companyName,
    category: kind === 'BUSINESS' ? 'INSTITUTION' : 'SELF_EMPLOYED',
    status: 'PROSPECT',
    clientType: 'ACQUISITION',
    phone,
    email: email || undefined,
    location: String(profile.location ?? profile.teamLocation ?? profile.origin ?? address),
    address: address || undefined,
    website: typeof profile.website === 'string' ? profile.website : undefined,
    industry: typeof profile.industry === 'string' ? profile.industry : undefined,
    contactPersonName,
    contactPersonPhone,
    contactPersonEmail: contactPersonEmail || undefined,
    notes: typeof profile.notes === 'string' ? profile.notes : undefined,
    profileKind: kind,
    profileData: profile,
    services: Array.isArray(profile.services) ? profile.services : [],
    isActive: profile.status !== 'INACTIVE',
  }
}

export const clientService = {
  getAll: async (filters: ClientFilters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.append(key, String(value))
    })
    const { data } = await api.get(`/clients?${params.toString()}`)
    return {
      ...data,
      data: (data.data as ClientRecord[]).map(fromRecord),
    }
  },

  getOne: async (id: string) => {
    const { data } = await api.get(`/clients/${id}`)
    const record = data.data as ClientRecord
    const profile = fromRecord(record)
    const details = (record.profileData?.client360 ?? {}) as ClientProfile
    return {
      ...profile,
      ...details,
      id: record.id,
      totalInvoiced: details.totalInvoiced ?? 0,
      totalPaid: details.totalPaid ?? 0,
      timeline: details.timeline ?? [],
      services: details.services ?? [],
      contracts: details.contracts ?? [],
      invoices: details.invoices ?? [],
      documents: details.documents ?? [],
    }
  },

  addInteraction: async (id: string, interaction: object) => {
    const { data } = await api.post(`/clients/${id}/interactions`, interaction)
    return data.data
  },

  create: async (client: object) => {
    const { data } = await api.post('/clients', toRecord(client))
    return fromRecord(data.data as ClientRecord)
  },

  update: async (id: string, client: object) => {
    const { data } = await api.put(`/clients/${id}`, toRecord(client))
    return fromRecord(data.data as ClientRecord)
  },

  delete: async (id: string) => {
    await api.delete(`/clients/${id}`)
  },
}
