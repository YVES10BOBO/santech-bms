import React, { useCallback, useEffect, useState } from 'react'
import { Mail, MessageSquare, MessageCircle, Send, Save, RefreshCw, ShieldAlert, CheckCircle2, CircleDashed, ChevronDown, ChevronRight } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { messagingService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Channel = 'EMAIL' | 'SMS' | 'WHATSAPP'
interface ChannelStatus { ready: boolean; provider: string | null; from: string | null; warning?: string | null }
interface Settings { mode: 'TEST' | 'LIVE'; testRecipients: string[]; emailStaff: boolean; emailPortal: boolean }
interface LogRow { id: string; channel: Channel; to: string; subject: string | null; body: string; status: string; provider: string | null; error: string | null; event: string | null; createdAt: string; sentBy: string | null }

const CHANNEL_INFO: Record<Channel, { label: string; icon: typeof Mail; keys: string }> = {
  EMAIL: { label: 'Email', icon: Mail, keys: 'BREVO_API_KEY and MAIL_FROM (or SMTP_USER and SMTP_PASS)' },
  SMS: { label: 'SMS', icon: MessageSquare, keys: 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_SMS_FROM' },
  WHATSAPP: { label: 'WhatsApp', icon: MessageCircle, keys: 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM' },
}
const PROVIDER_NAME: Record<string, string> = { brevo: 'Brevo', smtp: 'SMTP (e.g. Gmail)', twilio: 'Twilio' }
const STATUS_INFO: Record<string, { label: string; cls: string; hint: string }> = {
  SENT: { label: 'Sent', cls: 'bg-green-100 text-green-700', hint: 'Delivered to the provider' },
  HELD: { label: 'Held', cls: 'bg-amber-100 text-amber-700', hint: 'Test mode: not on the test list' },
  NOT_CONFIGURED: { label: 'Not set up', cls: 'bg-gray-100 text-gray-600', hint: 'No provider keys yet, so it was only recorded' },
  FAILED: { label: 'Failed', cls: 'bg-red-100 text-red-700', hint: 'The provider refused it' },
}
const EVENT_LABEL: Record<string, string> = {
  notification: 'Notification', 'portal-login': 'Portal login', 'invoice-reminder': 'Payment reminder', communication: 'Communication log', test: 'Test',
}

export default function MessagingPage() {
  const [data, setData] = useState<{ status: Record<'email' | 'sms' | 'whatsapp', ChannelStatus>; settings: Settings; last30Days: Record<string, number> } | null>(null)
  const [form, setForm] = useState<Settings & { testText: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [test, setTest] = useState<{ channel: Channel; to: string }>({ channel: 'EMAIL', to: '' })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null)
  const [log, setLog] = useState<LogRow[] | null>(null)
  const [filter, setFilter] = useState({ channel: '', status: '', search: '' })
  const [help, setHelp] = useState(false)

  const load = () => messagingService.get()
    .then((r: any) => { setData(r.data); setForm({ ...r.data.settings, testText: r.data.settings.testRecipients.join('\n') }) })
    .catch(err => toast.error(apiError(err, 'Failed to load the email & SMS settings')))
  const loadLog = useCallback(() => {
    messagingService.log(filter).then((r: any) => setLog(r.data ?? [])).catch(err => { setLog([]); toast.error(apiError(err, 'Failed to load the message log')) })
  }, [filter])
  useEffect(() => { load() }, [])
  useEffect(() => { const t = setTimeout(loadLog, filter.search ? 300 : 0); return () => clearTimeout(t) }, [loadLog, filter.search])

  if (!data || !form) return <PageLoader />

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.mode === 'LIVE' && data.settings.mode !== 'LIVE' &&
      !window.confirm('Switch to Live? Every client, supplier and staff member with an email or phone will receive messages. Make sure the demo data is replaced with real contacts first.')) return
    setSaving(true)
    try {
      const r: any = await messagingService.save({ mode: form.mode, testRecipients: form.testText, emailStaff: form.emailStaff, emailPortal: form.emailPortal })
      setData(d => d && { ...d, settings: r.data })
      setForm({ ...r.data, testText: r.data.testRecipients.join('\n') })
      toast.success(r.message)
    } catch (err) { toast.error(apiError(err, 'Failed to save')) } finally { setSaving(false) }
  }

  const sendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setTesting(true)
    try {
      const r: any = await messagingService.test(test.channel, test.to)
      setTestResult({ status: r.data.status, message: r.message })
      ;(r.data.status === 'SENT' ? toast.success : toast.error)(r.message, { duration: 6000 })
      loadLog()
    } catch (err) { toast.error(apiError(err, 'Failed to send the test')) } finally { setTesting(false) }
  }

  const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500'
  const statuses: [Channel, ChannelStatus][] = [['EMAIL', data.status.email], ['SMS', data.status.sms], ['WHATSAPP', data.status.whatsapp]]
  const anyReady = statuses.some(([, s]) => s.ready)
  const counts = data.last30Days

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Email & SMS</h1>
          <p className="text-gray-500 text-sm mt-0.5">Notifications, payment reminders and messages to clients by email, SMS and WhatsApp</p>
        </div>
        <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full', form.mode === 'LIVE' && data.settings.mode === 'LIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
          {data.settings.mode === 'LIVE' ? 'Live: messages go to everyone' : 'Test mode: only the test list receives messages'}
        </span>
      </div>

      {/* What is connected */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '0.75rem' }}>
        {statuses.map(([ch, s]) => {
          const Icon = CHANNEL_INFO[ch].icon
          return (
            <div key={ch} className="bms-card px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Icon className="w-4 h-4 text-santech-600" /> {CHANNEL_INFO[ch].label}</p>
                {s.ready
                  ? <span className="flex items-center gap-1 text-xs font-semibold text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> Connected</span>
                  : <span className="flex items-center gap-1 text-xs font-semibold text-gray-500"><CircleDashed className="w-3.5 h-3.5" /> Not set up</span>}
              </div>
              {s.ready ? (
                <p className="text-xs text-gray-500 mt-1.5">{PROVIDER_NAME[s.provider ?? ''] ?? s.provider} · from <b className="text-gray-700">{s.from}</b></p>
              ) : (
                <p className="text-xs text-gray-500 mt-1.5">Add {CHANNEL_INFO[ch].keys} to the backend settings, then restart it.</p>
              )}
              {s.warning && <p className="text-xs text-red-600 mt-1">{s.warning}</p>}
            </div>
          )
        })}
      </div>

      {!anyReady && (
        <div className="bms-card p-4 flex items-start gap-3 bg-blue-50 border border-blue-100">
          <ShieldAlert className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Nothing is connected yet, so no message leaves the system. Every message it would send is still listed in the log below as
            “Not set up”. Add the keys (see “How to connect”) and they start going out, with no other change.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: '0.75rem', alignItems: 'start' }}>
        {/* Who receives messages */}
        <form onSubmit={save} className="bms-card px-5 py-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Who receives messages</h2>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="radio" name="mode" className="mt-1 accent-santech-600" checked={form.mode === 'TEST'} onChange={() => setForm(f => f && { ...f, mode: 'TEST' })} />
              <span><b>Test mode</b> <span className="text-gray-500">— only the addresses and numbers below receive anything; other messages are held (listed, not sent). Safe while the system has demo data.</span></span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="radio" name="mode" className="mt-1 accent-santech-600" checked={form.mode === 'LIVE'} onChange={() => setForm(f => f && { ...f, mode: 'LIVE' })} />
              <span><b>Live</b> <span className="text-gray-500">— messages go to the real clients, suppliers and staff.</span></span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Test list (one email or phone number per line)</label>
            <textarea rows={3} className={cn(input, 'font-mono text-xs')} value={form.testText} disabled={form.mode === 'LIVE'}
              onChange={e => setForm(f => f && { ...f, testText: e.target.value })} placeholder={'you@example.com\n+250788123456'} />
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="mt-1 accent-santech-600" checked={form.emailStaff} onChange={e => setForm(f => f && { ...f, emailStaff: e.target.checked })} />
            <span>Email staff their notifications <span className="text-gray-500">(task assigned, approvals, expense claims, leave, tickets…)</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="mt-1 accent-santech-600" checked={form.emailPortal} onChange={e => setForm(f => f && { ...f, emailPortal: e.target.checked })} />
            <span>Email customers and suppliers their portal updates <span className="text-gray-500">(new quotation, invoice, contract, document, ticket reply, purchase order)</span></span>
          </label>
          <p className="text-xs text-gray-400">Daily reminders (due invoices, deadlines, renewals) stay in the bell only. Payment reminders to clients are sent from the invoice.</p>
          <button disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </form>

        {/* Test + how to connect */}
        <div className="space-y-3">
          <form onSubmit={sendTest} className="bms-card px-5 py-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">Send a test</h2>
            <div className="flex gap-2 flex-wrap">
              <select className={cn(input, 'w-auto bg-white')} value={test.channel} aria-label="Channel"
                onChange={e => { setTest(t => ({ ...t, channel: e.target.value as Channel })); setTestResult(null) }}>
                <option value="EMAIL">Email</option><option value="SMS">SMS</option><option value="WHATSAPP">WhatsApp</option>
              </select>
              <input className={cn(input, 'flex-1 min-w-[180px]')} value={test.to} onChange={e => setTest(t => ({ ...t, to: e.target.value }))}
                placeholder={test.channel === 'EMAIL' ? 'your@email.com' : '+250 7xx xxx xxx'} aria-label="Send the test to" />
              <button disabled={testing || !test.to.trim()} className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 disabled:opacity-50">
                <Send className="w-4 h-4" /> {testing ? 'Sending…' : 'Send'}
              </button>
            </div>
            {testResult && <p className={cn('text-xs', testResult.status === 'SENT' ? 'text-green-700' : 'text-red-600')}>{testResult.message}</p>}
            <p className="text-xs text-gray-400">A test is sent even in test mode.</p>
          </form>

          <div className="bms-card px-5 py-4">
            <button type="button" onClick={() => setHelp(h => !h)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-800">
              How to connect {help ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {help && (
              <div className="mt-3 space-y-3 text-xs text-gray-600">
                <p>Put the keys in <b>backend/.env</b> (your computer) and in <b>Render → backend service → Environment</b> (live site), then restart. They are never shown here.</p>
                <div>
                  <p className="font-semibold text-gray-800">Email — Brevo (recommended, free 300 a day)</p>
                  <p>brevo.com → Senders: verify your sender address → <code>MAIL_FROM</code>. SMTP & API → API Keys → <code>BREVO_API_KEY</code>. Works on the live site.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Email — Gmail (computer only)</p>
                  <p>Turn on 2-Step Verification, create an App Password, then set <code>SMTP_USER</code> (your Gmail) and <code>SMTP_PASS</code> (the app password). Render's free plan blocks this, so use Brevo for the live site.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">SMS and WhatsApp — Twilio</p>
                  <p>twilio.com console → <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, your Twilio number → <code>TWILIO_SMS_FROM</code>. WhatsApp: Messaging → Try it out → WhatsApp sandbox → <code>TWILIO_WHATSAPP_FROM</code>. The free trial only sends to numbers you verified.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message log */}
      <div className="bms-card overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Message log</h2>
            <p className="text-xs text-gray-500">
              Last 30 days: {counts.SENT ?? 0} sent · {counts.HELD ?? 0} held · {counts.NOT_CONFIGURED ?? 0} not set up · {counts.FAILED ?? 0} failed
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select className={cn(input, 'w-auto bg-white py-1.5')} value={filter.channel} onChange={e => setFilter(f => ({ ...f, channel: e.target.value }))} aria-label="Channel filter">
              <option value="">All channels</option><option value="EMAIL">Email</option><option value="SMS">SMS</option><option value="WHATSAPP">WhatsApp</option>
            </select>
            <select className={cn(input, 'w-auto bg-white py-1.5')} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} aria-label="Status filter">
              <option value="">All results</option>
              {Object.entries(STATUS_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input className={cn(input, 'w-44 py-1.5')} placeholder="Search…" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} aria-label="Search the log" />
            <button type="button" onClick={loadLog} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Refresh"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[760px] text-sm">
            <colgroup>
              <col className="w-[140px]" /><col className="w-[90px]" /><col className="w-[200px]" /><col /><col className="w-[130px]" /><col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr className="text-left text-xs">
                <th className="px-4 py-2 font-semibold">When</th><th className="px-2 py-2 font-semibold">Channel</th><th className="px-2 py-2 font-semibold">To</th>
                <th className="px-2 py-2 font-semibold">Message</th><th className="px-2 py-2 font-semibold">Why</th><th className="px-2 py-2 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {log === null ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              ) : log.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No messages yet. They appear here as soon as the system sends (or would send) one — try “Send a test”.</td></tr>
              ) : log.map(m => (
                <tr key={m.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2 text-xs text-gray-500">{formatDateTime(m.createdAt)}{m.sentBy && <span className="block text-gray-400">by {m.sentBy}</span>}</td>
                  <td className="px-2 py-2 text-xs">{CHANNEL_INFO[m.channel]?.label ?? m.channel}</td>
                  <td className="px-2 py-2 text-xs text-gray-700 break-words">{m.to}</td>
                  <td className="px-2 py-2 min-w-0" title={m.body}>
                    {m.subject && <span className="block text-xs font-medium text-gray-800 truncate">{m.subject}</span>}
                    <span className="block text-xs text-gray-500 truncate">{m.body.replace(/\s+/g, ' ')}</span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-600">{EVENT_LABEL[m.event ?? ''] ?? m.event ?? '—'}</td>
                  <td className="px-2 py-2">
                    <span title={STATUS_INFO[m.status]?.hint} className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', STATUS_INFO[m.status]?.cls ?? 'bg-gray-100 text-gray-600')}>{STATUS_INFO[m.status]?.label ?? m.status}</span>
                    {m.error && <span className="block text-[11px] text-red-600 mt-1 break-words">{m.error}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
