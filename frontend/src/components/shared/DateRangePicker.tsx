import { useEffect, useRef, useState } from 'react'
import { addDays, addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onChange: (startDate: string, endDate: string) => void
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`)
}

function getCalendarDays(month: Date) {
  const firstDay = startOfWeek(startOfMonth(month))
  const lastDay = endOfWeek(endOfMonth(month))
  const dayCount = Math.round((lastDay.getTime() - firstDay.getTime()) / 86400000) + 1
  return Array.from({ length: dayCount }, (_, index) => addDays(firstDay, index))
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => startDate ? parseDate(startDate) : new Date())
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const openPicker = () => {
    if (!isOpen) setVisibleMonth(startDate ? parseDate(startDate) : new Date())
    setIsOpen(open => !open)
  }

  const selectDate = (date: Date) => {
    const selectedDate = format(date, 'yyyy-MM-dd')
    if (!startDate || endDate) {
      onChange(selectedDate, '')
      return
    }

    if (selectedDate < startDate) onChange(selectedDate, startDate)
    else onChange(startDate, selectedDate)
    setIsOpen(false)
  }

  const rangeLabel = startDate && endDate
    ? `${format(parseDate(startDate), 'MMM d, yyyy')} - ${format(parseDate(endDate), 'MMM d, yyyy')}`
    : startDate
      ? `${format(parseDate(startDate), 'MMM d, yyyy')} - Select end date`
      : 'Select date range'

  const renderMonth = (month: Date) => {
    const monthKey = format(startOfMonth(month), 'yyyy-MM')
    return (
      <section key={monthKey} aria-label={format(month, 'MMMM yyyy')}>
        <h3 className="mb-3 text-center text-sm font-semibold text-gray-700">{format(month, 'MMMM yyyy')}</h3>
        <div className="grid grid-cols-7 text-center">
          {WEEKDAYS.map(day => <span key={day} className="py-1 text-xs font-medium text-gray-400">{day}</span>)}
          {getCalendarDays(month).map(day => {
            const dayValue = format(day, 'yyyy-MM-dd')
            const inMonth = day.getMonth() === month.getMonth()
            const isStart = dayValue === startDate
            const isEnd = dayValue === endDate
            const isInRange = Boolean(startDate && endDate && dayValue > startDate && dayValue < endDate)
            return (
              <button
                key={dayValue}
                type="button"
                aria-label={format(day, 'MMMM d, yyyy')}
                aria-pressed={isStart || isEnd}
                onClick={() => selectDate(day)}
                className={`mx-auto my-0.5 grid h-8 w-8 place-items-center rounded-full text-xs transition-colors hover:bg-santech-100 hover:text-santech-700 ${
                  isStart || isEnd
                    ? 'bg-santech-600 font-semibold text-white hover:bg-santech-700 hover:text-white'
                    : isInRange
                      ? 'bg-santech-100 text-santech-800'
                      : inMonth ? 'text-gray-700' : 'text-gray-300'
                }`}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={openPicker}
        className="flex min-h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-santech-500"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
        <span className="whitespace-nowrap">{rangeLabel}</span>
      </button>

      {isOpen && (
        <div role="dialog" aria-label="Choose date range" className="absolute left-0 top-full z-50 mt-2 w-[640px] max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(month => addMonths(month, -1))} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Next month" onClick={() => setVisibleMonth(month => addMonths(month, 1))} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {renderMonth(visibleMonth)}
            {renderMonth(addMonths(visibleMonth, 1))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <button type="button" onClick={() => { onChange('', ''); setIsOpen(false) }} className="text-sm text-gray-500 hover:text-gray-800">Clear</button>
            <span className="text-xs text-gray-400">{startDate && !endDate ? 'Select an end date' : 'Select a start date'}</span>
          </div>
        </div>
      )}
    </div>
  )
}