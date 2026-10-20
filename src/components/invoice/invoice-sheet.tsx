import type { CSSProperties, ReactNode } from "react";
import { getAccent } from "@/lib/invoice/accents";
import type { InvoiceTotals } from "@/lib/invoice/calculations";
import { formatDate } from "@/lib/invoice/dates";
import { formatDecimal, formatUSD } from "@/lib/invoice/money";
import type { InvoiceInput } from "@/lib/invoice/schema";

/**
 * The invoice document itself: used for the live preview and for printing.
 * Hidden custom fields are never rendered. Placeholders for empty values are
 * shown on screen only.
 */

function Placeholder({ children }: { children: ReactNode }) {
  return <span className="text-placeholder italic print:hidden">{children}</span>;
}

function Lines({ text }: { text: string }) {
  // wrap-anywhere (overflow-wrap: anywhere) lets very long unbroken words (URLs, IBANs) wrap instead of overflowing.
  return <span className="whitespace-pre-line wrap-anywhere">{text}</span>;
}

export function InvoiceSheet({ invoice, totals }: { invoice: InvoiceInput; totals: InvoiceTotals }) {
  const accent = getAccent(invoice.accent);
  const visibleFields = invoice.customFields.filter((field) => field.visible && field.label.trim());
  const style = { "--accent": accent.color, "--accent-soft": accent.soft } as CSSProperties;

  return (
    <article
      aria-label="Invoice preview"
      style={style}
      className="invoice-sheet @container relative mx-auto w-full max-w-[860px] overflow-hidden rounded-sm bg-white text-ink shadow-sheet"
    >
      <div aria-hidden className="h-1.5 bg-(--accent)" />

      <div className="px-6 py-8 @md:px-10 @md:py-10 @2xl:px-14 @2xl:py-12">
        {/* Masthead */}
        <header className="flex flex-col gap-6 @lg:flex-row @lg:items-start @lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.22em] text-(--accent) uppercase">Invoice</p>
            <h2 className="mt-2 font-display text-2xl leading-tight font-semibold break-words @md:text-3xl">
              {invoice.from.name.trim() || <Placeholder>Your business name</Placeholder>}
            </h2>
            <address className="mt-2 text-sm leading-relaxed text-muted not-italic">
              {invoice.from.address.trim() && <Lines text={invoice.from.address.trim()} />}
              {invoice.from.email.trim() && <span className="block">{invoice.from.email.trim()}</span>}
            </address>
          </div>

          <dl className="grid shrink-0 grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm @lg:text-right">
            <dt className="text-muted">Invoice no.</dt>
            <dd className="font-mono font-medium break-all">
              {invoice.invoiceNumber.trim() || <Placeholder>INV-0000</Placeholder>}
            </dd>
            <dt className="text-muted">Issued</dt>
            <dd>{invoice.issueDate ? formatDate(invoice.issueDate) : <Placeholder>Not set</Placeholder>}</dd>
            <dt className="text-muted">Due</dt>
            <dd>{invoice.dueDate ? formatDate(invoice.dueDate) : <Placeholder>Not set</Placeholder>}</dd>
            {visibleFields.map((field) => (
              <div key={field.id} className="contents">
                <dt className="text-muted break-words">{field.label}</dt>
                <dd className="break-words">{field.value || <Placeholder>Empty</Placeholder>}</dd>
              </div>
            ))}
          </dl>
        </header>

        {/* Bill to + amount due */}
        <section className="avoid-break mt-8 grid gap-6 border-y border-line py-6 @lg:grid-cols-2 @lg:items-end">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Bill to</h3>
            <p className="mt-2 font-medium break-words">
              {invoice.billTo.name.trim() || <Placeholder>Client name</Placeholder>}
            </p>
            <address className="mt-1 text-sm leading-relaxed text-muted not-italic">
              {invoice.billTo.address.trim() && <Lines text={invoice.billTo.address.trim()} />}
              {invoice.billTo.email.trim() && <span className="block">{invoice.billTo.email.trim()}</span>}
            </address>
          </div>
          <div className="rounded-lg bg-(--accent-soft) px-5 py-4 @lg:text-right">
            <p className="text-sm text-ink-soft">Amount due</p>
            <p className="font-display text-3xl font-semibold text-(--accent) tabular-nums @md:text-4xl">
              {formatUSD(totals.totalCents)}
            </p>
            {invoice.dueDate && <p className="mt-0.5 text-sm text-ink-soft">by {formatDate(invoice.dueDate)}</p>}
          </div>
        </section>

        {/* Line items */}
        <table className="mt-8 w-full table-fixed border-collapse text-sm">
          <caption className="sr-only">Line items</caption>
          <thead>
            <tr className="border-b-2 border-ink text-left text-xs tracking-[0.12em] text-ink uppercase">
              <th scope="col" className="pb-2 font-semibold">
                Description
              </th>
              {/* Narrow sheets fold quantity and price into the description cell. */}
              <th scope="col" className="hidden w-20 pb-2 text-right font-semibold @md:table-cell">
                Qty
              </th>
              <th scope="col" className="hidden w-28 pb-2 text-right font-semibold @md:table-cell">
                Unit price
              </th>
              <th scope="col" className="w-28 pb-2 text-right font-semibold">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, index) => (
              <tr key={item.id} className="border-b border-line align-top">
                <td className="py-3 pr-3 break-words">
                  {item.description.trim() || <Placeholder>Item description</Placeholder>}
                  <span className="block text-muted tabular-nums @md:hidden">
                    {formatDecimal(item.quantity)} × {formatUSD(item.unitPriceCents)}
                  </span>
                </td>
                <td className="hidden py-3 text-right tabular-nums @md:table-cell">{formatDecimal(item.quantity)}</td>
                <td className="hidden py-3 text-right tabular-nums @md:table-cell">
                  {formatUSD(item.unitPriceCents)}
                </td>
                <td className="py-3 text-right font-medium tabular-nums">
                  {formatUSD(totals.lineTotalsCents[index] ?? 0)}
                </td>
              </tr>
            ))}
            {invoice.lineItems.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center">
                  <Placeholder>No line items yet</Placeholder>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <dl className="avoid-break mt-6 ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-y-2 text-sm tabular-nums">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-right">{formatUSD(totals.subtotalCents)}</dd>
          {totals.discountCents > 0 && (
            <>
              <dt className="text-muted">Discount</dt>
              <dd className="text-right">&minus;{formatUSD(totals.discountCents)}</dd>
            </>
          )}
          <dt className="text-muted">Tax ({formatDecimal(invoice.taxRatePercent)}%)</dt>
          <dd className="text-right">{formatUSD(totals.taxCents)}</dd>
          <dt className="mt-2 border-t-2 border-(--accent) pt-3 font-semibold">Total due</dt>
          <dd className="mt-2 border-t-2 border-(--accent) pt-3 text-right font-display text-xl font-semibold text-(--accent)">
            {formatUSD(totals.totalCents)}
          </dd>
        </dl>

        {invoice.notes.trim() && (
          <footer className="avoid-break mt-10 border-t border-line pt-5 text-sm leading-relaxed text-muted">
            <Lines text={invoice.notes.trim()} />
          </footer>
        )}
      </div>
    </article>
  );
}
