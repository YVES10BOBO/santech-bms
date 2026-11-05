import { useCallback } from 'react'
import { portalAdminService } from '@/lib/services/operationsService'
import { Conversation, type Message } from '@/pages/portal/PortalShell'

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The replies between the support team and the customer on one ticket (the customer sees them in the portal) */
export default function TicketConversation({ ticketId, canReply }: { ticketId: string; canReply: boolean }) {
  const load = useCallback(async () => ((await portalAdminService.ticketMessages(ticketId)) as any).data as Message[], [ticketId])
  const send = useCallback(async (body: string) => ((await portalAdminService.replyOnTicket(ticketId, body)) as any).data as Message, [ticketId])
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">Conversation with the customer</p>
      <Conversation key={ticketId} load={load} send={send} canSend={canReply} mine="santech" placeholder="Reply to the customer (they see it in their portal)…" />
    </div>
  )
}
