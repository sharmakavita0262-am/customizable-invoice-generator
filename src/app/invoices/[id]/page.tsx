import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceEditor } from "@/components/editor/invoice-editor";
import { recordToDraft } from "@/lib/invoice/draft";
import { getInvoiceRepository } from "@/server/db";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  const invoice = (await getInvoiceRepository()).get(id);
  if (!invoice) notFound();

  // Keyed by version so a fresh visit always shows the latest saved data.
  return (
    <InvoiceEditor
      key={`${invoice.id}:${invoice.updatedAt}`}
      initialDraft={recordToDraft(invoice)}
      initialRecord={invoice}
    />
  );
}
