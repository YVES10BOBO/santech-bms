/**
 * Has a quotation been approved by management, and by whom? Read from its approval history:
 * the event with status APPROVED (the CEO's decision) is the final approval.
 */
interface Event { status?: string; action?: string; actor?: string; createdAt?: string }

const APPROVED_STATES = ['APPROVED', 'SENT', 'VIEWED', 'NEGOTIATION', 'ACCEPTED', 'CONVERTED']

export interface QuotationApproval { approved: boolean; rejected: boolean; by: string | null; at: string | null }

export function quotationApproval(q: { status: string; approvalHistory: unknown }): QuotationApproval {
  const history = (Array.isArray(q.approvalHistory) ? q.approvalHistory : []) as Event[]
  const ev = [...history].reverse().find(e => e.action === 'APPROVED' && e.status === 'APPROVED')
  const approved = APPROVED_STATES.includes(q.status) || (['EXPIRED', 'REJECTED'].includes(q.status) && !!ev)
  return { approved, rejected: q.status === 'REJECTED' && !ev, by: approved ? ev?.actor ?? null : null, at: approved ? ev?.createdAt ?? null : null }
}
