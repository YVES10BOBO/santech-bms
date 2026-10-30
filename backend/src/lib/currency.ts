/**
 * Currencies. Reports are in RWF; a document in another currency keeps the exchange rate
 * (RWF for 1 unit) from the day it was made, so its RWF value does not move afterwards.
 * Finance sets the rates in Settings → Company Profile → Currencies.
 */
import type { Prisma } from '@prisma/client'
import prisma from './prisma'

export const BASE_CURRENCY = 'RWF'
export const CURRENCIES = ['RWF', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'] as const

/** Starting rates (RWF for 1 unit) until Finance saves its own */
export const DEFAULT_RATES: Record<string, number> = { RWF: 1, USD: 1450, EUR: 1580, GBP: 1840, KES: 11.2, UGX: 0.39, TZS: 0.55 }

export const isCurrency = (c: unknown): c is string => typeof c === 'string' && (CURRENCIES as readonly string[]).includes(c)

export async function getRates(): Promise<{ rates: Record<string, number>; updatedAt: Date | null }> {
  const row = await prisma.setting.findUnique({ where: { key: 'exchangeRates' } })
  const saved = (row?.value as { rates?: Record<string, number> } | null)?.rates ?? {}
  const rates = { ...DEFAULT_RATES }
  for (const c of CURRENCIES) if (Number(saved[c]) > 0) rates[c] = Number(saved[c])
  rates[BASE_CURRENCY] = 1
  return { rates, updatedAt: row?.updatedAt ?? null }
}

/** RWF for 1 unit of the currency today */
export async function rateFor(currency: string | null | undefined): Promise<number> {
  if (!currency || currency === BASE_CURRENCY) return 1
  return (await getRates()).rates[currency] ?? 1
}

/** Amount in RWF, rounded to the franc */
export const toRwf = (amount: number, rate: number | null | undefined) => Math.round(amount * (rate || 1))

/** What is still owed on an invoice, in its own currency */
export const openBalance = (inv: { totalAmount: number; paidAmount: number; creditedAmount?: number | null }) =>
  Math.max(0, inv.totalAmount - inv.paidAmount - (inv.creditedAmount ?? 0))

/** Only real invoices are receivables (not proformas or credit notes) */
export const receivableWhere = (): Prisma.InvoiceWhereInput => ({ type: 'INVOICE', status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] } })
