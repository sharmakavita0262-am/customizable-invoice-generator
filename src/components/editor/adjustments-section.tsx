"use client";

import { InputField } from "@/components/ui/field";
import { EditorSection } from "./editor-section";
import { useEditor } from "./editor-state";

export function AdjustmentsSection() {
  const { draft, dispatch, field } = useEditor();

  return (
    <EditorSection
      step="04"
      title="Discount & tax"
      description="The discount comes off the subtotal first; tax is then charged on what remains."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          {...field("discount")}
          label="Discount"
          hint="A fixed amount in USD"
          prefix="$"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          inputClassName="tabular-nums"
          value={draft.discount}
          onChange={(event) => dispatch({ type: "setField", field: "discount", value: event.target.value })}
        />
        <InputField
          {...field("taxRate")}
          label="Tax rate"
          hint="Percentage, e.g. 8.875"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          inputClassName="tabular-nums"
          value={draft.taxRate}
          onChange={(event) => dispatch({ type: "setField", field: "taxRate", value: event.target.value })}
        />
      </div>
    </EditorSection>
  );
}
