"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { InputField, TextAreaField } from "@/components/ui/field";
import { ApiError } from "@/lib/api-client";
import { sendInvoiceEmailSchema } from "@/lib/invoice/schema";

interface SendEmailDialogProps {
  open: boolean;
  defaultTo: string;
  invoiceLabel: string;
  totalLabel: string;
  hasUnsavedChanges: boolean;
  onClose: () => void;
  /** Saves if needed and sends. Throws ApiError when delivery fails. */
  onSend: (input: { to: string; message: string }) => Promise<void>;
}

/** Uses the native <dialog> element: focus is trapped and Escape closes it. */
export function SendEmailDialog(props: SendEmailDialogProps) {
  const { open, onClose } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ids = useDialogIds();

  // A layout effect, so the dialog opens/closes in the same flushSync'd render.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // React's autoFocus runs before showModal(), so focus the first field explicitly.
      document.getElementById(ids.to)?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, ids.to]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={ids.title}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-surface p-0 text-ink shadow-2xl"
    >
      {/* Remount the form on each open so it starts from fresh defaults. */}
      {open && <SendEmailForm {...props} ids={ids} />}
    </dialog>
  );
}

function useDialogIds() {
  const id = useId();
  return { title: `${id}title`, to: `${id}to`, message: `${id}message` };
}

function SendEmailForm({
  defaultTo,
  invoiceLabel,
  totalLabel,
  hasUnsavedChanges,
  onClose,
  onSend,
  ids,
}: SendEmailDialogProps & { ids: ReturnType<typeof useDialogIds> }) {
  const [to, setTo] = useState(defaultTo);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ to?: string; message?: string; form?: string }>({});
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = sendInvoiceEmailSchema.safeParse({ to, message });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] === "message" ? "message" : "to";
        next[key] ??= issue.message;
      }
      setErrors(next);
      document.getElementById(next.to ? ids.to : ids.message)?.focus();
      return;
    }

    setErrors({});
    setSending(true);
    try {
      await onSend(parsed.data);
    } catch (error) {
      if (error instanceof ApiError && error.issues.some((issue) => issue.path[0] === "to")) {
        setErrors({ to: error.issues.find((issue) => issue.path[0] === "to")?.message, form: error.message });
        document.getElementById(ids.to)?.focus();
      } else {
        setErrors({ form: error instanceof Error ? error.message : "The email could not be sent." });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="p-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id={ids.title} className="font-display text-xl font-semibold">
            Email invoice
          </h2>
          <p className="mt-1 text-sm text-muted">
            {invoiceLabel} · {totalLabel}
          </p>
        </div>
        <IconButton label="Close" onClick={onClose} className="-mt-1 -mr-2">
          <X aria-hidden />
        </IconButton>
      </div>

      <div className="mt-5 space-y-4">
        <InputField
          id={ids.to}
          type="email"
          label="Send to"
          autoComplete="email"
          spellCheck={false}
          placeholder="client@example.com"
          value={to}
          error={errors.to}
          hint="Only send test emails to an inbox you control."
          onChange={(event) => setTo(event.target.value)}
        />
        <TextAreaField
          id={ids.message}
          label="Personal message"
          hint="Optional · shown above the invoice"
          rows={3}
          value={message}
          error={errors.message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Hi! Here's the invoice for this month's work."
        />
      </div>

      {hasUnsavedChanges && (
        <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">
          Your latest changes will be saved before sending.
        </p>
      )}

      {errors.form && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {errors.form}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={sending}>
          <Send aria-hidden />
          {sending ? "Sending…" : "Send invoice"}
        </Button>
      </div>
    </form>
  );
}
