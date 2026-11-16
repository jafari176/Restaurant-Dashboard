import { Order } from '@/types/order';

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

export function buildTicketHtml(order: Order): string {
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

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Ticket ${escapeHtml(order.order_id)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Menlo", "Consolas", "Courier New", monospace;
    font-size: 12px; line-height: 1.4; color: #000; margin: 0; width: 72mm;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .brand { text-align: center; letter-spacing: 4px; font-size: 15px; font-weight: 700; }
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
</style>
</head>
<body>
  <div class="brand">NEUVA</div>
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
  </footer>
</body>
</html>`;
}

/**
 * Renders the ticket in an offscreen iframe and opens the print dialog.
 *
 * An iframe rather than window.open: iPad Safari blocks popups that are not
 * a direct result of a tap, and a print window that never appears looks
 * exactly like a broken button.
 */
export function printOrder(order: Order): void {
  const existing = document.getElementById('order-print-frame');
  if (existing) existing.remove();

  const frame = document.createElement('iframe');
  frame.id = 'order-print-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(buildTicketHtml(order));
  doc.close();

  const run = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      // Leave the frame up briefly: removing it while the print dialog is
      // still reading the document cancels the job on some browsers.
      window.setTimeout(() => frame.remove(), 60_000);
    }
  };

  if (frame.contentWindow?.document.readyState === 'complete') {
    run();
  } else {
    frame.onload = run;
  }
}
