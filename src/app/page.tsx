import { Suspense } from "react";
import { InvoiceList } from "@/components/invoice-list";
import { formatUSD } from "@/lib/invoice/money";
import { getInvoiceRepository } from "@/server/db";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-medium tracking-[0.18em] text-brand uppercase">Dashboard</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Invoices</h1>
        <p className="mt-2 max-w-xl text-muted">
          Draft, save and send professional invoices. Everything you save lives here.
        </p>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <SavedInvoices />
      </Suspense>
    </div>
  );
}

async function SavedInvoices() {
  const invoices = (await getInvoiceRepository()).list();
  const billedCents = invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const emailed = invoices.filter((invoice) => invoice.lastEmailedAt).length;

  return (
    <>
      {invoices.length > 0 && (
        <dl className="mb-6 grid grid-cols-3 gap-3">
          {[
            ["Invoices", String(invoices.length)],
            ["Total billed", formatUSD(billedCents)],
            ["Emailed", `${emailed} of ${invoices.length}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-surface px-4 py-3 sm:px-5 sm:py-4">
              <dt className="text-xs text-muted sm:text-sm">{label}</dt>
              <dd className="mt-1 truncate font-display text-lg font-semibold tabular-nums sm:text-2xl">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <InvoiceList invoices={invoices} />
    </>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading invoices" className="animate-pulse space-y-3">
      <div className="h-20 rounded-2xl bg-ink/5" />
      <div className="h-64 rounded-2xl bg-ink/5" />
    </div>
  );
}
