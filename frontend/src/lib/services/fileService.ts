import api from '../api'

export interface UploadedFile { id: string; name: string; size: number; mimeType: string }

const MAX = 5 * 1024 * 1024

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

export const fileService = {
  /** Uploads a file (max 5 MB) and returns its stored id */
  upload: async (file: File): Promise<UploadedFile> => {
    if (file.size > MAX) throw new Error('File is larger than 5 MB')
    const { data } = await api.post('/files', { name: file.name, mimeType: file.type || 'application/octet-stream', base64: await toBase64(file) })
    return data.data
  },
  /** Opens a stored file in a new tab (or downloads it) — sends the login token */
  open: async (id: string, download = false, name = 'file') => {
    const win = download ? null : window.open('', '_blank')
    const res = await api.get(`/files/${id}`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    if (win) win.location.href = url
    else {
      const a = document.createElement('a')
      a.href = url; a.download = name; a.click()
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },
}

export const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
