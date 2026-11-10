import { useCallback, useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { X, Upload, Trash2, PenLine, Loader2, ShieldCheck, FileText, ImagePlus, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { apiError } from '@/lib/services/lookupService'
import { fileService } from '@/lib/services/fileService'
import { signatureService, type SavedSignature } from '@/lib/services/signatureService'
import { AddSignatureDialog, type Mode as AddMode } from './SignatureLibrary'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export interface SignedFile { id: string; name: string; size: number; mimeType: string; url: string }

interface Props {
  /** The document to sign. Without it the dialog first asks for a PDF or picture. */
  fileId?: string
  fileName?: string
  /** Signing a contract: which signatory you sign as is recorded on the contract */
  contract?: { id: string; number: string; signatories: string[]; defaultSignatory?: string }
  /** A document the system can write itself (the contract from its details): offered as the easy choice */
  prepareDocument?: { label: string; hint: string; run: () => Promise<{ id: string; name: string }> }
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
export default function SignDocumentDialog({ fileId, fileName, contract, prepareDocument, onClose, onSigned }: Props) {
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
  // adding a new signature right here: from a picture on this device, a drop or a paste, or drawn
  const [adding, setAdding] = useState<{ mode: AddMode; file?: File; drop?: { page: number; fx: number; fy: number } } | null>(null)

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

  const usePrepared = async () => {
    if (!prepareDocument) return
    setLoading(true)
    try {
      const f = await prepareDocument.run()
      setDocName(f.name); setDocId(f.id)
    } catch (e) { toast.error(apiError(e, 'The document could not be prepared')); setLoading(false) }
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

  /** Puts a signature on a page, centred on a point given as fractions of the page */
  const placeAt = (sig: SavedSignature, pageIndex: number, fx: number, fy: number) => {
    const el = pageRefs.current[pageIndex]
    if (!el) return
    const w = START_WIDTH[sig.kind] ?? 0.2
    const h = (w * el.clientWidth * (sig.height / sig.width)) / el.clientHeight
    const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), Math.max(0, max))
    const item: Item = { key: nextKey++, sig, page: pageIndex + 1, x: clamp(fx - w / 2, 1 - w), y: clamp(fy - h / 2, 1 - h), w, h }
    setItems(prev => [...prev, item]); setSelected(item.key)
  }

  /** Click on a signature: it goes in the middle of what is on screen */
  const addItem = (sig: SavedSignature) => {
    const pageIndex = visiblePage()
    const el = pageRefs.current[pageIndex]
    if (!el || !scrollRef.current) return
    const box = scrollRef.current.getBoundingClientRect(), r = el.getBoundingClientRect()
    const centerY = (Math.min(r.bottom, box.bottom) + Math.max(r.top, box.top)) / 2
    placeAt(sig, pageIndex, 0.5, (centerY - r.top) / r.height)
  }

  /** Something dropped on a page: one of the signatures on the right, or a picture from the computer */
  const dropOnPage = (e: React.DragEvent, pageIndex: number) => {
    e.preventDefault()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height
    const id = e.dataTransfer.getData('application/x-santech-signature')
    const sig = id && sigs?.find(x => x.id === id)
    if (sig) { placeAt(sig, pageIndex, fx, fy); return }
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (file) setAdding({ mode: 'upload', file, drop: { page: pageIndex, fx, fy } })
  }

  /** A new signature saved on this screen: keep it for next time and put it on the page */
  const saved = (sig: SavedSignature) => {
    const drop = adding?.drop
    setAdding(null)
    setSigs(prev => [...(prev ?? []), sig])
    if (drop) placeAt(sig, drop.page, drop.fx, drop.fy)
    else addItem(sig)
  }

  // Ctrl+V of a picture (for example a signature copied from another file) adds it like an upload
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!pages.length || adding) return
      const file = Array.from(e.clipboardData?.files ?? []).find(f => f.type.startsWith('image/'))
      if (file) { e.preventDefault(); setAdding({ mode: 'upload', file }) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [pages.length, adding])

  // Delete key removes the selected signature (not while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA'
      if (!typing && selected !== null && (e.key === 'Delete' || e.key === 'Backspace')) {
        setItems(prev => prev.filter(x => x.key !== selected)); setSelected(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

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
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            {prepareDocument && (
              <>
                <button onClick={usePrepared} disabled={loading}
                  className="w-full max-w-md flex flex-col items-center gap-2 rounded-xl border-2 border-santech-500 bg-santech-50 px-6 py-8 text-center text-santech-800 hover:bg-santech-100 disabled:opacity-60">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
                  <span className="text-sm font-semibold">{prepareDocument.label}</span>
                  <span className="text-xs text-santech-700">{prepareDocument.hint}</span>
                </button>
                <p className="text-xs text-gray-400">or</p>
              </>
            )}
            <label className="w-full max-w-md flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 text-center text-gray-600 hover:bg-gray-50">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              <span className="text-sm font-medium">{prepareDocument ? 'Upload your own file instead' : 'Choose the document to sign'}</span>
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
                  <div key={i} ref={el => { pageRefs.current[i] = el }} className="relative mx-auto mb-4 bg-white shadow select-none" style={{ width: viewW, height: pxH }}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }} onDrop={e => dropOnPage(e, i)}>
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
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <label className={cn('flex items-center justify-center gap-1.5 rounded-lg bg-santech-600 px-2 py-2 text-xs font-medium text-white hover:bg-santech-700 cursor-pointer', !ready && 'opacity-40 pointer-events-none')} title="Insert a picture of your signature or stamp from this device">
                    <ImagePlus className="w-4 h-4" /> Upload picture
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setAdding({ mode: 'upload', file: f }) }} />
                  </label>
                  <button onClick={() => setAdding({ mode: 'draw' })} disabled={!ready}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                    <Pencil className="w-4 h-4" /> Draw / type
                  </button>
                </div>
                {!sigs ? <p className="text-xs text-gray-400">Loading…</p> : sigs.length === 0 ? (
                  <p className="text-xs text-gray-500">No saved signature yet. Upload a picture of it or draw it: it is kept for next time.</p>
                ) : (
                  <>
                    <p className="text-[11px] text-gray-500 mb-1.5">Saved signatures and stamps</p>
                    <div className="grid grid-cols-2 gap-2">
                      {sigs.map(s => (
                        <button key={s.id} onClick={() => addItem(s)} disabled={!ready} title={`Click, or drag it onto the page`}
                          draggable={ready} onDragStart={e => { e.dataTransfer.setData('application/x-santech-signature', s.id); e.dataTransfer.effectAllowed = 'copy' }}
                          className="border border-gray-200 rounded-lg p-1.5 hover:border-santech-400 hover:bg-santech-50 disabled:opacity-40 text-left cursor-grab active:cursor-grabbing">
                          <div className="h-14 flex items-center justify-center bg-white rounded"><img src={s.dataUrl} alt={s.name} draggable={false} className="max-h-12 max-w-full object-contain" /></div>
                          <p className="text-[11px] text-gray-600 truncate mt-1">{s.name}</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="text-[11px] text-gray-400 mt-2">Click a signature or drag it onto the page. Drag it to move it, pull a corner to resize, press Delete to remove it. You can also drop a picture from your computer on the page, or paste one (Ctrl+V).</p>
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

              {prepareDocument && (
                <button onClick={usePrepared} disabled={loading} className="w-full flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-santech-700 hover:bg-santech-50 disabled:opacity-50">
                  <FileText className="w-4 h-4 flex-shrink-0" /> <span className="text-left">Sign the document written by the system instead</span>
                </button>
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
      {adding && (
        <AddSignatureDialog kind="SIGNATURE" initialMode={adding.mode} initialFile={adding.file} saveLabel="Save and place on the page"
          onClose={() => setAdding(null)} onSaved={saved} />
      )}
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

/** A signature on a page: drag to move, pull any corner to resize (it keeps its shape) */
type Corner = 'nw' | 'ne' | 'sw' | 'se'
const CORNERS: { c: Corner; cls: string; cursor: string }[] = [
  { c: 'nw', cls: '-top-2 -left-2', cursor: 'cursor-nwse-resize' },
  { c: 'ne', cls: '-top-2 -right-2', cursor: 'cursor-nesw-resize' },
  { c: 'sw', cls: '-bottom-2 -left-2', cursor: 'cursor-nesw-resize' },
  { c: 'se', cls: '-bottom-2 -right-2', cursor: 'cursor-nwse-resize' },
]

function Placed({ item, pageEl, selected, onSelect, onChange, onRemove }: {
  item: Item; pageEl: () => HTMLDivElement | null; selected: boolean; onSelect: () => void; onChange: (p: Partial<Item>) => void; onRemove: () => void
}) {
  const drag = useRef<{ mode: 'move' | Corner; sx: number; sy: number; x: number; y: number; w: number; h: number } | null>(null)
  const aspect = item.sig.height / item.sig.width

  const start = (mode: 'move' | Corner) => (e: React.PointerEvent) => {
    e.stopPropagation(); onSelect()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { mode, sx: e.clientX, sy: e.clientY, x: item.x, y: item.y, w: item.w, h: item.h }
  }
  const move = useCallback((e: React.PointerEvent) => {
    const d = drag.current, el = pageEl()
    if (!d || !el) return
    e.stopPropagation()
    const pw = el.clientWidth, ph = el.clientHeight
    const dx = (e.clientX - d.sx) / pw, dy = (e.clientY - d.sy) / ph
    if (d.mode === 'move') {
      onChange({ x: Math.min(Math.max(d.x + dx, 0), 1 - d.w), y: Math.min(Math.max(d.y + dy, 0), 1 - d.h) })
      return
    }
    const east = d.mode.includes('e'), north = d.mode.includes('n')
    const w = Math.max(d.w + (east ? dx : -dx), 0.03)
    const h = (w * pw * aspect) / ph
    const x = east ? d.x : d.x + (d.w - w)
    const y = north ? d.y + (d.h - h) : d.y
    if (x < 0 || y < 0 || x + w > 1 || y + h > 1) return
    onChange({ x, y, w, h })
  }, [pageEl, onChange, aspect])
  const end = () => { drag.current = null }

  return (
    <div onPointerDown={start('move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      className={cn('absolute touch-none cursor-move', selected ? 'outline outline-2 outline-santech-500' : 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-santech-400')}
      style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.w * 100}%`, height: `${item.h * 100}%` }}>
      <img src={item.sig.dataUrl} alt={item.sig.name} draggable={false} className="w-full h-full pointer-events-none" />
      {selected && (
        <>
          <button onPointerDown={e => e.stopPropagation()} onClick={onRemove} title="Remove (Delete key)"
            className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-[11px] text-white shadow whitespace-nowrap">
            <X className="w-3 h-3" /> Remove
          </button>
          {CORNERS.map(k => (
            <div key={k.c} onPointerDown={start(k.c)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} title="Drag to resize"
              className={cn('absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-santech-600 shadow', k.cls, k.cursor)} />
          ))}
        </>
      )}
    </div>
  )
}
