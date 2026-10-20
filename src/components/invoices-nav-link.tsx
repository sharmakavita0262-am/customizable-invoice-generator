"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";

function NavLink({ active }: { active: boolean }) {
  return (
    <Link
      href="/"
      aria-current={active ? "page" : undefined}
      className={buttonClasses({ variant: "ghost", className: active ? "bg-ink/5 text-ink" : "" })}
    >
      Invoices
    </Link>
  );
}

export function InvoicesNavLink() {
  return <NavLink active={usePathname() === "/"} />;
}

/** Rendered while the pathname is unknown (prerendering dynamic routes). */
export function InvoicesNavLinkFallback() {
  return <NavLink active={false} />;
}
