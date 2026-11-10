import { useState } from 'react'
import { Settings2, Eye, EyeOff, Trash2, Plus, X, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import SelectOrOther from './SelectOrOther'
import { listService, useListOptions, type ListChoice } from '@/lib/services/listService'
import { apiError } from '@/lib/services/lookupService'
import { useAuthStore } from '@/store/authStore'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

interface Props {
  /** Which managed list: training_type, support_product, campaign_channel */
  list: string
  value: string
  onChange: (value: string) => void
  /** Shown until the list loads (or if it cannot be loaded) */
  fallback: { value: string; label: string }[]
  otherValue?: string
  placeholder?: string
}

/**
 * A drop-down whose choices an admin manages (⚙ next to the box): add, rename, hide, delete.
 * Everyone else just sees the box. "Other" still lets anyone type their own value.
 */
export default function ManagedSelect({ list, value, onChange, fallback, otherValue = 'Other', placeholder }: Props) {
  const { data } = useListOptions(list)
  const isAdmin = ADMIN_ROLES.includes(useAuthStore(s => s.user?.role ?? ''))
  const [managing, setManaging] = useState(false)

  const choices = data?.choices
  // active choices, plus the current value when an old record uses a choice that is now hidden
  const options = choices
    ? choices.filter(c => c.isActive || c.value === value).map(c => ({ value: c.value, label: c.label }))
    : fallback

  return (
    <div className="flex items-start gap-2">
      <SelectOrOther className="flex-1 min-w-0" value={value} onChange={onChange} options={options} otherValue={data?.other ?? otherValue} placeholder={placeholder} />
      {isAdmin && (
        <button type="button" onClick={() => setManaging(true)} title="Manage this list (add, rename, hide, delete)" aria-label="Manage this list"
          className="h-[38px] w-[38px] flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-santech-700 hover:bg-gray-50">
          <Settings2 className="w-4 h-4" />
        </button>
      )}
      {managing && <ManageDialog list={list} onClose={() => setManaging(false)} />}
    </div>
  )
}

function ManageDialog({ list, onClose }: { list: string; onClose: () => void }) {
  const { data } = useListOptions(list)
  const [newLabel, setNewLabel] = useState('')
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<{ message?: string }>) => {
    setBusy(true)
    try { const r = await fn(); if (r.message) toast.success(r.message) } catch (e) { toast.error(apiError(e)) } finally { setBusy(false) }
  }
  const add = () => { const label = newLabel.trim(); if (!label) return; run(async () => { const r = await listService.add(list, label); setNewLabel(''); return r }) }
  const rename = (c: ListChoice) => {
    const label = editing?.label.trim()
    setEditing(null)
    if (!label || label === c.label) return
    run(() => listService.update(list, c.id, { label }))
  }
  const remove = (c: ListChoice) => {
    if (!window.confirm(`Delete "${c.label}"? This is only possible when nothing uses it; otherwise hide it.`)) return
    run(() => listService.remove(list, c.id))
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">{data?.title ?? 'Manage list'}</h3>
            <p className="text-xs text-gray-500">Add, rename, hide or delete choices. Old records keep what they had.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-3 space-y-1.5">
          {!data && <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>}
          {data?.choices.map(c => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-1.5">
              {c.isOther ? (
                <>
                  <span className="flex-1 text-sm text-gray-500">{c.label} <span className="text-xs text-gray-400">(built in: people can type their own)</span></span>
                  <Lock className="w-4 h-4 text-gray-300" />
                </>
              ) : (
                <>
                  {editing?.id === c.id ? (
                    <input autoFocus value={editing.label} onChange={e => setEditing({ id: c.id, label: e.target.value })} maxLength={60}
                      onBlur={() => rename(c)} onKeyDown={e => { if (e.key === 'Enter') rename(c); if (e.key === 'Escape') setEditing(null) }}
                      className="flex-1 min-w-0 px-2 py-1 border border-santech-300 rounded text-sm focus:outline-none" />
                  ) : (
                    <button type="button" onClick={() => setEditing({ id: c.id, label: c.label })} title="Click to rename"
                      className={`flex-1 min-w-0 text-left text-sm truncate ${c.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                      {c.label}{!c.isActive && <span className="ml-2 text-xs no-underline">(hidden)</span>}
                    </button>
                  )}
                  <button type="button" disabled={busy} onClick={() => run(() => listService.update(list, c.id, { isActive: !c.isActive }))}
                    title={c.isActive ? 'Hide from the list' : 'Show in the list'} className="p-1 text-gray-400 hover:text-santech-700">
                    {c.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button type="button" disabled={busy} onClick={() => remove(c)} title="Delete (only if unused)" className="p-1 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} maxLength={60} placeholder="New choice, e.g. Robotics"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
          <button type="button" disabled={busy || !newLabel.trim()} onClick={add}
            className="flex items-center gap-1 px-3 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
    </div>
  )
}
