import { useCallback, useEffect, useRef, useState } from 'react'
import { PenLine, Plus, Trash2, Star, Upload, Type, Pencil, X, Stamp } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { apiError } from '@/lib/services/lookupService'
import { signatureService, type SavedSignature, type SignatureKind } from '@/lib/services/signatureService'
import { fileToDataUrl, imageHasTransparency, processImage, trimCanvas, typedSignature, type ProcessedImage } from '@/lib/signatureImage'
import { useAuthStore } from '@/store/authStore'

const CHECKER = 'bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%),linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] bg-white'
const FONTS = ['"Segoe Script","Brush Script MT",cursive', '"Lucida Handwriting","Apple Chancery",cursive', '"Ink Free","Comic Sans MS",cursive']

/** Saved signatures, initials and the company stamp (cachet): saved once, placed on documents when signing */
export default function SignatureLibrary() {
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(useAuthStore(s => s.user?.role ?? ''))
  const [items, setItems] = useState<SavedSignature[] | null>(null)
  const [adding, setAdding] = useState<SignatureKind | null>(null)

  const load = useCallback(() => { signatureService.list().then(setItems).catch(e => toast.error(apiError(e))) }, [])
  useEffect(load, [load])

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); load() } catch (e) { toast.error(apiError(e)) }
  }
  const mine = items?.filter(i => !i.shared) ?? []
  const stamps = items?.filter(i => i.shared) ?? []

  return (
    <div className="bms-card p-5 space-y-5">
      <div>
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><PenLine className="w-5 h-5 text-santech-600" /> My signatures</h2>
        <p className="text-xs text-gray-500 mt-1">Save your signature or initials once. When you sign a document you pick one here and place it where it belongs, so you never upload it again.</p>
      </div>

      {!items ? <p className="text-sm text-gray-400">Loading…</p> : (
        <>
          <Grid list={mine} empty="You have not saved a signature yet."
            onDefault={s => run(() => signatureService.update(s.id, { isDefault: true }), 'Default signature changed')}
            onDelete={s => window.confirm(`Delete "${s.name}"?`) && run(() => signatureService.remove(s.id), 'Deleted')} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setAdding('SIGNATURE')} className="flex items-center gap-1.5 px-3 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700"><Plus className="w-4 h-4" /> Add signature</button>
            <button onClick={() => setAdding('INITIALS')} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"><Plus className="w-4 h-4" /> Add initials</button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Stamp className="w-4 h-4 text-santech-600" /> Company stamp (cachet)</h3>
            <p className="text-xs text-gray-500 mb-3">Shared with every staff member who signs documents. Only an admin can add or remove it.</p>
            <Grid list={stamps} empty="No company stamp saved yet." onDelete={isAdmin ? s => window.confirm(`Delete "${s.name}"?`) && run(() => signatureService.remove(s.id), 'Deleted') : undefined} />
            {isAdmin && <button onClick={() => setAdding('STAMP')} className="mt-3 flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"><Plus className="w-4 h-4" /> Add company stamp</button>}
          </div>
        </>
      )}
      {adding && <AddSignatureDialog kind={adding} onClose={() => setAdding(null)} onSaved={() => { setAdding(null); load() }} />}
    </div>
  )
}

function Grid({ list, empty, onDefault, onDelete }: { list: SavedSignature[]; empty: string; onDefault?: (s: SavedSignature) => void; onDelete?: (s: SavedSignature) => void }) {
  if (!list.length) return <p className="text-sm text-gray-400">{empty}</p>
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map(s => (
        <div key={s.id} className="border border-gray-200 rounded-lg p-2">
          <div className={cn('h-24 rounded flex items-center justify-center', CHECKER)}><img src={s.dataUrl} alt={s.name} className="max-h-20 max-w-full object-contain" /></div>
          <div className="flex items-center gap-1 mt-2">
            <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">{s.name}<span className="ml-1 text-gray-400">· {s.kind === 'INITIALS' ? 'initials' : s.kind === 'STAMP' ? 'stamp' : 'signature'}</span></span>
            {onDefault && (s.isDefault
              ? <span title="Default" className="p-1 text-amber-500"><Star className="w-4 h-4 fill-current" /></span>
              : <button onClick={() => onDefault(s)} title="Make default" className="p-1 text-gray-300 hover:text-amber-500"><Star className="w-4 h-4" /></button>)}
            {onDelete && <button onClick={() => onDelete(s)} title="Delete" className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
          </div>
        </div>
      ))}
    </div>
  )
}

export type Mode = 'upload' | 'draw' | 'type'

/** Add a signature, initials or stamp by uploading a picture, drawing it or typing a name. Also used on the signing screen. */
export function AddSignatureDialog({ kind, onClose, onSaved, initialFile, initialMode = 'upload', saveLabel = 'Save' }: {
  kind: SignatureKind; onClose: () => void; onSaved: (s: SavedSignature) => void; initialFile?: File; initialMode?: Mode; saveLabel?: string
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [image, setImage] = useState<ProcessedImage | null>(null)
  const [busy, setBusy] = useState(false)
  const label = kind === 'STAMP' ? 'company stamp' : kind === 'INITIALS' ? 'initials' : 'signature'

  const save = async () => {
    if (!image) return
    setBusy(true)
    try {
      const created = await signatureService.create({ kind, name: name.trim(), ...image })
      toast.success('Saved')
      onSaved(created)
    } catch (e) { toast.error(apiError(e)) } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Add {label}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([['upload', 'Upload picture', Upload], ['draw', 'Draw', Pencil], ['type', 'Type name', Type]] as const)
              .filter(([m]) => kind !== 'STAMP' || m === 'upload')
              .map(([m, text, Icon]) => (
                <button key={m} onClick={() => { setMode(m); setImage(null) }}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm', mode === m ? 'bg-white shadow-sm text-santech-700 font-medium' : 'text-gray-500')}>
                  <Icon className="w-4 h-4" /> {text}
                </button>
              ))}
          </div>

          {mode === 'upload' && <UploadPane kind={kind} onImage={setImage} initialFile={initialFile} />}
          {mode === 'draw' && <DrawPane onImage={setImage} />}
          {mode === 'type' && <TypePane onImage={setImage} />}

          {image && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Preview (the checkered part is see-through)</p>
              <div className={cn('h-28 rounded-lg border border-gray-200 flex items-center justify-center', CHECKER)}><img src={image.dataUrl} alt="Preview" className="max-h-24 max-w-full object-contain" /></div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name (to recognise it later)</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder={kind === 'STAMP' ? 'e.g. Santech official stamp' : 'e.g. My signature'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={!image || busy} className="px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">{busy ? 'Saving…' : saveLabel}</button>
        </div>
      </div>
    </div>
  )
}

function UploadPane({ kind, onImage, initialFile }: { kind: SignatureKind; onImage: (i: ProcessedImage | null) => void; initialFile?: File }) {
  const [src, setSrc] = useState<string | null>(null)
  const [removeWhite, setRemoveWhite] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!src) return
    processImage(src, { removeWhite, maxW: kind === 'STAMP' ? 450 : 700, maxH: kind === 'STAMP' ? 450 : 350 })
      .then(i => { setError(''); onImage(i) })
      .catch(e => { setError(e.message); onImage(null) })
  }, [src, removeWhite, kind, onImage])

  const pick = async (file?: File) => {
    if (!file) return
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) { setError('Choose a PNG or JPG picture'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Choose a picture smaller than 5 MB'); return }
    const url = await fileToDataUrl(file)
    // A cut-out PNG keeps its background; a photo or scan gets its paper removed
    setRemoveWhite(!(file.type === 'image/png' && await imageHasTransparency(url).catch(() => false)))
    setSrc(url)
  }
  // A picture chosen, dropped or pasted on the signing screen opens straight in the preview
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialFile) pick(initialFile) }, [])

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 py-6 text-sm text-gray-600 hover:bg-gray-50">
        <Upload className="w-5 h-5" />
        <span>{src ? 'Choose another picture' : 'Choose a PNG or JPG from your computer'}</span>
        <span className="text-xs text-gray-400">A photo or scan of your signature on white paper works too</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => pick(e.target.files?.[0])} />
      </label>
      {src && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={removeWhite} onChange={e => setRemoveWhite(e.target.checked)} />
          Remove the paper background
        </label>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

function DrawPane({ onImage }: { onImage: (i: ProcessedImage | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * ref.current!.width, y: ((e.clientY - r.top) / r.height) * ref.current!.height }
  }
  const down = (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; last.current = pos(e) }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return
    const ctx = ref.current!.getContext('2d')!
    const p = pos(e)
    ctx.strokeStyle = '#0b1f44'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke()
    last.current = p
  }
  const up = () => {
    drawing.current = false; last.current = null
    try { onImage(trimCanvas(ref.current!, 8)) } catch { onImage(null) }
  }
  const clear = () => { ref.current!.getContext('2d')!.clearRect(0, 0, 900, 300); onImage(null) }

  return (
    <div className="space-y-2">
      <canvas ref={ref} width={900} height={300} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className="w-full h-auto rounded-lg border border-gray-300 bg-white touch-none cursor-crosshair" />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Draw with the mouse, a finger or a pen.</p>
        <button type="button" onClick={clear} className="text-xs text-santech-700 hover:underline">Clear</button>
      </div>
    </div>
  )
}

function TypePane({ onImage }: { onImage: (i: ProcessedImage | null) => void }) {
  const [text, setText] = useState('')
  const [font, setFont] = useState(0)
  useEffect(() => {
    const t = text.trim()
    if (!t) { onImage(null); return }
    try { onImage(typedSignature(t, FONTS[font])) } catch { onImage(null) }
  }, [text, font, onImage])
  return (
    <div className="space-y-3">
      <input value={text} onChange={e => setText(e.target.value)} maxLength={40} placeholder="Type your full name"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
      <div className="flex gap-2">
        {FONTS.map((f, i) => (
          <button key={f} type="button" onClick={() => setFont(i)} style={{ fontFamily: f }}
            className={cn('flex-1 py-2 rounded-lg border text-lg italic truncate px-2', font === i ? 'border-santech-500 bg-santech-50 text-santech-800' : 'border-gray-200 text-gray-600')}>
            {text.trim() || 'Signature'}
          </button>
        ))}
      </div>
    </div>
  )
}
