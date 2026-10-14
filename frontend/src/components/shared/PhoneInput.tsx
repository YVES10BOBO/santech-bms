import React from 'react'
import { cn } from '@/lib/utils'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  defaultCountry?: string
  className?: string
}

export default function PhoneInput({
  value,
  onChange,
  label,
  placeholder = 'e.g. 0788123456',
  required = false,
  className,
}: PhoneInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="tel"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={cn(
          'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500',
          className,
        )}
      />
    </div>
  )
}
