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

const TAX_RATE = 1.14975;

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

  const subtotal =
    order.subtotal ?? items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = order.subtotal_with_tax ?? subtotal * TAX_RATE;

  const placed = order.new_order_at ? new Date(order.new_order_at) : new Date();
  const stamp = placed.toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const rows = items
    .map((i) => {
      const name = escapeHtml(i.item);
      const line = (i.price * i.quantity).toFixed(2);
      return `<tr><td class="q">${i.quantity}x</td><td class="n">${name}</td><td class="p">${line}</td></tr>`;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Order ${escapeHtml(order.order_id)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Menlo", "Consolas", monospace;
    font-size: 12px;
    line-height: 1.35;
    color: #000;
    margin: 0;
    width: 72mm;
  }
  h1 { font-size: 15px; margin: 0 0 2px; letter-spacing: .5px; }
  .muted { font-size: 11px; }
  .big { font-size: 20px; font-weight: 700; margin: 6px 0 2px; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 2px 0; }
  td.q { width: 10mm; font-weight: 700; }
  td.n { word-break: break-word; }
  td.p { width: 18mm; text-align: right; white-space: nowrap; }
  .tot td { padding-top: 3px; }
  .tot .lbl { text-align: right; }
  .grand td { font-size: 14px; font-weight: 700; border-top: 1px solid #000; padding-top: 4px; }
  footer { margin-top: 8px; text-align: center; font-size: 11px; }
</style>
</head>
<body>
  <h1>AL QUDS GRILL</h1>
  <div class="muted">10380 Boul Gouin O, Pierrefonds</div>
  <hr>
  <div class="big">#${escapeHtml(order.order_id)}</div>
  <div>${escapeHtml(order.customer_name || 'Guest')}</div>
  <div class="muted">${escapeHtml(formatPhone(order.phone_number))}</div>
  <div class="muted">Placed ${escapeHtml(stamp)}</div>
  <hr>
  <table>${rows}</table>
  <hr>
  <table class="tot">
    <tr><td class="lbl">Subtotal</td><td class="p">${subtotal.toFixed(2)}</td></tr>
    <tr class="grand"><td class="lbl">TOTAL</td><td class="p">${total.toFixed(2)}</td></tr>
  </table>
  <footer>Merci / Thank you</footer>
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
