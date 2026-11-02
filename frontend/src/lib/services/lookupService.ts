import { useEffect, useState } from 'react'
import api from '../api'

export interface Lookups {
  /** email / contactPhone: where messages go (contact person first, else the company's own) */
  clients: { id: string; name: string; category: string; contactName: string; phone: string; email: string; contactPhone: string }[]
  users: { id: string; name: string; role: string }[]
  contracts: { id: string; contractNumber: string; clientId: string; projectName: string | null; value: number; status: string }[]
  projects: { id: string; name: string; clientId: string; contractId: string | null; contractValue: number; budget: number; warrantyEndDate: string | null }[]
  /** sales pipeline deals (only for sales, finance and admins) */
  deals: { id: string; name: string; clientId: string; stage: string; estimatedValue: number }[]
  departments: { id: string; name: string }[]
  campaigns: { id: string; name: string; type: string; status: string }[]
  /** product catalogue (for quotation lines) */
  products: { id: string; name: string; category: string; price: number; currency: string; taxRate: number }[]
}

const empty: Lookups = { clients: [], users: [], contracts: [], projects: [], deals: [], departments: [], campaigns: [], products: [] }
let cache: Promise<Lookups> | null = null
let last: Lookups | null = null // last lists received, shown instantly while fresh ones load

export const lookupService = {
  get: (refresh = false): Promise<Lookups> => {
    if (!cache || refresh) {
      cache = api.get('/lookups')
        .then(r => (last = r.data.data as Lookups))
        .catch(err => { cache = null; throw err })
    }
    return cache
  },
}

/**
 * Dropdown data (clients, staff, contracts, projects, deals, departments, campaigns, products) shared by all forms.
 * Each page that uses it fetches fresh lists when it opens, so clients, contracts
 * and projects created elsewhere appear without reloading the browser.
 */
export function useLookups() {
  const [lookups, setLookups] = useState<Lookups>(last ?? empty)
  useEffect(() => {
    let alive = true
    lookupService.get(true).then(l => { if (alive) setLookups(l) }).catch(() => { /* forms still work, lists stay as they were */ })
    return () => { alive = false }
  }, [])
  const reload = () => lookupService.get(true).then(setLookups)
  return { ...lookups, reload }
}

/** Readable message from an API error. */
export function apiError(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as { response?: { data?: { message?: string }; status?: number } }
  if (e.response?.status === 403) return e.response.data?.message ?? 'You do not have permission for this action'
  return e.response?.data?.message ?? fallback
}
