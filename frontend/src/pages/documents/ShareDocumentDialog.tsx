import { useState } from 'react'
import { X, Share2, Link2, Building2, Truck, Search, CheckCircle2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { documentService } from '@/lib/services/operationsService'
import { apiError, useLookups } from '@/lib/services/lookupService'
import { useAuthStore } from '@/store/authStore'

export interface ShareTarget {
  id: string
  name: string
  clientId: string
  clientName: string
  sharedWithClient: boolean
  supplierId: string
  supplierName: string
  sharedWithSupplier: boolean
}

/**
 * Who should get this document: the client or supplier through their portal, colleagues with a notification,
 * or anyone with a login through a link. Opens after signing and from the Share button.
 */
export default function ShareDocumentDialog({ doc, justSigned, canChangeSharing, onClose, onChanged }: {
  doc: ShareTarget; justSigned?: boolean; canChangeSharing: boolean; onClose: () => void; onChanged: () => void
}) {
  const lookups = useLookups()
  const me = useAuthStore(s => s.user)
  const [client, setClient] = useState(doc.sharedWithClient)
  const [supplier, setSupplier] = useState(doc.sharedWithSupplier)
  const [picked, setPicked] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(0)

  const people = lookups.users.filter(u => u.id !== me?.id && !['CUSTOMER', 'SUPPLIER'].includes(u.role))
    .filter(u => !q.trim() || u.name.toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))

  const setPortal = async (kind: 'client' | 'supplier', on: boolean) => {
    try {
      await documentService.update(doc.id, kind === 'client' ? { sharedWithClient: on } : { sharedWithSupplier: on })
      if (kind === 'client') setClient(on); else setSupplier(on)
      toast.success(on ? `Shared with ${kind === 'client' ? doc.clientName : doc.supplierName}` : 'Sharing turned off')
      onChanged()
    } catch (e) { toast.error(apiError(e, 'Could not change sharing')) }
  }

  const send = async () => {
    setBusy(true)
    try {
      const r = await documentService.share(doc.id, picked, message.trim())
      toast.success(r.message)
      setSent(picked.length); setPicked([]); setMessage('')
    } catch (e) { toast.error(apiError(e, 'Could not share the document')) } finally { setBusy(false) }
  }

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/documents?doc=${doc.id}`); toast.success('Link copied. It opens for colleagues who are logged in.') }
    catch { toast.error('Could not copy the link') }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            {justSigned && <p className="text-sm font-medium text-green-700 flex items-center gap-1.5 mb-0.5"><CheckCircle2 className="w-4 h-4" /> Document signed and saved</p>}
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Share2 className="w-5 h-5 text-santech-600" /> {justSigned ? 'Share it with the people who need it' : 'Share this document'}</h3>
            <p className="text-xs text-gray-500 truncate">{doc.name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {(doc.clientId || doc.supplierId) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">Outside Santech (they download it in their portal)</p>
              {doc.clientId && (
                <label className={cn('flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm', !canChangeSharing && 'opacity-60')}>
                  <input type="checkbox" checked={client} disabled={!canChangeSharing} onChange={e => setPortal('client', e.target.checked)} />
                  <Building2 className="w-4 h-4 text-sky-600" /> <span>Client: <b>{doc.clientName}</b></span>
                </label>
              )}
              {doc.supplierId && (
                <label className={cn('flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm', !canChangeSharing && 'opacity-60')}>
                  <input type="checkbox" checked={supplier} disabled={!canChangeSharing} onChange={e => setPortal('supplier', e.target.checked)} />
                  <Truck className="w-4 h-4 text-amber-600" /> <span>Supplier: <b>{doc.supplierName}</b></span>
                </label>
              )}
              {!canChangeSharing && <p className="text-[11px] text-gray-400">Only the person who added the document or an admin can change this.</p>}
            </div>
          )}
          {!doc.clientId && !doc.supplierId && (
            <p className="text-xs text-gray-500 rounded-lg bg-gray-50 px-3 py-2">This document is not linked to a client or supplier, so it cannot go to a portal. Link one with Edit if it should.</p>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">Colleagues (they get a notification, and an email when emailing is on)</p>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
              {people.length === 0 ? <p className="p-3 text-xs text-gray-400">Nobody found.</p> : people.map(u => (
                <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={picked.includes(u.id)} onChange={() => toggle(u.id)} />
                  <span className="flex-1 truncate">{u.name}</span>
                  <span className="text-[11px] text-gray-400">{u.role.replace(/_/g, ' ').toLowerCase()}</span>
                </label>
              ))}
            </div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} maxLength={300} placeholder="Message (optional), for example: please countersign"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none" />
            <div className="flex items-center gap-3">
              <button onClick={send} disabled={!picked.length || busy}
                className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Send to {picked.length || ''} {picked.length === 1 ? 'person' : 'people'}
              </button>
              {sent > 0 && <span className="text-xs text-green-700">Sent to {sent}</span>}
            </div>
          </div>

          <button onClick={copyLink} className="flex items-center gap-2 text-sm text-santech-700 hover:underline"><Link2 className="w-4 h-4" /> Copy link (for colleagues who are logged in)</button>
        </div>

        <div className="flex justify-end px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Done</button>
        </div>
      </div>
    </div>
  )
}
