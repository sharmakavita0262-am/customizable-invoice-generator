"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Mail, Plus, Trash2 } from "lucide-react";
import { Button, buttonClasses, IconButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteInvoice } from "@/lib/api-client";
import { formatDate } from "@/lib/invoice/dates";
import { formatUSD } from "@/lib/invoice/money";
import type { InvoiceSummary } from "@/lib/invoice/schema";

export function InvoiceList({ invoices }: { invoices: InvoiceSummary[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<InvoiceSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteInvoice(pendingDelete.id);
      toast({ tone: "success", title: `${pendingDelete.invoiceNumber} deleted` });
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast({
        tone: "error",
        title: "Couldn't delete the invoice",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong/50 bg-surface px-6 py-16 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-soft text-brand">
          <FileText aria-hidden className="size-6" />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold">No invoices yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-muted">
          Create your first invoice. It&apos;s saved here so you can edit, print or email it later.
        </p>
        <Link href="/invoices/new" className={buttonClasses({ variant: "primary", className: "mt-6" })}>
          <Plus aria-hidden />
          Create an invoice
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <caption className="sr-only">Saved invoices, most recently updated first</caption>
          <thead className="border-b border-line bg-paper/60 text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium sm:px-5">
                Invoice
              </th>
              <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">
                Client
              </th>
              <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">
                Issued
              </th>
              <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">
                Due
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">
                Total
              </th>
              <th scope="col" className="w-12 py-3 pr-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="relative transition-colors hover:bg-paper/60">
                <td className="px-4 py-4 sm:px-5">
                  {/* The link's ::after stretches over the whole row so all of it is clickable. */}
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="font-mono font-medium text-ink after:absolute after:inset-0 hover:text-brand"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                  {invoice.lastEmailedAt && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 align-middle text-xs text-brand">
                      <Mail aria-hidden className="size-3" />
                      Emailed
                    </span>
                  )}
                  <div className="mt-1 break-words text-ink-soft md:hidden">{invoice.customerName}</div>
                  <div className="text-muted md:hidden">Due {formatDate(invoice.dueDate)}</div>
                </td>
                <td className="hidden px-5 py-4 break-words text-ink-soft md:table-cell">{invoice.customerName}</td>
                <td className="hidden px-5 py-4 whitespace-nowrap text-muted md:table-cell">
                  {formatDate(invoice.issueDate)}
                </td>
                <td className="hidden px-5 py-4 whitespace-nowrap text-muted md:table-cell">
                  {formatDate(invoice.dueDate)}
                </td>
                <td className="px-4 py-4 text-right font-display text-base font-semibold whitespace-nowrap tabular-nums sm:px-5">
                  {formatUSD(invoice.totalCents)}
                </td>
                <td className="py-4 pr-3 text-right">
                  <IconButton
                    label={`Delete ${invoice.invoiceNumber}`}
                    variant="danger"
                    className="relative z-10"
                    onClick={() => setPendingDelete(invoice)}
                  >
                    <Trash2 aria-hidden />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteDialog
        invoice={pendingDelete}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function ConfirmDeleteDialog({
  invoice,
  busy,
  onCancel,
  onConfirm,
}: {
  invoice: InvoiceSummary | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (invoice && !dialog.open) dialog.showModal();
    if (!invoice && dialog.open) dialog.close();
  }, [invoice]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface p-6 text-ink shadow-2xl"
    >
      <h2 id={titleId} className="font-display text-xl font-semibold">
        Delete {invoice?.invoiceNumber}?
      </h2>
      <p id={descriptionId} className="mt-2 text-sm text-muted">
        The invoice for {invoice?.customerName} ({invoice ? formatUSD(invoice.totalCents) : ""}) will be permanently
        removed. This can&apos;t be undone.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {/* Focus starts on Cancel, the safe choice. */}
        <Button onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting…" : "Delete invoice"}
        </Button>
      </div>
    </dialog>
  );
}
