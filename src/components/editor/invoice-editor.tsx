"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Download, Send, Sparkles } from "lucide-react";
import { InvoiceSheet } from "@/components/invoice/invoice-sheet";
import { Button, IconButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ApiError, createInvoice, emailInvoice, updateInvoice } from "@/lib/api-client";
import { calculateTotals } from "@/lib/invoice/calculations";
import { formatTimestamp } from "@/lib/invoice/dates";
import {
  evaluateDraft,
  fieldId,
  sampleDraft,
  schemaPathToDraftPath,
  type FieldErrors,
  type InvoiceDraft,
} from "@/lib/invoice/draft";
import { formatUSD } from "@/lib/invoice/money";
import type { InvoiceRecord } from "@/lib/invoice/schema";
import { AdjustmentsSection } from "./adjustments-section";
import { CustomFieldsSection } from "./custom-fields-section";
import { DetailsSection } from "./details-section";
import { draftReducer, EditorProvider, type BoundField, type DraftAction } from "./editor-state";
import { LineItemsSection } from "./line-items-section";
import { NotesStyleSection } from "./notes-style-section";
import { PartiesSection } from "./parties-section";
import { SendEmailDialog } from "./send-email-dialog";

/** Numeric and date fields validate while typing; text fields wait until blur. */
const LIVE_VALIDATION = /^(discount|taxRate|dueDate)$|\.(quantity|unitPrice)$/;

/** Reads a draft value by its error path, e.g. "lineItems.0.description". */
function valueAtPath(draft: InvoiceDraft, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], draft);
}


function LocalTime({ iso }: { iso: string }) {
  // Formatted in the viewer's time zone, which may differ from the server's.
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {formatTimestamp(iso)}
    </time>
  );
}

export function InvoiceEditor({
  initialDraft,
  initialRecord,
}: {
  initialDraft: InvoiceDraft;
  initialRecord: InvoiceRecord | null;
}) {
  const router = useRouter();
  const toast = useToast();
  // Unique per instance: hidden, preserved pages may hold another editor.
  const scope = useId();
  const formId = `${scope}invoice-form`;
  const formRef = useRef<HTMLFormElement>(null);

  const [draft, dispatchDraft] = useReducer(draftReducer, initialDraft);
  const [record, setRecord] = useState(initialRecord);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialDraft));
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  // State updates are async, so a ref blocks a second save fired before re-render (e.g. Ctrl+S twice).
  const savingRef = useRef(false);
  // Mirrors record?.id synchronously, so a save fired before React re-renders
  // after the first create updates that invoice instead of creating a second one.
  const savedIdRef = useRef(initialRecord?.id ?? null);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [emailOpen, setEmailOpen] = useState(false);

  const evaluation = useMemo(() => evaluateDraft(draft), [draft]);
  const totals = useMemo(() => calculateTotals(evaluation.values), [evaluation.values]);
  const snapshot = useMemo(() => JSON.stringify(draft), [draft]);
  const hasChanges = snapshot !== savedSnapshot;
  const hiddenFieldCount = draft.customFields.filter((field) => !field.visible).length;

  const dispatch = useCallback((action: DraftAction) => {
    // Server-side errors describe the old values; drop them once the user edits.
    setServerErrors((current) => (Object.keys(current).length ? {} : current));
    dispatchDraft(action);
  }, []);

  const field = useCallback(
    (path: string): BoundField => {
      const serverError = serverErrors[path];
      const error = serverError ?? evaluation.errors[path];
      // Wrong values are flagged as soon as they're typed or left, but an empty
      // required field only after a save attempt: flagging it on blur shifts the
      // layout under the pointer and swallows clicks on the buttons below.
      const value = valueAtPath(draft, path);
      const isBlank = typeof value === "string" && value.trim() === "";
      const show =
        Boolean(serverError) || submitted || (!isBlank && (touched.has(path) || LIVE_VALIDATION.test(path)));
      return {
        id: fieldId(scope, path),
        error: show ? error : undefined,
        onBlur: () => setTouched((current) => (current.has(path) ? current : new Set(current).add(path))),
      };
    },
    [draft, evaluation.errors, scope, serverErrors, submitted, touched],
  );

  const context = useMemo(
    () => ({
      draft,
      dispatch,
      field,
      fieldId: (path: string) => fieldId(scope, path),
      lineTotalsCents: totals.lineTotalsCents,
      subtotalCents: totals.subtotalCents,
    }),
    [draft, dispatch, field, scope, totals],
  );

  function focusFirstInvalidField() {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }

  function revealErrors() {
    flushSync(() => {
      setSubmitted(true);
      setMobileView("edit");
    });
    focusFirstInvalidField();
  }

  function showApiError(error: unknown, title: string) {
    if (error instanceof ApiError && error.issues.length > 0) {
      const mapped = Object.fromEntries(
        error.issues.map((issue) => [schemaPathToDraftPath(issue.path), issue.message]),
      );
      flushSync(() => setServerErrors(mapped));
      revealErrors();
    }
    toast({ tone: "error", title, description: error instanceof Error ? error.message : undefined });
  }

  /** Validates and saves. Returns the saved record, or null if it couldn't be saved. */
  async function save({ quiet = false, navigate = true } = {}): Promise<InvoiceRecord | null> {
    if (savingRef.current) return null;
    if (!evaluation.valid) {
      const count = Object.keys(evaluation.errors).length;
      revealErrors();
      toast({
        tone: "error",
        title: "Some fields need attention",
        description: `Fix ${count} highlighted ${count === 1 ? "field" : "fields"} to save the invoice.`,
      });
      return null;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const existingId = savedIdRef.current;
      const saved = existingId
        ? await updateInvoice(existingId, evaluation.valid)
        : await createInvoice(evaluation.valid);
      savedIdRef.current = saved.id;
      setRecord(saved);
      setSavedSnapshot(snapshot);
      if (!existingId && navigate) goToSavedInvoice(saved.id);
      if (!quiet) toast({ tone: "success", title: existingId ? "Changes saved" : "Invoice saved" });
      return saved;
    } catch (error) {
      showApiError(error, "Couldn't save the invoice");
      return null;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  /** Gives a newly created invoice its own URL, so a reload loads it from the database. */
  function goToSavedInvoice(id: string) {
    router.replace(`/invoices/${id}`, { scroll: false });
  }

  async function handleSave() {
    await save();
  }

  async function handleSend({ to, message }: { to: string; message: string }) {
    if (!evaluation.valid) {
      // Close the modal first: while it is open the rest of the page is inert,
      // so the first invalid field could not receive focus.
      flushSync(() => setEmailOpen(false));
      await save();
      return;
    }

    const isNew = !savedIdRef.current;
    const saved = hasChanges || isNew || !record ? await save({ quiet: true, navigate: false }) : record;
    if (!saved) {
      setEmailOpen(false);
      return;
    }

    let result: Awaited<ReturnType<typeof emailInvoice>>;
    try {
      result = await emailInvoice(saved.id, { to, message });
    } catch (error) {
      // For a saved invoice the dialog shows the error next to the field.
      if (!isNew) throw error;
      // A new invoice was just created, so move to its URL either way (which
      // closes the dialog) and report the failure as a toast instead.
      toast({
        tone: "error",
        title: "Invoice saved, but the email wasn't sent",
        description: error instanceof Error ? error.message : undefined,
      });
      goToSavedInvoice(saved.id);
      return;
    }

    setRecord({ ...saved, lastEmail: result.lastEmail });
    setEmailOpen(false);
    toast({
      tone: "success",
      title: `Invoice sent to ${to}`,
      description: result.previewUrl ? (
        <a href={result.previewUrl} target="_blank" rel="noreferrer" className="font-medium text-brand underline">
          Open the test inbox preview
        </a>
      ) : undefined,
    });
    if (isNew) goToSavedInvoice(saved.id);
  }

  function printInvoice() {
    // The document title becomes the suggested PDF file name.
    const previousTitle = document.title;
    document.title = [draft.invoiceNumber.trim() || "Invoice", draft.billTo.name.trim()].filter(Boolean).join(" - ");
    window.addEventListener("afterprint", () => (document.title = previousTitle), { once: true });
    window.print();
  }

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void handleSave();
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onShortcut(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (!hasChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasChanges]);

  // When Next.js hides this page during navigation, close the modal dialog.
  useLayoutEffect(() => () => setEmailOpen(false), []);

  let status: ReactNode;
  if (saving) status = "Saving…";
  else if (!record) status = hasChanges ? "Draft · not saved yet" : "Not saved yet";
  else if (hasChanges) status = "Unsaved changes";
  else
    status = (
      <>
        Saved <LocalTime iso={record.updatedAt} />
      </>
    );

  const statusTone = saving ? "bg-muted" : !record || hasChanges ? "bg-amber-500" : "bg-brand";

  return (
    <EditorProvider value={context}>
      <div className="mx-auto max-w-[1440px] px-4 pb-28 sm:px-6 lg:px-8 lg:pb-16 print:max-w-none print:p-0">
        {/* Title and actions */}
        <div className="-mx-4 mb-6 border-b border-line bg-paper/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:sticky lg:top-16 lg:z-20 lg:-mx-8 lg:px-8 print:hidden">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted">{record ? "Editing invoice" : "New invoice"}</p>
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {draft.invoiceNumber.trim() || "Untitled invoice"}
              </h1>
            </div>

            <div className="flex flex-col items-start gap-0.5 text-sm sm:items-end">
              <p role="status" className="flex items-center gap-2 text-ink-soft">
                <span aria-hidden className={`size-2 rounded-full ${statusTone}`} />
                {status}
              </p>
              {record?.lastEmail && (
                <p className="text-muted">
                  Emailed to {record.lastEmail.to} · <LocalTime iso={record.lastEmail.sentAt} />
                </p>
              )}
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              {!record && (
                <Button variant="ghost" onClick={() => dispatch({ type: "replace", draft: sampleDraft(draft) })}>
                  <Sparkles aria-hidden />
                  Sample data
                </Button>
              )}
              <Button onClick={printInvoice} title="Opens the print dialog. Choose “Save as PDF”.">
                <Download aria-hidden />
                Download PDF
              </Button>
              <Button onClick={() => setEmailOpen(true)}>
                <Send aria-hidden />
                Email
              </Button>
              <Button type="submit" form={formId} variant="primary" disabled={saving} className="min-w-24">
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile: switch between the form and the preview */}
        <div role="group" aria-label="View" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-ink/5 p-1 lg:hidden print:hidden">
          {(["edit", "preview"] as const).map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={mobileView === view}
              onClick={() => setMobileView(view)}
              className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                mobileView === view ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {view === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>

        {!record && (
          <Button
            variant="ghost"
            className="mb-4 lg:hidden print:hidden"
            onClick={() => dispatch({ type: "replace", draft: sampleDraft(draft) })}
          >
            <Sparkles aria-hidden />
            Fill with sample data
          </Button>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] xl:gap-10 print:block">
          <form
            id={formId}
            ref={formRef}
            noValidate
            aria-label="Invoice editor"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
            className={`space-y-5 print:hidden ${mobileView === "preview" ? "hidden lg:block" : ""}`}
          >
            <DetailsSection />
            <PartiesSection />
            <LineItemsSection />
            <AdjustmentsSection />
            <CustomFieldsSection />
            <NotesStyleSection />
          </form>

          <section
            aria-label="Live preview"
            // Scrolls on its own on desktop, so keyboard users must be able to focus it.
            tabIndex={0}
            className={`lg:sticky lg:top-44 lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto lg:rounded-sm lg:pb-2 lg:scrollbar-none print:static print:block print:max-h-none print:overflow-visible ${
              mobileView === "edit" ? "hidden lg:block" : ""
            }`}
          >
            <div className="mb-3 flex items-baseline justify-between gap-3 print:hidden">
              <h2 className="text-sm font-medium text-ink-soft">Live preview</h2>
              <p className="text-xs text-muted">
                {hiddenFieldCount > 0
                  ? `${hiddenFieldCount} hidden ${hiddenFieldCount === 1 ? "field is" : "fields are"} left off`
                  : "Updates as you type"}
              </p>
            </div>
            <InvoiceSheet invoice={evaluation.values} totals={totals} />
          </section>
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden print:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">Total due</p>
            <p className="font-display text-lg leading-tight font-semibold tabular-nums">
              {formatUSD(totals.totalCents)}
            </p>
          </div>
          <IconButton label="Download PDF" variant="secondary" size="md" onClick={printInvoice}>
            <Download aria-hidden />
          </IconButton>
          <IconButton label="Email invoice" variant="secondary" size="md" onClick={() => setEmailOpen(true)}>
            <Send aria-hidden />
          </IconButton>
          <Button type="submit" form={formId} variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <SendEmailDialog
        open={emailOpen}
        defaultTo={draft.billTo.email.trim()}
        invoiceLabel={draft.invoiceNumber.trim() || "Invoice"}
        totalLabel={formatUSD(totals.totalCents)}
        hasUnsavedChanges={hasChanges || !record}
        onClose={() => setEmailOpen(false)}
        onSend={handleSend}
      />
    </EditorProvider>
  );
}
