"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { LIMITS } from "@/lib/invoice/schema";
import { EditorSection } from "./editor-section";
import { useEditor } from "./editor-state";

export function CustomFieldsSection() {
  const { draft, dispatch, field, fieldId } = useEditor();
  const addButton = useRef<HTMLButtonElement>(null);
  const fields = draft.customFields;
  const atLimit = fields.length >= LIMITS.maxCustomFields;

  function addField() {
    flushSync(() => dispatch({ type: "addCustomField" }));
    document.getElementById(fieldId(`customFields.${fields.length}.label`))?.focus();
  }

  function removeField(id: string) {
    dispatch({ type: "removeCustomField", id });
    addButton.current?.focus();
  }

  return (
    <EditorSection
      step="05"
      title="Custom fields"
      description="Extra details like a PO number or project name. Visible fields appear on the invoice; they never affect totals."
    >
      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong/50 px-4 py-6 text-center text-sm text-muted">
          No custom fields yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((custom, index) => {
            const name = custom.label.trim() || `field ${index + 1}`;
            return (
              <li
                key={custom.id}
                className={`grid gap-3 rounded-xl border p-3 transition-colors sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] ${
                  custom.visible ? "border-line bg-white" : "border-dashed border-line-strong/50 bg-paper/60"
                }`}
              >
                <InputField
                  {...field(`customFields.${index}.label`)}
                  label={
                    <>
                      Label<span className="sr-only">, custom field {index + 1}</span>
                    </>
                  }
                  placeholder="e.g. PO Number"
                  value={custom.label}
                  onChange={(event) =>
                    dispatch({ type: "updateCustomField", id: custom.id, patch: { label: event.target.value } })
                  }
                />
                <InputField
                  {...field(`customFields.${index}.value`)}
                  label={
                    <>
                      Value<span className="sr-only">, custom field {index + 1}</span>
                    </>
                  }
                  placeholder="e.g. PO-7731"
                  value={custom.value}
                  onChange={(event) =>
                    dispatch({ type: "updateCustomField", id: custom.id, patch: { value: event.target.value } })
                  }
                />
                <div className="flex items-center justify-between gap-2 sm:items-end sm:justify-end sm:pb-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={custom.visible}
                    onClick={() =>
                      dispatch({ type: "updateCustomField", id: custom.id, patch: { visible: !custom.visible } })
                    }
                    className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm text-ink-soft hover:bg-ink/5"
                  >
                    <span
                      aria-hidden
                      className={`relative h-5 w-9 rounded-full transition-colors ${custom.visible ? "bg-brand" : "bg-line-strong"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${custom.visible ? "translate-x-4" : ""}`}
                      />
                    </span>
                    <span>
                      Show on invoice<span className="sr-only">: {name}</span>
                    </span>
                  </button>
                  <IconButton label={`Remove ${name}`} variant="danger" onClick={() => removeField(custom.id)}>
                    <Trash2 aria-hidden />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4">
        <Button ref={addButton} onClick={addField} disabled={atLimit}>
          <Plus aria-hidden />
          Add custom field
        </Button>
      </div>
    </EditorSection>
  );
}
