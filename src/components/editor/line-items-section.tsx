"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { formatUSD } from "@/lib/invoice/money";
import { LIMITS } from "@/lib/invoice/schema";
import { EditorSection } from "./editor-section";
import { useEditor } from "./editor-state";

const ROW_GRID = "sm:grid-cols-[minmax(0,1fr)_4.5rem_7rem_6rem_2rem]";

export function LineItemsSection() {
  const { draft, dispatch, field, fieldId, lineTotalsCents, subtotalCents } = useEditor();
  const addButton = useRef<HTMLButtonElement>(null);
  const atLimit = draft.lineItems.length >= LIMITS.maxLineItems;
  const listError = field("lineItems").error;

  function addLine() {
    // Render synchronously so the new row exists before moving focus into it.
    flushSync(() => dispatch({ type: "addLine" }));
    document.getElementById(fieldId(`lineItems.${draft.lineItems.length}.description`))?.focus();
  }

  function removeLine(id: string) {
    dispatch({ type: "removeLine", id });
    addButton.current?.focus();
  }

  return (
    <EditorSection
      step="03"
      title="Line items"
      description="Each line is rounded to the cent before it's added to the subtotal."
    >
      <div
        aria-hidden
        className={`mb-2 hidden gap-3 px-1 text-xs font-medium tracking-wide text-muted uppercase sm:grid ${ROW_GRID}`}
      >
        <span>Description</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      <ol className="space-y-3">
        {draft.lineItems.map((item, index) => {
          const n = index + 1;
          const path = (name: string) => `lineItems.${index}.${name}`;
          return (
            <li
              key={item.id}
              className={`relative grid grid-cols-3 gap-3 rounded-xl border border-line bg-paper/50 p-3 sm:border-0 sm:bg-transparent sm:p-0 ${ROW_GRID}`}
            >
              <InputField
                {...field(path("description"))}
                className="col-span-3 pr-10 sm:col-span-1 sm:pr-0"
                hideLabel="sm"
                label={
                  <>
                    Description<span className="sr-only">, item {n}</span>
                  </>
                }
                placeholder="Service or product"
                value={item.description}
                onChange={(event) =>
                  dispatch({ type: "updateLine", id: item.id, field: "description", value: event.target.value })
                }
              />
              <InputField
                {...field(path("quantity"))}
                hideLabel="sm"
                label={
                  <>
                    Quantity<span className="sr-only">, item {n}</span>
                  </>
                }
                inputMode="decimal"
                autoComplete="off"
                inputClassName="text-right tabular-nums"
                value={item.quantity}
                onChange={(event) =>
                  dispatch({ type: "updateLine", id: item.id, field: "quantity", value: event.target.value })
                }
              />
              <InputField
                {...field(path("unitPrice"))}
                hideLabel="sm"
                label={
                  <>
                    Unit price<span className="sr-only">, item {n}</span>
                  </>
                }
                prefix="$"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                inputClassName="text-right tabular-nums"
                value={item.unitPrice}
                onChange={(event) =>
                  dispatch({ type: "updateLine", id: item.id, field: "unitPrice", value: event.target.value })
                }
              />
              <div className="text-right">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft sm:sr-only">Amount</span>
                <output
                  aria-label={`Amount, item ${n}`}
                  className="flex h-10 items-center justify-end font-medium tabular-nums"
                >
                  {formatUSD(lineTotalsCents[index] ?? 0)}
                </output>
              </div>
              <div className="absolute top-3 right-3 sm:static sm:flex sm:h-10 sm:items-center">
                <IconButton
                  label={`Remove item ${n}${item.description ? `: ${item.description}` : ""}`}
                  variant="danger"
                  disabled={draft.lineItems.length === 1}
                  onClick={() => removeLine(item.id)}
                >
                  <Trash2 aria-hidden />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ol>

      {listError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {listError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-4">
        <Button ref={addButton} onClick={addLine} disabled={atLimit}>
          <Plus aria-hidden />
          Add line item
        </Button>
        <p className="text-sm text-muted">
          Subtotal <span className="ml-2 font-medium text-ink tabular-nums">{formatUSD(subtotalCents)}</span>
        </p>
      </div>
    </EditorSection>
  );
}
