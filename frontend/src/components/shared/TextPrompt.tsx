import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PromptField { key: string; label: string; required?: boolean; placeholder?: string; rows?: number }
export interface PromptOptions {
  title: string
  description?: string
  fields: PromptField[]
  confirmLabel?: string
  /** red confirm button, for rejecting or sending something back */
  danger?: boolean
}
type Answer = Record<string, string> | null

/**
 * An in-app question box instead of the browser's plain "localhost says" pop-up.
 *   const { ask, dialog } = useTextPrompt()
 *   const a = await ask({ title: 'Approve contract', fields: [{ key: 'note', label: 'Note (optional)' }] })
 *   if (!a) return   // cancelled
 *   ... a.note ...
 * and render {dialog} once in the page.
 */
export function useTextPrompt(): { ask: (o: PromptOptions) => Promise<Answer>; dialog: ReactNode } {
  const [state, setState] = useState<{ options: PromptOptions; resolve: (a: Answer) => void } | null>(null)
  const ask = useCallback((options: PromptOptions) => new Promise<Answer>(resolve => setState({ options, resolve })), [])
  const done = (a: Answer) => { state?.resolve(a); setState(null) }
  return { ask, dialog: state ? <PromptDialog options={state.options} onDone={done} /> : null }
}

function PromptDialog({ options, onDone }: { options: PromptOptions; onDone: (a: Answer) => void }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const first = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { first.current?.focus() }, [])

  const missing = options.fields.some(f => f.required && !(values[f.key] ?? '').trim())
  const submit = () => { if (!missing) onDone(Object.fromEntries(options.fields.map(f => [f.key, (values[f.key] ?? '').trim()]))) }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={() => onDone(null)}
      onKeyDown={e => { if (e.key === 'Escape') onDone(null) }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div>
            <h3 className="font-semibold text-gray-900">{options.title}</h3>
            {options.description && <p className="text-xs text-gray-500 mt-0.5">{options.description}</p>}
          </div>
          <button onClick={() => onDone(null)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {options.fields.map((f, i) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}{f.required && <span className="text-red-500"> *</span>}</label>
              <textarea ref={i === 0 ? first : undefined} rows={f.rows ?? 3} value={values[f.key] ?? ''} placeholder={f.placeholder}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit() }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button onClick={() => onDone(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={missing}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50', options.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-santech-600 hover:bg-santech-700')}>
            {options.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
