import api from '../api'

export type SignatureKind = 'SIGNATURE' | 'INITIALS' | 'STAMP'

export interface SavedSignature {
  id: string
  kind: SignatureKind
  name: string
  width: number
  height: number
  isDefault: boolean
  /** true for the company stamp (cachet), shared by every staff member */
  shared: boolean
  dataUrl: string
}

/** Where one image sits on a page: fractions (0–1) of the page, from its top-left corner */
export interface Placement { signatureId: string; page: number; x: number; y: number; w: number; h: number }

export const signatureService = {
  list: async (): Promise<SavedSignature[]> => (await api.get('/signatures')).data.data,
  create: async (body: { kind: SignatureKind; name: string; dataUrl: string; width: number; height: number }): Promise<SavedSignature> =>
    (await api.post('/signatures', body)).data.data,
  update: async (id: string, body: { name?: string; isDefault?: boolean }) => (await api.put(`/signatures/${id}`, body)).data,
  remove: async (id: string) => (await api.delete(`/signatures/${id}`)).data,
  sign: async (body: { fileId: string; placements: Placement[]; password: string; contractId?: string; signatoryName?: string }) =>
    (await api.post('/signatures/sign', body)).data.data as { id: string; name: string; size: number; mimeType: string; url: string },
}
