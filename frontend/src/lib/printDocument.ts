/**
 * Printable quotations and invoices.
 * Opens a clean A4 page in a new tab and starts printing — choose
 * "Save as PDF" in the print dialog to get a PDF file. No extra library needed.
 */
import { companyService } from './services/operationsService'

export interface PrintLine { description: string; quantity: number; unitPrice: number; total: number }
export interface PrintDoc {
  kind: 'QUOTATION' | 'INVOICE'
  number: string
  date: string
  dueOrValid?: string           // invoice due date / quotation valid-until
  clientName: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  lines: PrintLine[]
  subtotal: number
  discountRate?: number
  discountAmount?: number
  vatRate?: number
  vatAmount: number
  total: number
  paid?: number
  currency?: string
  paymentTerms?: string
  notes?: string
  reference?: string            // contract / project
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const money = (n: number, cur = 'RWF') => `${cur} ${Math.round(n).toLocaleString('en-US')}`
const day = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

export async function printDocument(doc: PrintDoc): Promise<void> {
  // Open first (inside the click) so the browser does not block the pop-up
  const win = window.open('', '_blank')
  if (!win) { alert('Please allow pop-ups to download the PDF.'); return }
  win.document.write('<p style="font-family:sans-serif;padding:2rem">Preparing document…</p>')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let c: any = {}
  try { c = (await companyService.get()).data ?? {} } catch { /* print without company details */ }
  const cur = doc.currency || 'RWF'
  const title = doc.kind === 'INVOICE' ? 'INVOICE' : 'QUOTATION'
  const balance = doc.total - (doc.paid ?? 0)

  win.document.open()
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.number)}</title>
<style>
  @page { size: A4; margin: 16mm }
  * { box-sizing: border-box }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 12px; margin: 0 }
  .head { display: flex; justify-content: space-between; border-bottom: 3px solid #1e3a8a; padding-bottom: 12px }
  .co h1 { margin: 0; font-size: 20px; color: #1e3a8a } .co p { margin: 2px 0; color: #4b5563 }
  .doc { text-align: right } .doc h2 { margin: 0; font-size: 24px; letter-spacing: 2px; color: #1e3a8a }
  .doc p { margin: 2px 0 }
  .parties { display: flex; justify-content: space-between; margin: 18px 0 }
  .box { width: 48% } .box h3 { font-size: 10px; text-transform: uppercase; color: #6b7280; margin: 0 0 4px }
  .box p { margin: 2px 0 }
  table { width: 100%; border-collapse: collapse; margin-top: 8px }
  th { background: #1e3a8a; color: #fff; text-align: left; padding: 7px; font-size: 11px }
  td { padding: 7px; border-bottom: 1px solid #e5e7eb } .r { text-align: right }
  .totals { width: 45%; margin-left: auto; margin-top: 10px }
  .totals td { border: none; padding: 4px 7px } .grand td { border-top: 2px solid #1e3a8a; font-weight: 700; font-size: 14px }
  .notes { margin-top: 22px; padding: 10px; background: #f3f4f6; border-radius: 6px }
  .foot { margin-top: 36px; display: flex; justify-content: space-between }
  .sign { width: 40%; border-top: 1px solid #9ca3af; padding-top: 4px; text-align: center; color: #6b7280 }
  .bottom { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 10px }
</style></head><body>
<div class="head">
  <div class="co"><h1>${esc(c.name || 'Santech Innovate')}</h1>
    <p>${esc([c.address, c.city, c.country].filter(Boolean).join(', '))}</p>
    <p>${esc([c.phone, c.email].filter(Boolean).join(' · '))}</p>
    ${c.tin ? `<p>TIN: ${esc(c.tin)}</p>` : ''}</div>
  <div class="doc"><h2>${title}</h2>
    <p><b>${esc(doc.number)}</b></p>
    <p>Date: ${day(doc.date)}</p>
    ${doc.dueOrValid ? `<p>${doc.kind === 'INVOICE' ? 'Due' : 'Valid until'}: ${day(doc.dueOrValid)}</p>` : ''}
    ${doc.reference ? `<p>Ref: ${esc(doc.reference)}</p>` : ''}</div>
</div>
<div class="parties">
  <div class="box"><h3>${doc.kind === 'INVOICE' ? 'Bill to' : 'Prepared for'}</h3>
    <p><b>${esc(doc.clientName)}</b></p>
    ${doc.contactName ? `<p>Attn: ${esc(doc.contactName)}</p>` : ''}
    ${doc.contactPhone ? `<p>${esc(doc.contactPhone)}</p>` : ''}
    ${doc.contactEmail ? `<p>${esc(doc.contactEmail)}</p>` : ''}</div>
  ${doc.paymentTerms ? `<div class="box"><h3>Payment terms</h3><p>${esc(doc.paymentTerms)}</p></div>` : ''}
</div>
<table><thead><tr><th>#</th><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead><tbody>
${doc.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td class="r">${l.quantity}</td><td class="r">${money(l.unitPrice, cur)}</td><td class="r">${money(l.total, cur)}</td></tr>`).join('')}
</tbody></table>
<table class="totals">
  <tr><td>Subtotal</td><td class="r">${money(doc.subtotal, cur)}</td></tr>
  ${doc.discountAmount ? `<tr><td>Discount${doc.discountRate ? ` (${doc.discountRate}%)` : ''}</td><td class="r">-${money(doc.discountAmount, cur)}</td></tr>` : ''}
  <tr><td>VAT${doc.vatRate ? ` (${doc.vatRate}%)` : ''}</td><td class="r">${money(doc.vatAmount, cur)}</td></tr>
  <tr class="grand"><td>Total</td><td class="r">${money(doc.total, cur)}</td></tr>
  ${doc.kind === 'INVOICE' && doc.paid ? `<tr><td>Paid</td><td class="r">${money(doc.paid, cur)}</td></tr><tr class="grand"><td>Balance due</td><td class="r">${money(balance, cur)}</td></tr>` : ''}
</table>
${doc.notes ? `<div class="notes"><b>Notes:</b> ${esc(doc.notes)}</div>` : ''}
<div class="foot"><div class="sign">For ${esc(c.name || 'Santech Innovate')}</div><div class="sign">${doc.kind === 'QUOTATION' ? 'Client acceptance' : 'Received by'}</div></div>
<div class="bottom">Generated by SAN-BMS · ${new Date().toLocaleString('en-GB')}</div>
<script>window.onload = () => setTimeout(() => window.print(), 300)</script>
</body></html>`)
  win.document.close()
}
