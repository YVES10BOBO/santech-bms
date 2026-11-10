import { useCallback, useEffect, useState } from 'react'
import api from '../api'

export interface ListChoice { id: string; value: string; label: string; isActive: boolean; isOther: boolean }
export interface ListData { title: string; other: string; choices: ListChoice[] }

const EVENT = 'santech-lists-changed'
const notify = () => window.dispatchEvent(new Event(EVENT))

export const listService = {
  get: async (list: string): Promise<ListData> => {
    const r = await api.get(`/lists/${list}`)
    return { title: r.data.meta.title, other: r.data.meta.other, choices: r.data.data as ListChoice[] }
  },
  add: async (list: string, label: string) => { const r = await api.post(`/lists/${list}`, { label }); notify(); return r.data },
  update: async (list: string, id: string, body: { label?: string; isActive?: boolean }) => {
    const r = await api.put(`/lists/${list}/${id}`, body); notify(); return r.data
  },
  remove: async (list: string, id: string) => { const r = await api.delete(`/lists/${list}/${id}`); notify(); return r.data },
}

/**
 * The choices of a managed drop-down list. `labelOf(value)` gives the name people should see (so a rename shows
 * everywhere); it falls back to the value itself, e.g. for a custom value typed in "Other".
 */
export function useListOptions(list: string) {
  const [data, setData] = useState<ListData | null>(null)
  const load = useCallback(() => { listService.get(list).then(setData).catch(() => undefined) }, [list])
  useEffect(() => {
    load()
    window.addEventListener(EVENT, load)
    return () => window.removeEventListener(EVENT, load)
  }, [load])
  const labelOf = (value: string, fallback?: string) => data?.choices.find(c => c.value === value)?.label ?? fallback ?? value
  return { data, labelOf, reload: load }
}
