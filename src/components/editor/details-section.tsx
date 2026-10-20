"use client";

import { InputField } from "@/components/ui/field";
import { addDays } from "@/lib/invoice/dates";
import { EditorSection } from "./editor-section";
import { useEditor } from "./editor-state";

const PAYMENT_TERMS = [
  { label: "On receipt", days: 0 },
  { label: "15 days", days: 15 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
];

export function DetailsSection() {
  const { draft, dispatch, field } = useEditor();

  return (
    <EditorSection step="01" title="Invoice details">
      <div className="grid gap-4 sm:grid-cols-3">
        <InputField
          {...field("invoiceNumber")}
          label="Invoice number"
          value={draft.invoiceNumber}
          onChange={(event) => dispatch({ type: "setField", field: "invoiceNumber", value: event.target.value })}
          autoComplete="off"
          spellCheck={false}
          inputClassName="font-mono"
        />
        <InputField
          {...field("issueDate")}
          type="date"
          label="Issue date"
          value={draft.issueDate}
          onChange={(event) => dispatch({ type: "setField", field: "issueDate", value: event.target.value })}
        />
        <InputField
          {...field("dueDate")}
          type="date"
          label="Due date"
          value={draft.dueDate}
          min={draft.issueDate || undefined}
          onChange={(event) => dispatch({ type: "setField", field: "dueDate", value: event.target.value })}
        />
      </div>

      <div role="group" aria-label="Payment terms" className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-muted">Payment due</span>
        {PAYMENT_TERMS.map((term) => {
          const dueDate = draft.issueDate ? addDays(draft.issueDate, term.days) : "";
          const active = Boolean(dueDate) && dueDate === draft.dueDate;
          return (
            <button
              key={term.days}
              type="button"
              aria-pressed={active}
              disabled={!draft.issueDate}
              onClick={() => dispatch({ type: "setField", field: "dueDate", value: dueDate })}
              className={`rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
                active
                  ? "border-brand bg-brand-soft font-medium text-brand"
                  : "border-line-strong/50 bg-white text-ink-soft hover:border-ink-soft"
              }`}
            >
              {term.label}
            </button>
          );
        })}
      </div>
    </EditorSection>
  );
}
