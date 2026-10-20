import type { ComponentProps, ReactNode } from "react";
import { CircleAlert } from "lucide-react";

/**
 * Labelled form controls. Each control is linked to its label, hint and error
 * message (`aria-describedby`), and flagged with `aria-invalid` on error.
 */

export const controlClasses = [
  "block w-full rounded-lg border bg-white px-3 text-[0.9375rem] text-ink transition-colors",
  "hover:border-ink-soft/70 focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0",
  "aria-invalid:border-danger aria-invalid:bg-danger-soft/40 aria-invalid:focus-visible:outline-danger",
].join(" ");

const LABEL_CLASSES = "mb-1.5 block text-sm font-medium text-ink-soft";

interface FieldShellProps {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: string;
  /**
   * Hide the label visually (it stays available to screen readers). "sm" hides
   * it from the small breakpoint up, where a table-style header takes over.
   */
  hideLabel?: boolean | "sm";
  className?: string;
  children: (describedBy: string | undefined) => ReactNode;
}

function FieldShell({ id, label, error, hint, hideLabel, className = "", children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={hideLabel === true ? "sr-only" : hideLabel === "sm" ? `${LABEL_CLASSES} sm:sr-only` : LABEL_CLASSES}
      >
        {label}
      </label>
      {children(describedBy)}
      {error ? (
        <p id={errorId} className="mt-1.5 flex items-start gap-1 text-sm text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputFieldProps = Omit<ComponentProps<"input">, "id" | "className"> & {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: string;
  hideLabel?: boolean | "sm";
  className?: string;
  inputClassName?: string;
  /** Text shown inside the control before the value, e.g. "$". */
  prefix?: string;
  suffix?: string;
};

export function InputField({
  id,
  label,
  error,
  hint,
  hideLabel,
  className,
  inputClassName = "",
  prefix,
  suffix,
  ...props
}: InputFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} hideLabel={hideLabel} className={className}>
      {(describedBy) => (
        <div className="relative">
          {prefix && (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
              {prefix}
            </span>
          )}
          <input
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`${controlClasses} border-line-strong/60 h-10 ${prefix ? "pl-7" : ""} ${suffix ? "pr-8" : ""} ${inputClassName}`}
            {...props}
          />
          {suffix && (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
              {suffix}
            </span>
          )}
        </div>
      )}
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "id" | "className"> & {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: string;
  className?: string;
};

export function TextAreaField({ id, label, error, hint, className, rows = 3, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      {(describedBy) => (
        <textarea
          id={id}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${controlClasses} border-line-strong/60 resize-y py-2 leading-relaxed`}
          {...props}
        />
      )}
    </FieldShell>
  );
}
