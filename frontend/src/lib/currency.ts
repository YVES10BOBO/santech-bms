import { useEffect, useState } from 'react'
import { exchangeRateService } from '@/lib/services/operationsService'

/** Same list as the server (backend/src/lib/currency.ts). Reports are in RWF. */
export const CURRENCIES = ['RWF', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'] as const
export const CURRENCY_NAMES: Record<string, string> = {
  RWF: 'Rwandan franc', USD: 'US dollar', EUR: 'Euro', GBP: 'British pound', KES: 'Kenyan shilling', UGX: 'Ugandan shilling', TZS: 'Tanzanian shilling',
}

/** Amount in RWF using the rate saved on the document (RWF for 1 unit) */
export const toRwf = (amount: number, rate?: number | null) => Math.round(amount * (rate || 1))

let cache: Record<string, number> | null = null
let pending: Promise<Record<string, number>> | null = null

/** Today's exchange rates (loaded once per page visit) */
export function loadRates(force = false): Promise<Record<string, number>> {
  if (cache && !force) return Promise.resolve(cache)
  if (!pending || force) {
    pending = exchangeRateService.get()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => (cache = res.data?.rates ?? { RWF: 1 }))
      .catch(() => (cache = { RWF: 1 }))
      .finally(() => { pending = null }) as Promise<Record<string, number>>
  }
  return pending
}

export function useRates(): Record<string, number> {
  const [rates, setRates] = useState<Record<string, number>>(cache ?? { RWF: 1 })
  useEffect(() => { let live = true; loadRates().then(r => { if (live) setRates(r) }); return () => { live = false } }, [])
  return rates
}

/** "≈ RWF 6,844,000" helper text under an amount in another currency */
export const rwfHint = (amount: number, currency: string, rate?: number) =>
  currency === 'RWF' || !rate ? '' : `≈ RWF ${toRwf(amount, rate).toLocaleString('en-US')} at ${rate.toLocaleString('en-US')}`
