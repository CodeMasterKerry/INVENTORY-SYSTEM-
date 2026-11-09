import type { Sale } from "@/types";
import { toast } from "@/components/ui/toast";
import { formatCurrency, formatDate, formatPaymentMethod, toNumber } from "./utils";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function csvCell(value: string | number) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

const printStyles = `
  * { box-sizing: border-box }
  body { margin: 40px; color: #1e293b; font: 13px Inter, Segoe UI, Arial, sans-serif }
  h1 { margin: 0 0 4px; font-size: 20px }
  .muted { color: #64748b }
  .row { display: flex; justify-content: space-between; gap: 24px }
  .brand { color: #2563b8; font-size: 16px; font-weight: 700 }
  table { width: 100%; margin-top: 18px; border-collapse: collapse }
  th { padding: 8px 6px; border-bottom: 1px solid #cbd5e1; color: #64748b; font-size: 11px; text-align: left; text-transform: uppercase }
  td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb }
  .right { text-align: right }
  .total { font-size: 16px; font-weight: 700 }
  .summary { margin-top: 14px; line-height: 1.7 }
  .note { margin-top: 18px; padding: 10px 12px; border: 1px dashed #cbd5e1; color: #475569 }
  .sign { display: flex; gap: 60px; margin-top: 48px }
  .sign div { min-width: 180px; padding-top: 6px; border-top: 1px solid #94a3b8; color: #475569 }
  @media print { body { margin: 16mm } }
`;

function openPrint(title: string, body: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Your browser blocked the print window. Allow pop-ups for this site and try again.");
    return;
  }
  printWindow.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${printStyles}</style></head><body>${body}</body></html>`
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 300);
}

export function printTable(options: {
  title: string;
  preparedBy: string;
  summary: string[];
  headers: string[];
  rows: string[][];
}) {
  const body = `
    <div class="row"><div><div class="brand">E-SIMS</div><h1>${escapeHtml(options.title)}</h1></div>
    <div class="muted" style="text-align:right">Generated ${escapeHtml(formatDate(new Date(), true))}<br>Prepared by: ${escapeHtml(options.preparedBy)}</div></div>
    <div class="summary">${options.summary.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>
    <table><thead><tr>${options.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
    <tbody>${options.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <div class="sign"><div>Prepared by: ${escapeHtml(options.preparedBy)}</div><div>Approved by:</div></div>`;
  openPrint(options.title, body);
}

export function printInvoice(sale: Sale) {
  const approved = sale.status === "APPROVED";
  const rejected = sale.status === "REJECTED";
  const reviewLabel = rejected ? "Rejected by" : "Approved by";
  const reviewer = rejected ? sale.rejectedBy?.name : sale.approvedBy?.name;
  const reviewDate = rejected ? sale.rejectedAt : sale.approvedAt;
  const body = `
    <div class="row"><div><div class="brand">E-SIMS</div><h1>Invoice ${escapeHtml(sale.invoiceNo)}</h1></div>
    <div class="muted" style="text-align:right">Date: ${escapeHtml(formatDate(sale.createdAt, true))}<br>Status: ${escapeHtml(sale.status)}</div></div>
    <div class="summary"><div>Prepared by: ${escapeHtml(sale.createdBy.name)}</div>
    <div>Payment method: ${escapeHtml(formatPaymentMethod(sale.paymentMethod))}</div>
    <div>${reviewLabel}: ${escapeHtml(reviewer ?? "—")} · ${escapeHtml(formatDate(reviewDate, true))}</div>
    ${sale.notes ? `<div>Notes: ${escapeHtml(sale.notes)}</div>` : ""}
    ${rejected && sale.rejectionReason ? `<div>Rejection reason: ${escapeHtml(sale.rejectionReason)}</div>` : ""}</div>
    <table><thead><tr><th>Product</th><th>SKU</th><th class="right">Qty</th><th class="right">Unit price</th><th class="right">Line total</th></tr></thead><tbody>
    ${sale.items.map((item) => `<tr><td>${escapeHtml(item.product?.name ?? `Product ${item.productId}`)}</td><td>${escapeHtml(item.product?.sku ?? "")}</td>
      <td class="right">${item.quantity}</td><td class="right">${escapeHtml(formatCurrency(item.unitPrice))}</td>
      <td class="right">${escapeHtml(formatCurrency(toNumber(item.unitPrice) * item.quantity))}</td></tr>`).join("")}
    </tbody></table>
    <div class="summary" style="max-width:320px;margin-left:auto">
      <div class="row"><span>Subtotal</span><span>${escapeHtml(formatCurrency(sale.subtotalAmount))}</span></div>
      <div class="row"><span>Discount (${escapeHtml(sale.discountPercent)}%)</span><span>-${escapeHtml(formatCurrency(sale.discountAmount))}</span></div>
      <div class="row"><span>VAT (${escapeHtml(sale.taxRate)}%)</span><span>${escapeHtml(formatCurrency(sale.taxAmount))}</span></div>
      <div class="row total"><span>Total</span><span>${escapeHtml(formatCurrency(sale.totalAmount))}</span></div>
    </div>
    ${approved ? "" : `<div class="note">This sale is ${escapeHtml(sale.status.toLowerCase())}. It is not a final invoice.</div>`}
    <div class="sign"><div>Prepared by: ${escapeHtml(sale.createdBy.name)}</div><div>${escapeHtml(reviewLabel)}: ${escapeHtml(reviewer ?? "")}</div></div>`;
  openPrint(`Invoice ${sale.invoiceNo}`, body);
}
