import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { X, Upload, Trash2, PenLine, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { apiError } from '@/lib/services/lookupService'
import { fileService } from '@/lib/services/fileService'
import { signatureService, type SavedSignature } from '@/lib/services/signatureService'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export interface SignedFile { id: string; name: string; size: number; mimeType: string; url: string }

interface Props {
  /** The document to sign. Without it the dialog first asks for a PDF or picture. */
  fileId?: string
  fileName?: string
  /** Signing a contract: which signatory you sign as is recorded on the contract */
  contract?: { id: string; number: string; signatories: string[]; defaultSignatory?: string }
  onClose: () => void
  onSigned: (file: SignedFile) => void
}

interface PageSize { w: number; h: number }
interface Item { key: number; sig: SavedSignature; page: number; x: number; y: number; w: number; h: number }

const START_WIDTH: Record<string, number> = { SIGNATURE: 0.28, INITIALS: 0.12, STAMP: 0.22 }
let nextKey = 1

/**
 * Sign a PDF or picture inside the system: open it, pick a saved signature / initials / company stamp,
 * drag it where it belongs, resize it, then sign with your password. Nothing is printed or re-uploaded.
 */
export default function SignDocumentDialog({ fileId, fileName, contract, onClose, onSigned }: Props) {
  const [docId, setDocId] = useState<string | undefined>(fileId)
  const [docName, setDocName] = useState(fileName ?? 'Document')
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [pages, setPages] = useState<PageSize[]>([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)

  const [sigs, setSigs] = useState<SavedSignature[] | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [password, setPassword] = useState('')
  const [signatory, setSignatory] = useState(contract?.defaultSignatory ?? contract?.signatories[0] ?? '')
  const [signing, setSigning] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [viewW, setViewW] = useState(760)

  useEffect(() => { signatureService.list().then(setSigs).catch(e => toast.error(apiError(e))) }, [])

  // Page width follows the window
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const fit = () => setViewW(Math.max(280, Math.min(860, el.clientWidth - 32)))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [docId])

  // Load the document (PDF pages, or one picture)
  useEffect(() => {
    if (!docId) return
    let cancelled = false
    setLoading(true); setLoadError(''); setPdf(null); setImageUrl(null); setPages([]); setItems([])
    ;(async () => {
      try {
        const res = await api.get(`/files/${docId}`, { responseType: 'arraybuffer' })
        const type = String(res.headers['content-type'] ?? '')
        if (type.includes('pdf')) {
          const doc = await pdfjs.getDocument({ data: new Uint8Array(res.data as ArrayBuffer) }).promise
          const sizes: PageSize[] = []
          for (let i = 1; i <= doc.numPages; i++) { const v = (await doc.getPage(i)).getViewport({ scale: 1 }); sizes.push({ w: v.width, h: v.height }) }
          if (!cancelled) { setPdf(doc); setPages(sizes) }
        } else if (/^image\/(png|jpe?g)/.test(type)) {
          const url = URL.createObjectURL(new Blob([res.data as ArrayBuffer], { type }))
          const img = new Image()
          await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('x')); img.src = url })
          if (!cancelled) { setImageUrl(url); setPages([{ w: img.naturalWidth, h: img.naturalHeight }]) }
        } else {
          if (!cancelled) setLoadError('Only PDF and PNG / JPG documents can be signed here. Save a Word file as PDF first, then choose it again.')
        }
      } catch (e) {
        if (!cancelled) setLoadError(apiError(e, 'This document could not be opened. It may be damaged or password protected.'))
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [docId])

  const pickFile = async (file?: File) => {
    if (!file) return
    setLoading(true)
    try {
      const up = await fileService.upload(file)
      setDocName(up.name); setDocId(up.id)
    } catch (e) { toast.error(apiError(e, e instanceof Error ? e.message : 'Upload failed')); setLoading(false) }
  }

  /** The page the person is looking at (the one with most of it on screen) */
  const visiblePage = () => {
    const box = scrollRef.current?.getBoundingClientRect()
    let best = 0, bestVisible = -1
    pageRefs.current.forEach((el, i) => {
      if (!el || !box) return
      const r = el.getBoundingClientRect()
      const visible = Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top)
      if (visible > bestVisible) { bestVisible = visible; best = i }
    })
    return best
  }

  const addItem = (sig: SavedSignature) => {
    const pageIndex = visiblePage()
    const size = pages[pageIndex]
    const el = pageRefs.current[pageIndex]
    if (!size || !el) return
    const w = START_WIDTH[sig.kind] ?? 0.2
    const pxW = el.clientWidth, pxH = el.clientHeight
    const h = (w * pxW * (sig.height / sig.width)) / pxH
    // drop it in the middle of what is on screen
    const box = scrollRef.current!.getBoundingClientRect(), r = el.getBoundingClientRect()
    const centerY = (Math.min(r.bottom, box.bottom) + Math.max(r.top, box.top)) / 2
    const y = Math.min(Math.max((centerY - r.top) / r.height - h / 2, 0.02), 1 - h - 0.02)
    const item: Item = { key: nextKey++, sig, page: pageIndex + 1, x: 0.5 - w / 2, y, w, h }
    setItems(prev => [...prev, item]); setSelected(item.key)
  }

  const patch = (key: number, p: Partial<Item>) => setItems(prev => prev.map(i => (i.key === key ? { ...i, ...p } : i)))

  const sign = async () => {
    if (!docId || !items.length) return
    setSigning(true)
    try {
      const file = await signatureService.sign({
        fileId: docId, password,
        placements: items.map(i => ({ signatureId: i.sig.id, page: i.page, x: i.x, y: i.y, w: i.w, h: i.h })),
        ...(contract ? { contractId: contract.id, signatoryName: signatory } : {}),
      })
      toast.success('Document signed')
      onSigned(file)
    } catch (e) { toast.error(apiError(e, 'Could not sign the document')) } finally { setSigning(false) }
  }

  const needsFile = !docId
  const ready = pages.length > 0

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><PenLine className="w-5 h-5 text-santech-600" /> Sign document</h3>
            <p className="text-xs text-gray-500 truncate">{contract ? `Contract ${contract.number} · ` : ''}{needsFile ? 'Choose the document' : docName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {needsFile ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <label className="w-full max-w-md flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 text-center text-gray-600 hover:bg-gray-50">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              <span className="text-sm font-medium">Choose the document to sign</span>
              <span className="text-xs text-gray-400">PDF or PNG / JPG, up to 5 MB. A Word file must be saved as PDF first.</span>
              <input type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
            </label>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto bg-gray-200 p-4" onPointerDown={() => setSelected(null)}>
              {loading && <p className="text-center text-sm text-gray-500 py-10"><Loader2 className="inline w-4 h-4 animate-spin mr-2" />Opening the document…</p>}
              {loadError && (
                <div className="max-w-md mx-auto bg-white rounded-lg p-5 text-sm text-red-600 text-center">
                  {loadError}
                  <button onClick={() => { setDocId(undefined); setLoadError('') }} className="block mx-auto mt-3 text-santech-700 hover:underline">Choose another document</button>
                </div>
              )}
              {ready && pages.map((size, i) => {
                const pxH = (viewW * size.h) / size.w
                return (
                  <div key={i} ref={el => { pageRefs.current[i] = el }} className="relative mx-auto mb-4 bg-white shadow select-none" style={{ width: viewW, height: pxH }}>
                    {pdf ? <PdfPage pdf={pdf} number={i + 1} width={viewW} /> : <img src={imageUrl!} alt="" draggable={false} className="absolute inset-0 w-full h-full" />}
                    {items.filter(it => it.page === i + 1).map(it => (
                      <Placed key={it.key} item={it} pageEl={() => pageRefs.current[i]} selected={selected === it.key}
                        onSelect={() => setSelected(it.key)} onChange={p => patch(it.key, p)}
                        onRemove={() => { setItems(prev => prev.filter(x => x.key !== it.key)); setSelected(null) }} />
                    ))}
                    <span className="absolute bottom-1 right-2 text-[10px] text-gray-400">Page {i + 1} of {pages.length}</span>
                  </div>
                )
              })}
            </div>

            <aside className="w-full md:w-72 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-100 p-4 overflow-y-auto space-y-4 max-h-[40vh] md:max-h-none">
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">1. Add to the document</p>
                {!sigs ? <p className="text-xs text-gray-400">Loading…</p> : sigs.length === 0 ? (
                  <p className="text-xs text-gray-500">You have no saved signature yet. <Link to="/profile" className="text-santech-700 hover:underline">Save one in My Profile</Link>, then come back.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {sigs.map(s => (
                      <button key={s.id} onClick={() => addItem(s)} disabled={!ready} title={`Add ${s.name}`}
                        className="border border-gray-200 rounded-lg p-1.5 hover:border-santech-400 hover:bg-santech-50 disabled:opacity-40 text-left">
                        <div className="h-14 flex items-center justify-center bg-white rounded"><img src={s.dataUrl} alt={s.name} className="max-h-12 max-w-full object-contain" /></div>
                        <p className="text-[11px] text-gray-600 truncate mt-1">{s.name}</p>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-2">Click one to put it on the page. Drag it into place, pull the corner to resize.</p>
              </div>

              {items.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">On the document ({items.length})</p>
                  <ul className="space-y-1">
                    {items.map(it => (
                      <li key={it.key} onClick={() => setSelected(it.key)} className={cn('flex items-center gap-2 rounded px-2 py-1 text-xs cursor-pointer', selected === it.key ? 'bg-santech-50' : 'hover:bg-gray-50')}>
                        <img src={it.sig.dataUrl} alt="" className="h-5 w-10 object-contain" />
                        <span className="flex-1 truncate text-gray-700">{it.sig.name} · page {it.page}</span>
                        <button onClick={e => { e.stopPropagation(); setItems(prev => prev.filter(x => x.key !== it.key)) }} className="text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">2. Confirm and sign</p>
                {contract && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Signing as</label>
                    <select value={signatory} onChange={e => setSignatory(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
                      {contract.signatories.map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                )}
                <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
                <button onClick={sign} disabled={!items.length || !password || signing || (!!contract && !signatory)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
                  {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} {signing ? 'Signing…' : 'Sign document'}
                </button>
                <p className="text-[11px] text-gray-400">A signed copy is created with a certificate page (who, when, fingerprint). The original stays unchanged.</p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

/** One PDF page drawn on a canvas */
function PdfPage({ pdf, number, width }: { pdf: PDFDocumentProxy; number: number; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let task: { cancel: () => void } | null = null
    let dead = false
    ;(async () => {
      const page = await pdf.getPage(number)
      const base = page.getViewport({ scale: 1 })
      const scale = width / base.width
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const vp = page.getViewport({ scale: scale * ratio })
      const canvas = ref.current
      if (!canvas || dead) return
      canvas.width = vp.width; canvas.height = vp.height
      const render = page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp })
      task = render
      await render.promise.catch(() => undefined)
    })()
    return () => { dead = true; task?.cancel() }
  }, [pdf, number, width])
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />
}

/** A signature on a page: drag to move, pull the corner to resize */
function Placed({ item, pageEl, selected, onSelect, onChange, onRemove }: {
  item: Item; pageEl: () => HTMLDivElement | null; selected: boolean; onSelect: () => void; onChange: (p: Partial<Item>) => void; onRemove: () => void
}) {
  const drag = useRef<{ mode: 'move' | 'resize'; sx: number; sy: number; x: number; y: number; w: number } | null>(null)
  const aspect = item.sig.height / item.sig.width

  const start = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.stopPropagation(); onSelect()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { mode, sx: e.clientX, sy: e.clientY, x: item.x, y: item.y, w: item.w }
  }
  const move = useCallback((e: React.PointerEvent) => {
    const d = drag.current, el = pageEl()
    if (!d || !el) return
    const pw = el.clientWidth, ph = el.clientHeight
    const dx = (e.clientX - d.sx) / pw, dy = (e.clientY - d.sy) / ph
    if (d.mode === 'move') {
      onChange({ x: Math.min(Math.max(d.x + dx, 0), 1 - item.w), y: Math.min(Math.max(d.y + dy, 0), 1 - item.h) })
    } else {
      const w = Math.min(Math.max(d.w + dx, 0.04), 1 - item.x)
      const h = (w * pw * aspect) / ph
      if (item.y + h <= 1) onChange({ w, h })
    }
  }, [pageEl, onChange, item.w, item.h, item.x, item.y, aspect])
  const end = () => { drag.current = null }

  return (
    <div onPointerDown={start('move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      className={cn('absolute touch-none cursor-move', selected ? 'outline outline-2 outline-santech-500' : 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-santech-400')}
      style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.w * 100}%`, height: `${item.h * 100}%` }}>
      <img src={item.sig.dataUrl} alt={item.sig.name} draggable={false} className="w-full h-full pointer-events-none" />
      {selected && (
        <>
          <button onPointerDown={e => e.stopPropagation()} onClick={onRemove} title="Remove" className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow"><X className="w-3.5 h-3.5" /></button>
          <div onPointerDown={start('resize')} onPointerMove={move} onPointerUp={end} title="Drag to resize" className="absolute -bottom-2 -right-2 w-4 h-4 rounded-sm bg-santech-600 border-2 border-white cursor-nwse-resize" />
        </>
      )}
    </div>
  )
}
