"use client";

import { Check } from "lucide-react";
import { TextAreaField } from "@/components/ui/field";
import { ACCENTS } from "@/lib/invoice/accents";
import { EditorSection } from "./editor-section";
import { useEditor } from "./editor-state";

export function NotesStyleSection() {
  const { draft, dispatch, field } = useEditor();

  return (
    <EditorSection step="06" title="Notes & style">
      <TextAreaField
        {...field("notes")}
        label="Notes"
        hint="Payment instructions, a thank-you, terms…"
        rows={3}
        value={draft.notes}
        onChange={(event) => dispatch({ type: "setField", field: "notes", value: event.target.value })}
      />

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium text-ink-soft">Accent colour</legend>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((accent) => {
            const checked = draft.accent === accent.id;
            return (
              <label key={accent.id} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="accent"
                  value={accent.id}
                  checked={checked}
                  onChange={() => dispatch({ type: "setAccent", accent: accent.id })}
                  className="peer sr-only"
                />
                <span
                  className={`flex items-center gap-2 rounded-full border bg-white py-1.5 pr-3 pl-1.5 text-sm transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand ${
                    checked ? "border-ink font-medium" : "border-line-strong/50 hover:border-ink-soft"
                  }`}
                >
                  <span
                    aria-hidden
                    className="grid size-6 place-items-center rounded-full text-white"
                    style={{ backgroundColor: accent.color }}
                  >
                    {checked && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  {accent.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </EditorSection>
  );
}
