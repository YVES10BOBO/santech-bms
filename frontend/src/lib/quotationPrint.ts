/**
 * A quotation prints with the company stamp, the approver's name and a QR code only once management has approved it.
 * Before that it prints with a "NOT APPROVED" mark, so nobody can hand a client an unapproved quotation that looks official.
 */
import api from './api'

interface Event { status?: string; action?: string; actor?: string; createdAt?: string }
export interface PrintApproval { approved: boolean; rejected?: boolean; by?: string; at?: string }

const APPROVED_STATES = ['APPROVED', 'SENT', 'VIEWED', 'NEGOTIATION', 'ACCEPTED', 'CONVERTED']

/** Same rule as the server: the CEO's decision is the history event with status APPROVED */
export function quotationApprovalOf(q: { status: string; approvalHistory?: unknown }): PrintApproval {
  const history = (Array.isArray(q.approvalHistory) ? q.approvalHistory : []) as Event[]
  const ev = [...history].reverse().find(e => e.action === 'APPROVED' && e.status === 'APPROVED')
  const approved = APPROVED_STATES.includes(q.status) || (['EXPIRED', 'REJECTED'].includes(q.status) && !!ev)
  return { approved, rejected: q.status === 'REJECTED' && !ev, by: approved ? ev?.actor : undefined, at: approved ? ev?.createdAt : undefined }
}

/** Fetches the company stamp (a picture), only for an approved quotation. Staff and the client portal use different addresses. */
export const staffStamp = (quotationId: string) => async (): Promise<string | null> =>
  (await api.get(`/quotations/${quotationId}/stamp`)).data.data.dataUrl ?? null
export const portalStamp = (quotationId: string) => async (): Promise<string | null> =>
  (await api.get(`/portal/quotations/${quotationId}/stamp`)).data.data.dataUrl ?? null
