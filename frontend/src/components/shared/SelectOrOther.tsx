import { useEffect, useState } from 'react'

type Option = string | { value: string; label: string }

interface Props {
  value: string
  onChange: (value: string) => void
  options: Option[]
  /** The list entry that means "something else" (its value). Default "Other". */
  otherValue?: string
  placeholder?: string
  className?: string
}

const base = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500'

/**
 * A drop-down with an "Other" entry. Choosing "Other" shows a text box where the user types their own value;
 * the typed text is what gets saved. An existing custom value opens with "Other" selected and the text filled in.
 */
export default function SelectOrOther({ value, onChange, options, otherValue = 'Other', placeholder = 'Type it here…', className = '' }: Props) {
  const opts = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o))
  const isListed = (v: string) => v !== otherValue && opts.some(o => o.value === v)
  const [other, setOther] = useState(value !== '' && !isListed(value))

  // Follow the form when it is reset or loaded with a different record
  useEffect(() => {
    if (value === '') return
    setOther(!isListed(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const pick = (v: string) => {
    if (v === otherValue) { setOther(true); onChange(''); return }
    setOther(false); onChange(v)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <select value={other ? otherValue : value} onChange={e => pick(e.target.value)} className={base}>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {other && (
        <input
          autoFocus={value === ''}
          value={value === otherValue ? '' : value}
          onChange={e => onChange(e.target.value)}
          maxLength={60}
          placeholder={placeholder}
          className={base}
        />
      )}
    </div>
  )
}
