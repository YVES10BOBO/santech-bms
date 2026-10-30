import { useEffect, useState } from 'react'
import { History, ChevronDown, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { versionService } from '@/lib/services/operationsService'

interface Change { field: string; label: string; from: string; to: string }
interface Version { id: string; version: number; changes: Change[] | null; changedByName: string | null; createdAt: string }

/**
 * Version history of a contract or quotation: each time the terms change, the earlier version is kept.
 * Shows the current version and, for each earlier one, what the next version changed.
 */
export default function VersionHistory({ entity, id, reloadKey }: { entity: 'contract' | 'quotation'; id: string; reloadKey?: unknown }) {
  const [data, setData] = useState<{ current: number; versions: Version[] } | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setData(null)
    versionService.get(entity, id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => { if (live) setData(res.data) })
      .catch(() => { if (live) setData({ current: 1, versions: [] }) })
    return () => { live = false }
  }, [entity, id, reloadKey])

  if (!data) return <p className="text-xs text-gray-400">Loading history…</p>
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" /> Version history
      </p>
      <div className="rounded-lg border border-gray-100 divide-y divide-gray-50 text-xs">
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="font-semibold text-gray-700">Version {data.current} <span className="font-normal text-green-700">(current)</span></span>
        </div>
        {data.versions.length === 0 ? (
          <p className="px-3 py-2 text-gray-400">No earlier versions — the terms have not changed since it was created.</p>
        ) : data.versions.map(v => (
          <div key={v.id}>
            <button onClick={() => setOpen(o => (o === v.id ? null : v.id))} className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-gray-50">
              {open === v.id ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
              <span className="font-semibold text-gray-600">Version {v.version}</span>
              <span className="text-gray-400 truncate">
                changed {formatDate(v.createdAt)}{v.changedByName && ` by ${v.changedByName}`} · {v.changes?.length ?? 0} change{v.changes?.length === 1 ? '' : 's'}
              </span>
            </button>
            {open === v.id && (
              <ul className="px-3 pb-2 space-y-1">
                {(v.changes ?? []).map(c => (
                  <li key={c.field} className="text-gray-600">
                    <span className="font-medium text-gray-700">{c.label}:</span>{' '}
                    <span className="line-through text-red-600/80">{c.from}</span> → <span className="text-green-700">{c.to}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
