import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, FileSearch, PenLine } from 'lucide-react'
import api from '@/lib/api'

interface Result {
  documentName: string
  fileName: string
  contractNumber: string | null
  issuer: { name: string; tin: string }
  signatures: { signer: string; signingAs: string | null; signedAt: string; items: number }[]
  fingerprint: string
}

const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Public page behind the QR code on a signed document: who signed it, and a check that a file is exactly the signed copy. */
export default function VerifySignedPage() {
  const { code } = useParams()
  const [data, setData] = useState<Result | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'invalid' | 'error'>('loading')
  const [checking, setChecking] = useState(false)
  const [match, setMatch] = useState<null | { name: string; ok: boolean }>(null)
  const [checkError, setCheckError] = useState('')

  useEffect(() => {
    let dead = false
    api.get(`/verify/signed/${code}`)
      .then(r => { if (!dead) { setData(r.data.data); setStatus('ok') } })
      .catch(e => { if (!dead) setStatus(e.response?.status === 404 ? 'invalid' : 'error') })
    return () => { dead = true }
  }, [code])

  const check = async (file?: File) => {
    if (!file) return
    setChecking(true); setMatch(null); setCheckError('')
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose a file smaller than 20 MB')
      const r = await api.post(`/verify/signed/${code}/check`, { sha256: await sha256Hex(file) })
      setMatch({ name: file.name, ok: !!r.data.match })
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : 'Could not check this file right now')
    } finally { setChecking(false) }
  }

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex flex-col items-center justify-center p-4">
      <img src="/assets/santech_logo_blue.png" alt="Santech" className="h-16 mb-5" />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {status === 'loading' && <div className="p-10 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Checking the document…</div>}

        {status === 'invalid' && (
          <div className="p-8 text-center">
            <XCircle className="w-14 h-14 text-red-500 mx-auto" />
            <h1 className="mt-3 text-lg font-bold text-gray-900">Signed document not recognised</h1>
            <p className="mt-2 text-sm text-gray-600">No signed document matches this code. Do not rely on the document you scanned, and contact the company that issued it.</p>
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
            <div className="p-6 text-center bg-green-50">
              <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
              <h1 className="mt-2 text-lg font-bold text-gray-900">Genuine signed document</h1>
              <p className="text-sm text-gray-600">Signed electronically in the system of {data.issuer.name}{data.issuer.tin ? ` (TIN ${data.issuer.tin})` : ''}.</p>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Document</p>
                <p className="font-medium text-gray-900 break-words">{data.documentName}</p>
                {data.contractNumber && <p className="text-gray-600">Contract {data.contractNumber}</p>}
              </div>
              <div>
                <p className="text-gray-500 mb-1.5">Signed by</p>
                <ul className="space-y-2">
                  {data.signatures.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2">
                      <PenLine className="w-4 h-4 text-santech-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{s.signer}{s.signingAs && s.signingAs !== s.signer ? <span className="font-normal text-gray-600"> (as {s.signingAs})</span> : null}</p>
                        <p className="text-xs text-gray-500">{when(s.signedAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="font-medium text-gray-900 flex items-center gap-2"><FileSearch className="w-4 h-4 text-santech-600" /> Check your copy</p>
                <p className="text-xs text-gray-500 mt-1">Choose the file you received. Your file stays on your device: only its fingerprint is compared, to see that it is exactly the signed copy.</p>
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-600 hover:bg-gray-50">
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {checking ? 'Checking…' : 'Choose the PDF to check'}
                  <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => { check(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                {match && (
                  <div className={`mt-3 rounded-lg p-3 text-sm ${match.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {match.ok
                      ? <>✔ <b>{match.name}</b> is exactly the signed document. It has not been changed.</>
                      : <>✘ <b>{match.name}</b> does <b>not</b> match the signed document. It may have been changed or it is a different file.</>}
                  </div>
                )}
                {checkError && <p className="mt-3 text-sm text-red-600">{checkError}</p>}
              </div>
            </div>
          </>
        )}
      </div>
      <p className="mt-4 text-xs text-gray-400">Checked with SAN-BMS</p>
    </div>
  )
}
