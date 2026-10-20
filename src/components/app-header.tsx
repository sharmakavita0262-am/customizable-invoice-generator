import { Suspense } from "react";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { InvoicesNavLink, InvoicesNavLinkFallback } from "./invoices-nav-link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-ink text-paper">
            <FileText className="size-4.5" />
          </span>
          {/* Icon-only on phones, where the name would wrap; still announced to screen readers. */}
          <span className="sr-only font-display text-xl font-semibold tracking-tight whitespace-nowrap sm:not-sr-only">
            Invoice Generator
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* The active state reads the URL, which isn't known while prerendering dynamic routes. */}
          <Suspense fallback={<InvoicesNavLinkFallback />}>
            <InvoicesNavLink />
          </Suspense>
          <Link href="/invoices/new" className={buttonClasses({ variant: "primary" })}>
            <Plus aria-hidden />
            <span>
              New<span className="hidden sm:inline"> invoice</span>
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
