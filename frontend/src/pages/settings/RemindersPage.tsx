import React, { useEffect, useState } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { remindersService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

interface Rule { on: boolean; days: number[] }
interface Info { label: string; help: string; after?: boolean; max: number }
interface Data { settings: Record<string, Rule>; defaults: Record<string, Rule>; info: Record<string, Info> }
type Form = Record<string, { on: boolean; text: string }>

const toForm = (s: Record<string, Rule>): Form =>
  Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { on: v.on, text: v.days.join(', ') }]))
const same = (a: Form, b: Form) => JSON.stringify(a) === JSON.stringify(b)

export default function RemindersPage() {
  const [data, setData] = useState<Data | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [saved, setSaved] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)

  const apply = (d: Data) => { setData(d); setForm(toForm(d.settings)); setSaved(toForm(d.settings)) }
  useEffect(() => {
    remindersService.get()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((r: any) => apply(r.data))
      .catch(err => toast.error(apiError(err, 'Failed to load the reminder settings')))
  }, [])

  if (!data || !form || !saved) return <PageLoader />

  const send = async (body: Record<string, unknown>) => {
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await remindersService.save(body)
      apply(r.data); toast.success(r.message)
    } catch (err) { toast.error(apiError(err, 'Failed to save')) } finally { setSaving(false) }
  }
  const save = (e: React.FormEvent) => {
    e.preventDefault()
    send(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, { on: v.on, days: v.text }])))
  }
  const reset = () => {
    if (window.confirm('Put every reminder back to the default days?')) send({ reset: true })
  }
  const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 disabled:bg-gray-50 disabled:text-gray-400'
  const isDefault = same(saved, toForm(data.defaults))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reminders</h1>
        <p className="text-gray-500 text-sm mt-0.5">How many days before or after a date people are reminded. Separate the days with commas.</p>
      </div>

      <form onSubmit={save} className="bms-card overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {Object.entries(data.info).map(([k, info]) => {
            const f = form[k]
            const def = data.defaults[k].days.join(', ')
            return (
              <li key={k} className="px-5 py-3 grid gap-3 items-center" style={{ gridTemplateColumns: 'minmax(200px, 1.4fr) minmax(160px, 1fr) auto' }}>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{info.label}</p>
                  <p className="text-xs text-gray-500">{info.help}</p>
                </div>
                <div>
                  <input className={input} value={f.text} disabled={!f.on} aria-label={`${info.label}: days ${info.after ? 'after' : 'before'}`}
                    onChange={e => setForm(c => c && { ...c, [k]: { ...c[k], text: e.target.value } })} placeholder={def} />
                  <p className="text-[11px] text-gray-400 mt-0.5">Default: {def}</p>
                </div>
                <button type="button" role="switch" aria-checked={f.on} aria-label={`${info.label} on or off`}
                  onClick={() => setForm(c => c && { ...c, [k]: { ...c[k], on: !c[k].on } })}
                  className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors', f.on ? 'bg-green-600' : 'bg-gray-300')}>
                  <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', f.on ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
              </li>
            )
          })}
        </ul>
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <button type="button" onClick={reset} disabled={saving || isDefault}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40">
            <RotateCcw className="w-4 h-4" /> Back to defaults
          </button>
          <button disabled={saving || same(form, saved)} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
