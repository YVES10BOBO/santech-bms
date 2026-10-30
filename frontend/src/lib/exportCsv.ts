/**
 * Download rows as a CSV file that opens in Excel (UTF-8 with BOM, so names like "Société" stay correct).
 *   downloadCsv('field-visits.csv', [{ label: 'Company', value: v => v.companyName }, …], rows)
 */
export function downloadCsv<T>(filename: string, columns: { label: string; value: (row: T) => unknown }[], rows: T[]): void {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map(c => cell(c.label)).join(','), ...rows.map(r => columns.map(c => cell(c.value(r))).join(','))]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/** Today as YYYY-MM-DD, for file names */
export const today = () => new Date().toISOString().slice(0, 10)
