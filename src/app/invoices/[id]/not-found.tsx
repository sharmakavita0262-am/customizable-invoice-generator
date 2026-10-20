import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function InvoiceNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Invoice not found</h1>
      <p className="mt-3 text-muted">It may have been deleted, or the link is incorrect.</p>
      <Link href="/" className={buttonClasses({ variant: "primary", className: "mt-8" })}>
        Back to invoices
      </Link>
    </div>
  );
}
