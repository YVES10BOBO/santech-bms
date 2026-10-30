import { useState } from 'react'
import { Check, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ViewMode = 'grid' | 'list'

/** Grid / list choice for a page, remembered in this browser (e.g. useViewMode('salary')) */
export function useViewMode(page: string, fallback: ViewMode = 'grid'): [ViewMode, (v: ViewMode) => void] {
  const key = `santech.${page}.view`
  const [view, setView] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved === 'grid' || saved === 'list' ? saved : fallback
    } catch { return fallback }
  })
  const choose = (v: ViewMode) => {
    setView(v)
    try { localStorage.setItem(key, v) } catch { /* remembered for this visit only */ }
  }
  return [view, choose]
}

/** List / grid switch, styled like Google Drive's: the chosen side is light blue with a tick */
export default function ViewToggle({ value, onChange, className }: { value: ViewMode; onChange: (v: ViewMode) => void; className?: string }) {
  return (
    <div className={cn('inline-flex shrink-0 rounded-full border border-[#747775] overflow-hidden', className)} role="group" aria-label="Layout">
      {([['list', List, 'List layout'], ['grid', LayoutGrid, 'Grid layout']] as const).map(([v, Icon, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          title={label}
          aria-pressed={value === v}
          className={cn('flex items-center gap-1 px-3.5 py-1.5 transition-colors', v === 'grid' && 'border-l border-[#747775]',
            value === v ? 'bg-[#c2e7ff] text-[#001d35]' : 'bg-white text-gray-700 hover:bg-gray-100')}
        >
          {value === v && <Check className="w-4 h-4" />}
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}
