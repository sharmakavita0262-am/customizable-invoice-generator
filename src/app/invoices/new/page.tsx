import type { Metadata } from "next";
import { InvoiceEditor } from "@/components/editor/invoice-editor";
import { toISODate } from "@/lib/invoice/dates";
import { createEmptyDraft } from "@/lib/invoice/draft";
import { getInvoiceRepository } from "@/server/db";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const repository = await getInvoiceRepository();
  const draft = createEmptyDraft({
    invoiceNumber: repository.suggestNextNumber(),
    today: toISODate(new Date()),
  });

  // A fresh key per request: each visit starts a clean draft, while
  // back/forward navigation still restores what the user had typed.
  return <InvoiceEditor key={crypto.randomUUID()} initialDraft={draft} initialRecord={null} />;
}
