/**
 * Turns a picture of a signature or stamp into a small PNG with a transparent background, ready to place on a
 * document. All of it happens in the browser, so the server only stores the finished PNG.
 */

export interface ProcessedImage { dataUrl: string; width: number; height: number }

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('This file is not a readable image'))
  img.src = src
})

export const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result))
  r.onerror = () => reject(r.error)
  r.readAsDataURL(file)
})

/** Does the picture already have a see-through background (a PNG cut-out)? */
export function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const { width, height } = canvas
  const px = canvas.getContext('2d')!.getImageData(0, 0, width, height).data
  for (let i = 3; i < px.length; i += 4 * 17) if (px[i] < 250) return true
  return false
}

/**
 * Draws the image on a canvas (at most `maxW` x `maxH`), optionally makes white/light paper see-through,
 * trims the empty edges and returns a PNG.
 */
export async function processImage(src: string, opts: { removeWhite: boolean; maxW?: number; maxH?: number }): Promise<ProcessedImage> {
  const img = await loadImage(src)
  const maxW = opts.maxW ?? 700, maxH = opts.maxH ?? 350
  const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = data.data
  if (opts.removeWhite) {
    // The paper colour is what the edges of the picture mostly are (white, light blue, grey…).
    // Pixels close to it become see-through; ink keeps its colour.
    const bg = paperColour(px, canvas.width, canvas.height)
    for (let i = 0; i < px.length; i += 4) {
      const d = Math.hypot(px[i] - bg[0], px[i + 1] - bg[1], px[i + 2] - bg[2])
      const ink = Math.min(1, Math.max(0, (d - 28) / 60))
      px[i + 3] = Math.round(px[i + 3] * ink)
    }
    ctx.putImageData(data, 0, 0)
  }
  return trimCanvas(canvas)
}

/** Median colour of the picture's border: the paper the signature was written on */
function paperColour(px: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const r: number[] = [], g: number[] = [], b: number[] = []
  const take = (x: number, y: number) => { const i = (y * w + x) * 4; r.push(px[i]); g.push(px[i + 1]); b.push(px[i + 2]) }
  const step = Math.max(1, Math.floor((w + h) / 400))
  for (let x = 0; x < w; x += step) { take(x, 0); take(x, h - 1) }
  for (let y = 0; y < h; y += step) { take(0, y); take(w - 1, y) }
  const med = (a: number[]) => a.sort((p, q) => p - q)[Math.floor(a.length / 2)] ?? 255
  return [med(r), med(g), med(b)]
}

/** Does this picture already have a see-through background (a cut-out PNG)? */
export async function imageHasTransparency(src: string): Promise<boolean> {
  const im = await loadImage(src)
  const c = document.createElement('canvas')
  c.width = Math.min(im.naturalWidth, 400); c.height = Math.max(1, Math.round(im.naturalHeight * (c.width / im.naturalWidth)))
  c.getContext('2d', { willReadFrequently: true })!.drawImage(im, 0, 0, c.width, c.height)
  return hasTransparency(c)
}

/** Cuts away the empty (transparent) margin around the drawing, keeping a small border */
export function trimCanvas(canvas: HTMLCanvasElement, pad = 4): ProcessedImage {
  const { width, height } = canvas
  const px = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height).data
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (px[(y * width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) throw new Error('The image looks empty. Try again without removing the background.')
  const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad)
  const w = Math.min(width, maxX + pad + 1) - x0, h = Math.min(height, maxY + pad + 1) - y0
  const out = document.createElement('canvas')
  out.width = w; out.height = h
  out.getContext('2d')!.drawImage(canvas, x0, y0, w, h, 0, 0, w, h)
  return { dataUrl: out.toDataURL('image/png'), width: w, height: h }
}

/** A typed name written in a handwriting-style font */
export function typedSignature(text: string, font: string): ProcessedImage {
  const canvas = document.createElement('canvas')
  canvas.width = 900; canvas.height = 220
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#0b1f44'
  ctx.font = `italic 96px ${font}`
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 24, 110, 850)
  return trimCanvas(canvas, 8)
}
