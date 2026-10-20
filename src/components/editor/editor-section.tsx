import { useId, type ReactNode } from "react";

export function EditorSection({
  step,
  title,
  description,
  actions,
  children,
}: {
  step: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start gap-x-3 gap-y-3">
        <span aria-hidden className="pt-1 font-mono text-xs text-muted">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-display text-lg leading-snug font-semibold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
