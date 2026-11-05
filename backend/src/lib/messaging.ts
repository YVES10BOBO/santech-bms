/**
 * Outgoing email, SMS and WhatsApp.
 *
 * Providers switch on by themselves from environment variables
 * (backend/.env on your computer, Render → Environment for the live site):
 *   Email     RESEND_API_KEY + MAIL_FROM           Resend; needs a verified domain; works on Render (HTTPS)
 *             or BREVO_API_KEY + MAIL_FROM          Brevo; works on Render (sends over HTTPS)
 *             or SMTP_HOST + SMTP_USER + SMTP_PASS  e.g. Gmail with an app password; Render's free plan
 *                                                   blocks SMTP ports, so this works on your computer only
 *   SMS       TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_SMS_FROM
 *   WhatsApp  TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM
 * With no keys, nothing is sent: each message is only recorded (status NOT_CONFIGURED).
 *
 * Test mode (Settings → Email & SMS, on by default) only lets messages through to the addresses and
 * numbers on the test list; the rest are HELD, so demo data never reaches real companies.
 *
 * Every attempt is written to message_logs. These functions never throw.
 */
import nodemailer, { type Transporter } from 'nodemailer'
import prisma from './prisma'

export type Channel = 'EMAIL' | 'SMS' | 'WHATSAPP'
export type DeliveryStatus = 'SENT' | 'FAILED' | 'HELD' | 'NOT_CONFIGURED'
export const CHANNELS: Channel[] = ['EMAIL', 'SMS', 'WHATSAPP']

const env = (k: string) => (process.env[k] ?? '').trim()
// Provider addresses. The *_API_URL overrides exist only so tests can point at a local fake server.
const RESEND_URL = () => env('RESEND_API_URL') || 'https://api.resend.com/emails'
const BREVO_URL = () => env('BREVO_API_URL') || 'https://api.brevo.com/v3/smtp/email'
const TWILIO_URL = () => (env('TWILIO_API_URL') || 'https://api.twilio.com').replace(/\/+$/, '')
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Which providers are set up ────────────────────────────────────────────────

export type EmailProvider = 'resend' | 'brevo' | 'smtp'
const emailKeys = (p: EmailProvider) =>
  p === 'resend' ? !!env('RESEND_API_KEY') : p === 'brevo' ? !!env('BREVO_API_KEY') : !!(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'))

/** The email provider in use. EMAIL_PROVIDER (resend, brevo or smtp) picks one; otherwise the first one with keys: Resend, Brevo, SMTP */
export function emailProvider(): EmailProvider | null {
  const wanted = env('EMAIL_PROVIDER').toLowerCase() as EmailProvider
  if (['resend', 'brevo', 'smtp'].includes(wanted) && emailKeys(wanted)) return wanted
  return (['resend', 'brevo', 'smtp'] as EmailProvider[]).find(emailKeys) ?? null
}
const twilioKeys = () => !!(env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN'))
const callMeBotReady = () => !!(env('CALLMEBOT_APIKEY') && env('CALLMEBOT_PHONE'))
const channelReady = (c: Channel) =>
  c === 'EMAIL' ? !!emailProvider() :
  c === 'WHATSAPP' ? (twilioKeys() && !!env('TWILIO_WHATSAPP_FROM')) || callMeBotReady() :
  twilioKeys() && !!env('TWILIO_SMS_FROM')

/** The sender: MAIL_FROM (or EMAIL_FROM) as "Name <address>" or just the address; MAIL_FROM_NAME gives the name when there is none */
export const mailFrom = () => {
  const raw = env('MAIL_FROM') || env('EMAIL_FROM')
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  const email = (m ? m[2] : raw || env('SMTP_USER')).trim()
  return { email, name: (m && m[1].trim()) || env('MAIL_FROM_NAME') || 'Santech Innovate' }
}
const whatsappFrom = () => { const f = env('TWILIO_WHATSAPP_FROM'); return f.startsWith('whatsapp:') ? f : `whatsapp:${f}` }

/** What is set up — names and sender addresses only, never keys */
export function messagingStatus() {
  const provider = emailProvider()
  const from = mailFrom()
  return {
    email: {
      ready: !!provider, provider, from: provider ? from.email : null, fromName: from.name,
      warning: (provider === 'brevo' || provider === 'resend') && !from.email ? `Set MAIL_FROM to the sender address you verified in ${provider === 'resend' ? 'Resend' : 'Brevo'}` : null,
    },
    sms: { ready: channelReady('SMS'), provider: channelReady('SMS') ? 'twilio' : null, from: channelReady('SMS') ? env('TWILIO_SMS_FROM') : null },
    whatsapp: {
      ready: channelReady('WHATSAPP'),
      provider: twilioKeys() && !!env('TWILIO_WHATSAPP_FROM') ? 'twilio' : callMeBotReady() ? 'callmebot' : null,
      from: twilioKeys() && !!env('TWILIO_WHATSAPP_FROM') ? whatsappFrom().slice(9) : callMeBotReady() ? env('CALLMEBOT_PHONE') : null,
    },
  }
}

// ── Settings (Settings → Email & SMS) ────────────────────────────────────────

export interface MessagingSettings {
  /** TEST: only the test list receives messages. LIVE: everyone. */
  mode: 'TEST' | 'LIVE'
  /** emails and phone numbers that receive messages in test mode */
  testRecipients: string[]
  /** email staff their in-app notifications (task assigned, approvals, …) */
  emailStaff: boolean
  /** email customer and supplier portal logins their portal updates (new invoice, quotation, order, …) */
  emailPortal: boolean
}
export const DEFAULT_MESSAGING: MessagingSettings = { mode: 'TEST', testRecipients: [], emailStaff: true, emailPortal: true }

export async function getMessagingSettings(): Promise<MessagingSettings> {
  const row = await prisma.setting.findUnique({ where: { key: 'messaging' } })
  return { ...DEFAULT_MESSAGING, ...((row?.value ?? {}) as Partial<MessagingSettings>) }
}

// ── Addresses ─────────────────────────────────────────────────────────────────

/** +2507xxxxxxxx from "0788 123 456", "250788123456", "+250 788-123-456"…; null if not a phone number */
export function normalizePhone(raw: string): string | null {
  let p = String(raw ?? '').replace(/^whatsapp:/i, '').replace(/[\s\-().]/g, '')
  if (p.startsWith('00')) p = `+${p.slice(2)}`
  if (/^0[0-9]{9}$/.test(p)) p = `+250${p.slice(1)}` // Rwandan number written locally
  if (/^250[0-9]{9}$/.test(p)) p = `+${p}`
  return /^\+[1-9][0-9]{7,14}$/.test(p) ? p : null
}

/** The address in the form it is compared and sent in (lower-case email, +250… phone), or null */
export function normalizeRecipient(channel: Channel, raw: string): string | null {
  if (channel === 'EMAIL') { const e = String(raw ?? '').trim().toLowerCase(); return EMAIL_RE.test(e) ? e : null }
  return normalizePhone(raw)
}

/** An entry of the test list: email or phone, normalised */
export const normalizeTestRecipient = (raw: string) => normalizeRecipient('EMAIL', raw) ?? normalizePhone(raw)

/** Full address of a page of the app (links in emails) */
export function appUrl(link?: string | null): string {
  const base = (env('CLIENT_URL').split(',')[0] || 'http://localhost:3000').replace(/\/+$/, '')
  if (!link) return base
  return /^https?:\/\//.test(link) ? link : `${base}${link.startsWith('/') ? '' : '/'}${link}`
}

// ── Email layout ──────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Branded HTML email: logo, title, text (blank line = new paragraph), optional button */
export function emailHtml(o: { title: string; text: string; link?: string | null; button?: string }): string {
  const paras = o.text.split(/\n{2,}/).map(p => `<p style="margin:0 0 12px;line-height:1.55">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
  const button = o.link
    ? `<p style="margin:20px 0 4px"><a href="${esc(appUrl(o.link))}" style="background:#0b1f44;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;display:inline-block">${esc(o.button ?? 'Open in SAN-BMS')}</a></p>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#f4f6fa;font-family:Segoe UI,Arial,sans-serif;color:#1f2937">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="background:#ffffff;border:1px solid #dbe3f0;border-radius:12px;padding:24px">
    <img src="${esc(appUrl('/assets/santech_logo.png'))}" alt="Santech" style="height:56px;width:auto;display:block;margin-bottom:16px">
    <h2 style="margin:0 0 12px;font-size:18px;color:#0b1f44">${esc(o.title)}</h2>
    ${paras}${button}
  </div>
  <p style="text-align:center;font-size:12px;color:#8a94a6;margin:14px 0 0">${esc(mailFrom().name)} · SAN-BMS — this is an automatic message.</p>
</div></body></html>`
}

// ── Providers ─────────────────────────────────────────────────────────────────

let smtp: Transporter | null = null
const smtpTransport = () => {
  if (!smtp) {
    const port = Number(env('SMTP_PORT') || 587)
    smtp = nodemailer.createTransport({
      host: env('SMTP_HOST'), port, secure: port === 465,
      // Google shows app passwords as "abcd efgh ijkl mnop"; the spaces are not part of the password
      auth: { user: env('SMTP_USER'), pass: /gmail|google/i.test(env('SMTP_HOST')) ? env('SMTP_PASS').replace(/\s+/g, '') : env('SMTP_PASS') },
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
    })
  }
  return smtp
}

async function sendEmailNow(provider: EmailProvider, to: string, subject: string, text: string, html: string, replyToGiven?: string): Promise<void> {
  const from = mailFrom()
  // replies go to the person who wrote the message, or else to the company address REPLY_TO (a mailbox someone reads)
  const company = env('REPLY_TO')
  const replyTo = replyToGiven || (EMAIL_RE.test(company) ? company : undefined)
  if (!from.email) throw new Error('No sender address: set MAIL_FROM')
  if (provider === 'resend') {
    const r = await fetch(RESEND_URL(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: `${from.name} <${from.email}>`, to: [to], subject, html, text, ...(replyTo && { reply_to: replyTo }) }),
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) {
      const j = await r.json().catch(() => null) as { message?: string } | null
      throw new Error(`Resend refused it (${r.status})${j?.message ? `: ${j.message}` : ''}`)
    }
    return
  }
  if (provider === 'brevo') {
    const r = await fetch(BREVO_URL(), {
      method: 'POST',
      headers: { 'api-key': env('BREVO_API_KEY'), 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { email: from.email, name: from.name }, to: [{ email: to }], subject, htmlContent: html, textContent: text, ...(replyTo && { replyTo: { email: replyTo } }) }),
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) {
      const j = await r.json().catch(() => null) as { message?: string } | null
      throw new Error(`Brevo refused it (${r.status})${j?.message ? `: ${j.message}` : ''}`)
    }
    return
  }
  await smtpTransport().sendMail({ from: { address: from.email, name: from.name }, to, subject, text, html, ...(replyTo && { replyTo }) })
}

async function sendTwilioNow(channel: 'SMS' | 'WHATSAPP', to: string, text: string): Promise<void> {
  const sid = env('TWILIO_ACCOUNT_SID')
  const from = channel === 'SMS' ? env('TWILIO_SMS_FROM') : whatsappFrom()
  const form = new URLSearchParams({ To: channel === 'WHATSAPP' ? `whatsapp:${to}` : to, Body: text.slice(0, 1500) })
  // an SMS sender can also be a Twilio messaging service (MG…)
  if (channel === 'SMS' && /^MG[0-9a-f]{32}$/i.test(from)) form.set('MessagingServiceSid', from); else form.set('From', from)
  const r = await fetch(`${TWILIO_URL()}/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${env('TWILIO_AUTH_TOKEN')}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: form, signal: AbortSignal.timeout(15000),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => null) as { message?: string } | null
    throw new Error(`Twilio refused it (${r.status})${j?.message ? `: ${j.message}` : ''}`)
  }
}

/** CallMeBot — free WhatsApp API, no Twilio needed.
 *  Setup (2 min): add +34 644 65 21 47 as a contact, send it "I allow callmebot to send me messages",
 *  copy the apikey it replies with, add CALLMEBOT_APIKEY and CALLMEBOT_PHONE to backend/.env.
 *  Only sends to the one phone number that registered (CALLMEBOT_PHONE). */
async function sendCallMeBotNow(text: string): Promise<void> {
  const phone = normalizePhone(env('CALLMEBOT_PHONE'))
  const key = env('CALLMEBOT_APIKEY')
  if (!phone || !key) throw new Error('CallMeBot not configured: set CALLMEBOT_PHONE and CALLMEBOT_APIKEY')
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text.slice(0, 1500))}&apikey=${encodeURIComponent(key)}`
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error(`CallMeBot failed (${r.status})`)
}

// ── Sending ───────────────────────────────────────────────────────────────────

export interface Outgoing {
  channel: Channel
  to: string
  /** email subject */
  subject?: string
  /** plain text: the SMS / WhatsApp message, or the text version of the email */
  text: string
  /** email HTML (built from the text when missing) */
  html?: string
  event?: string
  link?: string | null
  /** the login it was sent to, if any */
  userId?: string | null
  /** the staff member who sent it, if any */
  createdById?: string | null
  /** the "send a test" button in Settings ignores test mode */
  ignoreTestMode?: boolean
  /** email replies go here (e.g. the staff member who wrote it) instead of MAIL_FROM */
  replyTo?: string | null
}
export interface Delivery { status: DeliveryStatus; to: string; channel: Channel; error?: string; provider?: string | null }

/** Sends one message (or holds / records it) and writes it to the message log. Never throws. */
export async function deliver(m: Outgoing): Promise<Delivery> {
  const to = normalizeRecipient(m.channel, m.to)
  let status: DeliveryStatus = 'FAILED'
  let error: string | undefined
  let provider: string | null = null
  try {
    if (!to) {
      error = m.channel === 'EMAIL' ? 'Not a valid email address' : 'Not a valid phone number (use +250… or 07…)'
    } else if (!channelReady(m.channel)) {
      status = 'NOT_CONFIGURED'
    } else {
      provider = m.channel === 'EMAIL' ? emailProvider() : 'twilio'
      const settings = await getMessagingSettings()
      if (settings.mode === 'TEST' && !m.ignoreTestMode && !settings.testRecipients.includes(to)) {
        status = 'HELD'
      } else if (m.channel === 'EMAIL') {
        const subject = m.subject || 'Message from Santech'
        await sendEmailNow(provider as EmailProvider, to, subject, m.text, m.html ?? emailHtml({ title: subject, text: m.text, link: m.link }), m.replyTo && EMAIL_RE.test(m.replyTo) ? m.replyTo : undefined)
        status = 'SENT'
      } else {
        // WhatsApp: prefer Twilio if configured, fall back to CallMeBot (free, sends to registered number only)
        if (m.channel === 'WHATSAPP' && !twilioKeys() && callMeBotReady()) {
          await sendCallMeBotNow(m.text)
          provider = 'callmebot'
        } else {
          await sendTwilioNow(m.channel, to, m.text)
        }
        status = 'SENT'
      }
    }
  } catch (e) {
    status = 'FAILED'
    error = (e instanceof Error ? e.message : String(e)).slice(0, 300)
  }
  try {
    await prisma.messageLog.create({
      data: {
        channel: m.channel, to: to ?? String(m.to ?? '').slice(0, 200), subject: m.subject ?? null, body: m.text.slice(0, 4000),
        status, provider, error: error ?? null, event: m.event ?? null, link: m.link ?? null,
        userId: m.userId ?? null, createdById: m.createdById ?? null,
      },
    })
  } catch (e) { console.error('Message log failed:', e) }
  if (status === 'FAILED') console.error(`[messaging] ${m.channel} to ${to ?? m.to} failed: ${error}`)
  return { status, to: to ?? String(m.to ?? ''), channel: m.channel, error, provider }
}

/** A short sentence for the person who pressed "send" */
export function deliveryMessage(d: Delivery): string {
  const what = d.channel === 'EMAIL' ? 'Email' : d.channel === 'SMS' ? 'SMS' : 'WhatsApp message'
  switch (d.status) {
    case 'SENT': return `${what} sent to ${d.to}`
    case 'HELD': return `${what} to ${d.to} held: test mode is on (Settings → Email & SMS)`
    case 'NOT_CONFIGURED': return `${what} not sent: ${d.channel === 'EMAIL' ? 'email' : d.channel === 'SMS' ? 'SMS' : 'WhatsApp'} is not set up yet (Settings → Email & SMS)`
    default: return `${what} to ${d.to} failed: ${d.error ?? 'unknown error'}`
  }
}

/**
 * Emails a login the in-app notification it just got (if switched on for staff / portal logins).
 * Runs after the notification is saved; called without await so it never slows a request.
 */
export async function emailNotification(userId: string, n: { title: string; description: string; link?: string | null }): Promise<void> {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, role: true, isActive: true } })
    if (!u?.isActive || !u.email) return
    const settings = await getMessagingSettings()
    const portal = u.role === 'CUSTOMER' || u.role === 'SUPPLIER'
    if (portal ? !settings.emailPortal : !settings.emailStaff) return
    const text = `Hello ${u.firstName},\n\n${n.description}`
    await deliver({
      channel: 'EMAIL', to: u.email, subject: n.title, text, link: n.link, event: 'notification', userId,
      html: emailHtml({ title: n.title, text, link: n.link, button: portal ? 'Open your portal' : 'Open in SAN-BMS' }),
    })
  } catch (e) { console.error('emailNotification failed:', e) }
}
