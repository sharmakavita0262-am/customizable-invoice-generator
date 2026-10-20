"use client";

import { createContext, useContext, type Dispatch } from "react";
import type { AccentId } from "@/lib/invoice/accents";
import { emptyLineItem, newId, type InvoiceDraft, type LineItemDraft } from "@/lib/invoice/draft";
import type { CustomField, Party } from "@/lib/invoice/schema";

export type DraftAction =
  | { type: "setField"; field: "invoiceNumber" | "issueDate" | "dueDate" | "discount" | "taxRate" | "notes"; value: string }
  | { type: "setAccent"; accent: AccentId }
  | { type: "setParty"; party: "from" | "billTo"; field: keyof Party; value: string }
  | { type: "addLine" }
  | { type: "updateLine"; id: string; field: keyof Omit<LineItemDraft, "id">; value: string }
  | { type: "removeLine"; id: string }
  | { type: "addCustomField" }
  | { type: "updateCustomField"; id: string; patch: Partial<Omit<CustomField, "id">> }
  | { type: "removeCustomField"; id: string }
  | { type: "replace"; draft: InvoiceDraft };

export function draftReducer(draft: InvoiceDraft, action: DraftAction): InvoiceDraft {
  switch (action.type) {
    case "setField":
      return { ...draft, [action.field]: action.value };
    case "setAccent":
      return { ...draft, accent: action.accent };
    case "setParty":
      return { ...draft, [action.party]: { ...draft[action.party], [action.field]: action.value } };
    case "addLine":
      return { ...draft, lineItems: [...draft.lineItems, emptyLineItem()] };
    case "updateLine":
      return {
        ...draft,
        lineItems: draft.lineItems.map((item) =>
          item.id === action.id ? { ...item, [action.field]: action.value } : item,
        ),
      };
    case "removeLine":
      return { ...draft, lineItems: draft.lineItems.filter((item) => item.id !== action.id) };
    case "addCustomField":
      return {
        ...draft,
        customFields: [...draft.customFields, { id: newId(), label: "", value: "", visible: true }],
      };
    case "updateCustomField":
      return {
        ...draft,
        customFields: draft.customFields.map((field) =>
          field.id === action.id ? { ...field, ...action.patch } : field,
        ),
      };
    case "removeCustomField":
      return { ...draft, customFields: draft.customFields.filter((field) => field.id !== action.id) };
    case "replace":
      return action.draft;
  }
}

export interface BoundField {
  id: string;
  /** The error to display, once the field has been visited or the form submitted. */
  error: string | undefined;
  onBlur: () => void;
}

interface EditorContextValue {
  draft: InvoiceDraft;
  dispatch: Dispatch<DraftAction>;
  /** Props that connect an input to its draft path: id, visible error and blur tracking. */
  field: (path: string) => BoundField;
  /** The DOM id of the input for a draft path, unique to this editor instance. */
  fieldId: (path: string) => string;
  lineTotalsCents: number[];
  subtotalCents: number;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider = EditorContext.Provider;

export function useEditor(): EditorContextValue {
  const value = useContext(EditorContext);
  if (!value) throw new Error("useEditor must be used inside <EditorProvider>");
  return value;
}
