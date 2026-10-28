import { useEffect, useState } from 'react'
import api from '../api'

export interface Lookups {
  clients: { id: string; name: string; category: string; contactName: string; phone: string }[]
  users: { id: string; name: string; role: string }[]
  contracts: { id: string; contractNumber: string; clientId: string; projectName: string | null; value: number; status: string }[]
  projects: { id: string; name: string; clientId: string; contractId: string | null; contractValue: number; budget: number }[]
}

const empty: Lookups = { clients: [], users: [], contracts: [], projects: [] }
let cache: Promise<Lookups> | null = null

export const lookupService = {
  get: (refresh = false): Promise<Lookups> => {
    if (!cache || refresh) {
      cache = api.get('/lookups')
        .then(r => r.data.data as Lookups)
        .catch(err => { cache = null; throw err })
    }
    return cache
  },
}

/** Dropdown data (clients, staff, contracts, projects) shared by all forms. */
export function useLookups() {
  const [lookups, setLookups] = useState<Lookups>(empty)
  useEffect(() => {
    let alive = true
    lookupService.get().then(l => { if (alive) setLookups(l) }).catch(() => { /* forms still work, lists stay empty */ })
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
