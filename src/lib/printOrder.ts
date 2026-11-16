import { Order } from '@/types/order';
import { NEUVA_LOGO_PNG } from './neuvaLogo';

/**
 * Prints a kitchen ticket for an order.
 *
 * Opens a bare document in a hidden iframe and calls print() on it, rather
 * than printing the dashboard with CSS @media print. The dashboard is a
 * full-screen iPad layout; getting a receipt out of it would mean hiding
 * almost every element, and any later layout change would silently break the
 * ticket.
 *
 * Sized for 80mm thermal paper, which is what the kitchen printer takes, and
 * falls back to ordinary paper acceptably because the body is just a narrow
 * column of monospace text.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** "(514) 961-9235" from the 10 digits we store. */
function formatPhone(raw: string): string {
  const d = (raw || '').replace(/\D/g, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw || '';
}

/** Shared by the print path and the standalone-HTML builder. */
const TICKET_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: "Menlo", "Consolas", "Courier New", monospace;
    font-size: 12px; line-height: 1.4; color: #000; margin: 0; width: 72mm;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .logo { display: block; width: 26mm; margin: 0 auto 3px; }
  .sub { text-align: center; letter-spacing: 3px; font-size: 9px; margin-top: 2px; }
  .rule { border-top: 2px dashed #000; margin: 7px 0; }
  .lbl { text-align: center; font-size: 9px; letter-spacing: 2px; }
  .num { text-align: center; font-size: 30px; font-weight: 700; letter-spacing: 1px; margin: 1px 0 7px; }
  /* Reversed block: the one thing that must read from across the kitchen. */
  .type {
    background: #000; color: #fff; text-align: center;
    font-size: 16px; font-weight: 700; letter-spacing: 5px; padding: 7px 0; margin-bottom: 7px;
  }
  .meta { display: flex; justify-content: space-between; gap: 6px; }
  .meta .v { text-align: right; }
  .meta.strong { font-weight: 700; }
  .line { border-top: 1px solid #000; margin: 7px 0; }
  .it { display: flex; gap: 6px; margin: 7px 0; page-break-inside: avoid; }
  .qty { font-weight: 700; font-size: 14px; min-width: 9mm; }
  .nm { font-weight: 700; font-size: 14px; word-break: break-word; }
  .count { display: flex; justify-content: space-between; font-weight: 700; }
  .note { border: 1px dashed #000; padding: 5px 6px; margin-top: 7px; page-break-inside: avoid; }
  .note-h { font-weight: 700; font-size: 11px; margin-bottom: 2px; }
  footer { margin-top: 10px; text-align: center; font-size: 10px; }
`;

/** The ticket's markup, without a document wrapper. */
function buildTicketBody(order: Order): string {
  const items = order.order_items ?? [];
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);

  const placed = order.new_order_at ? new Date(order.new_order_at) : new Date();
  const clock = (d: Date) =>
    d.toLocaleTimeString('en-CA', {
      timeZone: 'America/Toronto',
      hour: 'numeric',
      minute: '2-digit',
    });

  const rows = items
    .map(
      (i) => `<div class="it">
        <span class="qty">${i.quantity}&times;</span>
        <span class="nm">${escapeHtml(i.item)}</span>
      </div>`,
    )
    .join('');

  // Both are nullable and only populated after the pickup_time /
  // special_requests migration, so each block is omitted when empty rather
  // than printing an empty bordered box on every ticket.
  const readyBy = (order.pickup_time ?? '').trim();
  const note = (order.special_requests ?? '').trim();

  const noteBlock = note
    ? `<div class="note">
         <div class="note-h">SPECIAL INSTRUCTIONS</div>
         <div>${escapeHtml(note)}</div>
       </div>`
    : '';

  return `
  <img class="logo" src="${NEUVA_LOGO_PNG}" alt="Neuva">
  <div class="sub">KITCHEN TICKET</div>
  <div class="rule"></div>

  <div class="lbl">ORDER</div>
  <div class="num">#${escapeHtml(order.order_id)}</div>

  <div class="type">PICKUP</div>

  <div class="meta"><span>Placed</span><span class="v">${escapeHtml(clock(placed))}</span></div>
  ${readyBy ? `<div class="meta strong"><span>READY BY</span><span class="v">${escapeHtml(readyBy)}</span></div>` : ''}
  <div class="meta"><span>Source</span><span class="v">Phone</span></div>
  <div class="meta"><span>Customer</span><span class="v">${escapeHtml(order.customer_name || 'Guest')}</span></div>
  <div class="meta"><span>Phone</span><span class="v">${escapeHtml(formatPhone(order.phone_number))}</span></div>

  <div class="rule"></div>
  ${rows}
  <div class="line"></div>
  <div class="count"><span>ITEMS</span><span>${itemCount}</span></div>
  ${noteBlock}

  <footer>
    Order taken by Neuva AI<br>neuvasol.com
  </footer>`;
}

/**
 * The ticket as a standalone HTML document. Not used by printOrder, which
 * mounts into the host page so the top-level @page rule applies; kept for
 * previewing and testing the layout on its own.
 */
export function buildTicketHtml(order: Order): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Ticket ${escapeHtml(order.order_id)}</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  body {
    font-family: "Menlo", "Consolas", "Courier New", monospace;
    font-size: 12px; line-height: 1.4; color: #000; margin: 0; width: 74mm;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
${TICKET_CSS}
</style>
</head>
<body>
${buildTicketBody(order)}
</body>
</html>`;
}

/**
 * Prints the ticket from the top-level document.
 *
 * It used to render into a hidden iframe, which printed but came out on
 * letter paper: Chrome takes the page size from the TOP document's @page
 * rule and ignores the one inside a frame, so `size: 80mm auto` never
 * applied and the receipt sat in the corner of a full sheet.
 *
 * So the ticket is mounted into the host document instead, inside a
 * container that print CSS reveals while hiding everything else. The @page
 * rule is then the top document's own and is honoured. The style and node
 * are both removed afterwards, so nothing about the dashboard changes once
 * the dialog closes.
 */
export function printOrder(order: Order): void {
  document.getElementById('order-print-root')?.remove();
  document.getElementById('order-print-style')?.remove();

  const host = document.createElement('div');
  host.id = 'order-print-root';
  host.innerHTML = buildTicketBody(order);

  const style = document.createElement('style');
  style.id = 'order-print-style';
  style.textContent = `
    #order-print-root { display: none; }
    @media print {
      @page { size: 80mm auto; margin: 3mm; }
      /* Hide the app without unmounting it: display:none on a React root
         would tear down the dashboard mid-print. */
      body > *:not(#order-print-root) { display: none !important; }
      html, body {
        display: block !important;
        margin: 0 !important; padding: 0 !important;
        background: #fff !important; width: auto !important; height: auto !important;
      }
      #order-print-root {
        display: block !important;
        position: static !important;
        width: 74mm; margin: 0; padding: 0; color: #000;
        font-family: "Menlo", "Consolas", "Courier New", monospace;
        font-size: 12px; line-height: 1.4;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      ${TICKET_CSS}
    }
  `;

  document.body.appendChild(style);
  document.body.appendChild(host);

  const cleanup = () => {
    host.remove();
    style.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  // Safari fires afterprint unreliably; this guarantees the DOM is restored.
  window.setTimeout(cleanup, 60_000);

  window.print();
}
