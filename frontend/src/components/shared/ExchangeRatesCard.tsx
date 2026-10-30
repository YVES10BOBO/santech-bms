import { useEffect, useState } from 'react'
import { Coins, Save } from 'lucide-react'
import { exchangeRateService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import { CURRENCIES, CURRENCY_NAMES, loadRates } from '@/lib/currency'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

/**
 * Exchange rates to RWF (RWF for 1 unit). Reports are in RWF; each invoice, quotation and contract
 * keeps the rate of the day it was made. Finance and admins can edit.
 */
export default function ExchangeRatesCard({ canEdit }: { canEdit: boolean }) {
  const [rates, setRates] = useState<Record<string, string>>({})
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    exchangeRateService.get()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        setRates(Object.fromEntries(Object.entries(res.data?.rates ?? {}).map(([k, v]) => [k, String(v)])))
        setUpdatedAt(res.data?.updatedAt ?? null)
      })
      .catch(err => toast.error(apiError(err, 'Failed to load exchange rates')))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await exchangeRateService.save(Object.fromEntries(CURRENCIES.filter(c => c !== 'RWF').map(c => [c, Number(rates[c])])))
      toast.success(res.message)
      setUpdatedAt(new Date().toISOString())
      loadRates(true)
    } catch (err) {
      toast.error(apiError(err, 'Failed to save exchange rates'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bms-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Coins className="w-4 h-4 text-santech-600" /> Currencies & exchange rates
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Quotations, contracts, invoices and client services can be in any of these currencies. Reports and totals are in RWF.
            Each document keeps the rate of the day it was made; a payment is booked at the rate of the payment day.
          </p>
        </div>
        {updatedAt && <span className="text-[11px] text-gray-400">Last changed {formatDateTime(updatedAt)}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
        {CURRENCIES.filter(c => c !== 'RWF').map(c => (
          <label key={c} className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">1 {c} <span className="font-normal text-gray-400">({CURRENCY_NAMES[c]})</span></span>
            <div className="flex items-center rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-santech-500">
              <input
                type="number" min="0" step="0.0001" value={rates[c] ?? ''} disabled={!canEdit}
                onChange={e => setRates(r => ({ ...r, [c]: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-l-lg focus:outline-none disabled:bg-gray-50"
                aria-label={`RWF for 1 ${c}`}
              />
              <span className="px-2 text-xs text-gray-400">RWF</span>
            </div>
          </label>
        ))}
      </div>
      {canEdit ? (
        <div className="flex justify-end">
          <button type="button" onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save rates'}
          </button>
        </div>
      ) : <p className="text-xs text-gray-400">Only Finance and admins can change the rates.</p>}
    </div>
  )
}
