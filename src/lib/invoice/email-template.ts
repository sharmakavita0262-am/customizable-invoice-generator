import { getAccent } from "./accents";
import { calculateTotals } from "./calculations";
import { formatDate } from "./dates";
import { formatDecimal, formatUSD } from "./money";
import type { InvoiceInput } from "./schema";

/**
 * Renders the invoice email. Email clients ignore stylesheets, so the HTML is
 * table-based with inline styles. Every user value goes through `escapeHtml`.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function multiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

export function renderInvoiceEmail(invoice: InvoiceInput, personalMessage = ""): RenderedEmail {
  const totals = calculateTotals(invoice);
  const accent = getAccent(invoice.accent);
  const visibleFields = invoice.customFields.filter((field) => field.visible);
  const total = formatUSD(totals.totalCents);
  const dueDate = formatDate(invoice.dueDate);

  // Collapse whitespace so user input can never inject header line breaks.
  const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.from.name} (${total} due ${dueDate})`.replace(
    /\s+/g,
    " ",
  );

  const muted = "color:#6b655a;";
  const cell = "padding:10px 0;border-bottom:1px solid #ebe6dc;";

  const itemRows = invoice.lineItems
    .map(
      (item, index) => `
        <tr>
          <td style="${cell}">${escapeHtml(item.description)}</td>
          <td style="${cell}text-align:right;white-space:nowrap;">${formatDecimal(item.quantity)}</td>
          <td style="${cell}text-align:right;white-space:nowrap;">${formatUSD(item.unitPriceCents)}</td>
          <td style="${cell}text-align:right;white-space:nowrap;">${formatUSD(totals.lineTotalsCents[index])}</td>
        </tr>`,
    )
    .join("");

  const summaryRow = (label: string, value: string, strong = false) => `
        <tr>
          <td style="padding:4px 0;${strong ? "font-weight:700;font-size:16px;" : muted}">${label}</td>
          <td style="padding:4px 0;text-align:right;${strong ? `font-weight:700;font-size:16px;color:${accent.color};` : ""}">${value}</td>
        </tr>`;

  const fieldRows = visibleFields
    .map(
      (field) =>
        `<tr><td style="padding:2px 16px 2px 0;${muted}">${escapeHtml(field.label)}</td><td style="padding:2px 0;">${escapeHtml(field.value)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px 12px;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1d1b16;font-size:14px;line-height:1.5;word-break:break-word;overflow-wrap:anywhere;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;border-top:6px solid ${accent.color};">
    <tr><td style="padding:32px;">
      ${personalMessage ? `<p style="margin:0 0 24px;padding:16px;background:${accent.soft};border-radius:8px;">${multiline(personalMessage)}</p>` : ""}
      <p style="margin:0;${muted}font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Invoice ${escapeHtml(invoice.invoiceNumber)}</p>
      <h1 style="margin:4px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;">${escapeHtml(invoice.from.name)}</h1>
      <p style="margin:24px 0 0;${muted}">Amount due</p>
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;color:${accent.color};">${total}</p>
      <p style="margin:0;${muted}">Due ${dueDate} &middot; Issued ${formatDate(invoice.issueDate)}</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <td valign="top" style="width:50%;padding-right:12px;">
            <p style="margin:0 0 4px;${muted}font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">From</p>
            <strong>${escapeHtml(invoice.from.name)}</strong><br>
            ${invoice.from.email ? `${escapeHtml(invoice.from.email)}<br>` : ""}
            ${multiline(invoice.from.address)}
          </td>
          <td valign="top" style="width:50%;padding-left:12px;">
            <p style="margin:0 0 4px;${muted}font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Bill to</p>
            <strong>${escapeHtml(invoice.billTo.name)}</strong><br>
            ${invoice.billTo.email ? `${escapeHtml(invoice.billTo.email)}<br>` : ""}
            ${multiline(invoice.billTo.address)}
          </td>
        </tr>
      </table>

      ${fieldRows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">${fieldRows}</table>` : ""}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <th align="left" style="padding-bottom:8px;border-bottom:2px solid #1d1b16;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Description</th>
          <th align="right" style="padding-bottom:8px;border-bottom:2px solid #1d1b16;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Qty</th>
          <th align="right" style="padding-bottom:8px;border-bottom:2px solid #1d1b16;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Unit price</th>
          <th align="right" style="padding-bottom:8px;border-bottom:2px solid #1d1b16;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Amount</th>
        </tr>
        ${itemRows}
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 0 auto;min-width:240px;">
        ${summaryRow("Subtotal", formatUSD(totals.subtotalCents))}
        ${totals.discountCents ? summaryRow("Discount", `&minus;${formatUSD(totals.discountCents)}`) : ""}
        ${summaryRow(`Tax (${formatDecimal(invoice.taxRatePercent)}%)`, formatUSD(totals.taxCents))}
        ${summaryRow("Total due", total, true)}
      </table>

      ${invoice.notes ? `<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #ebe6dc;${muted}">${multiline(invoice.notes)}</p>` : ""}
    </td></tr>
  </table>
</body>
</html>`;

  const textLines = [
    personalMessage,
    personalMessage ? "" : null,
    `Invoice ${invoice.invoiceNumber} from ${invoice.from.name}`,
    `Amount due: ${total} (due ${dueDate})`,
    `Issued: ${formatDate(invoice.issueDate)}`,
    `Bill to: ${invoice.billTo.name}`,
    ...visibleFields.map((field) => `${field.label}: ${field.value}`),
    "",
    ...invoice.lineItems.map(
      (item, index) =>
        `- ${item.description}: ${formatDecimal(item.quantity)} x ${formatUSD(item.unitPriceCents)} = ${formatUSD(totals.lineTotalsCents[index])}`,
    ),
    "",
    `Subtotal: ${formatUSD(totals.subtotalCents)}`,
    totals.discountCents ? `Discount: -${formatUSD(totals.discountCents)}` : null,
    `Tax (${formatDecimal(invoice.taxRatePercent)}%): ${formatUSD(totals.taxCents)}`,
    `Total due: ${total}`,
    invoice.notes ? `\n${invoice.notes}` : null,
  ];

  return {
    subject,
    html,
    text: textLines.filter((line): line is string => line !== null).join("\n"),
  };
}
