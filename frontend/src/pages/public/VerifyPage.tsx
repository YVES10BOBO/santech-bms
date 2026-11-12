import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface Result {
  state: 'PAID' | 'PARTLY_PAID' | 'UNPAID' | 'OVERDUE' | 'CANCELLED' | 'NOT_APPLICABLE' | 'APPROVED' | 'NOT_APPROVED' | 'REJECTED'
  approvedBy?: string | null
  approvedAt?: string | null
  documentType: string
  number: string
  issueDate: string
  client: string
  total: number
  currency: string
  issuer: { name: string; tin: string }
}

const STATE_TEXT: Record<Result['state'], { label: string; color: string } | null> = {
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  NOT_APPROVED: { label: 'Not approved yet', color: 'bg-amber-100 text-amber-800' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  PAID: { label: 'Paid', color: 'bg-green-100 text-green-700' },
  PARTLY_PAID: { label: 'Partly paid', color: 'bg-amber-100 text-amber-700' },
  UNPAID: { label: 'Not yet paid', color: 'bg-blue-100 text-blue-700' },
  OVERDUE: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  NOT_APPLICABLE: null,
}

const money = (n: number, cur: string) =>
  `${cur} ${cur === 'RWF' ? Math.round(n).toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Public page behind the QR code on a printed invoice: confirms the document is genuine. No login, read only. */
export default function VerifyPage({ kind = 'invoice' }: { kind?: 'invoice' | 'quotation' }) {
  const { code } = useParams()
  const [data, setData] = useState<Result | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'invalid' | 'error'>('loading')

  useEffect(() => {
    let dead = false
    api.get(`/verify/${kind}/${code}`)
      .then(r => { if (!dead) { setData(r.data.data); setStatus('ok') } })
      .catch(e => { if (!dead) setStatus(e.response?.status === 404 ? 'invalid' : 'error') })
    return () => { dead = true }
  }, [code, kind])

  const cancelled = data?.state === 'CANCELLED'
  const notApproved = data?.state === 'NOT_APPROVED' || data?.state === 'REJECTED'
  const bad = cancelled || notApproved

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex flex-col items-center justify-center p-4">
      <img src="/assets/santech_logo_blue.png" alt="Santech" className="h-16 mb-5" />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {status === 'loading' && <div className="p-10 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Checking the document…</div>}

        {status === 'invalid' && (
          <div className="p-8 text-center">
            <XCircle className="w-14 h-14 text-red-500 mx-auto" />
            <h1 className="mt-3 text-lg font-bold text-gray-900">Document not recognised</h1>
            <p className="mt-2 text-sm text-gray-600">No invoice matches this code. Do not rely on the document you scanned, and contact the company that issued it.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="p-8 text-center">
            <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto" />
            <h1 className="mt-3 text-lg font-bold text-gray-900">Could not check right now</h1>
            <p className="mt-2 text-sm text-gray-600">Please try again in a moment.</p>
          </div>
        )}

        {status === 'ok' && data && (
          <>
            <div className={`p-6 text-center ${bad ? (cancelled || data.state === 'REJECTED' ? 'bg-red-50' : 'bg-amber-50') : 'bg-green-50'}`}>
              {bad ? <AlertTriangle className="w-14 h-14 text-red-500 mx-auto" /> : <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />}
              <h1 className="mt-2 text-lg font-bold text-gray-900">{cancelled ? 'Genuine, but cancelled' : data.state === 'REJECTED' ? 'Genuine, but rejected' : notApproved ? 'Genuine, but not approved' : data.state === 'APPROVED' ? 'Genuine and approved' : 'Genuine document'}</h1>
              <p className="text-sm text-gray-600">{cancelled ? 'This document was issued by the company below and has since been cancelled.' : notApproved ? 'This quotation exists in the company\'s system but management has not approved it. Do not rely on it.' : data.state === 'APPROVED' ? `Approved by ${data.approvedBy || 'management'}${data.approvedAt ? ` on ${new Date(data.approvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}.` : 'This document was issued by the company below.'}</p>
            </div>
            <dl className="p-6 space-y-3 text-sm">
              <Row label="Issued by" value={`${data.issuer.name}${data.issuer.tin ? ` (TIN ${data.issuer.tin})` : ''}`} />
              <Row label="Document" value={`${data.documentType} ${data.number}`} />
              <Row label="Date" value={new Date(data.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
              <Row label={kind === 'quotation' ? 'Prepared for' : 'Billed to'} value={data.client} />
              <Row label="Total" value={money(data.total, data.currency)} bold />
              {STATE_TEXT[data.state] && (
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500">{kind === 'quotation' ? 'Status' : 'Payment'}</dt>
                  <dd><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATE_TEXT[data.state]!.color}`}>{STATE_TEXT[data.state]!.label}</span></dd>
                </div>
              )}
            </dl>
            <p className="px-6 pb-5 text-xs text-gray-400">Compare these details with your printed document. If anything is different, the document may have been changed.</p>
          </>
        )}
      </div>
      <p className="mt-4 text-xs text-gray-400">Checked with SAN-BMS</p>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 flex-shrink-0">{label}</dt>
      <dd className={`text-right text-gray-900 ${bold ? 'font-bold' : 'font-medium'}`}>{value}</dd>
    </div>
  )
}
