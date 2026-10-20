import { DEFAULT_ACCENT, type AccentId } from "./accents";
import { QUANTITY_DECIMALS, TAX_RATE_DECIMALS } from "./calculations";
import { addDays } from "./dates";
import { centsToInput, numberToInput, parseDecimal, type DecimalParseError } from "./money";
import {
  crossFieldIssues,
  invoiceInputSchema,
  type CustomField,
  type InvoiceInput,
  type InvoiceRecord,
  type Party,
} from "./schema";

/**
 * The editor works on a "draft": numeric fields stay as the strings the user
 * typed, so half-finished input like "12." is never lost. `evaluateDraft`
 * turns a draft into a validated `InvoiceInput` plus per-field errors.
 */

export interface LineItemDraft {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface InvoiceDraft {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  from: Party;
  billTo: Party;
  lineItems: LineItemDraft[];
  discount: string;
  taxRate: string;
  notes: string;
  customFields: CustomField[];
  accent: AccentId;
}

/** Field errors keyed by draft path, e.g. "lineItems.0.quantity". */
export type FieldErrors = Record<string, string>;

export interface DraftEvaluation {
  /** Best-effort values for the live preview; unparseable numbers count as 0. */
  values: InvoiceInput;
  errors: FieldErrors;
  /** The validated payload to save, or null while there are errors. */
  valid: InvoiceInput | null;
}

export const DEFAULT_PAYMENT_TERMS_DAYS = 30;

export function newId(): string {
  // randomUUID only exists in secure contexts (HTTPS or localhost); opening the
  // dev server from a phone over the LAN is plain HTTP.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function emptyLineItem(): LineItemDraft {
  return { id: newId(), description: "", quantity: "1", unitPrice: "" };
}

export function createEmptyDraft(options: { invoiceNumber: string; today: string }): InvoiceDraft {
  return {
    invoiceNumber: options.invoiceNumber,
    issueDate: options.today,
    dueDate: addDays(options.today, DEFAULT_PAYMENT_TERMS_DAYS),
    from: { name: "", email: "", address: "" },
    billTo: { name: "", email: "", address: "" },
    lineItems: [emptyLineItem()],
    discount: "",
    taxRate: "",
    notes: "Thank you for your business!",
    customFields: [],
    accent: DEFAULT_ACCENT,
  };
}

/** Fictional sample content so the editor can be demoed in one click. */
export function sampleDraft(base: InvoiceDraft): InvoiceDraft {
  return {
    ...base,
    from: {
      name: "Example Design Studio",
      email: "billing@example.com",
      address: "42 Harbor Lane\nPortland, OR 97201\nUnited States",
    },
    billTo: {
      name: "Example Bakery",
      email: "accounts@example.com",
      address: "118 Market Street\nSeattle, WA 98101\nUnited States",
    },
    lineItems: [
      { id: newId(), description: "Brand identity workshop", quantity: "2", unitPrice: "50" },
      { id: newId(), description: "Menu illustration (per hour)", quantity: "3.5", unitPrice: "84.25" },
    ],
    discount: "10",
    taxRate: "10",
    notes: "Thank you for your business! Payment by bank transfer within 30 days.",
    customFields: [
      { id: newId(), label: "PO Number", value: "PO-7731", visible: true },
      { id: newId(), label: "Project", value: "Spring rebrand", visible: true },
      { id: newId(), label: "Internal note", value: "Client prefers email", visible: false },
    ],
  };
}

export function recordToDraft(record: InvoiceRecord): InvoiceDraft {
  return {
    invoiceNumber: record.invoiceNumber,
    issueDate: record.issueDate,
    dueDate: record.dueDate,
    from: { ...record.from },
    billTo: { ...record.billTo },
    lineItems: record.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: numberToInput(item.quantity),
      unitPrice: centsToInput(item.unitPriceCents),
    })),
    discount: record.discountCents ? centsToInput(record.discountCents) : "",
    taxRate: record.taxRatePercent ? numberToInput(record.taxRatePercent) : "",
    notes: record.notes,
    customFields: record.customFields.map((field) => ({ ...field })),
    accent: record.accent,
  };
}

const NUMBER_MESSAGES: Record<DecimalParseError, (decimals: number) => string> = {
  empty: () => "Required",
  invalid: () => "Enter a number",
  negative: () => "Can't be negative",
  precision: (decimals) => `Use at most ${decimals} decimal places`,
  too_large: () => "Number is too large",
};

interface NumberField {
  path: string;
  raw: string;
  decimals: number;
  /** Empty input means zero instead of "Required". */
  optional?: boolean;
}

/** Schema paths use API names; map them back onto draft field names. */
export function schemaPathToDraftPath(path: readonly PropertyKey[]): string {
  return path
    .map((segment) => {
      if (segment === "discountCents") return "discount";
      if (segment === "taxRatePercent") return "taxRate";
      if (segment === "unitPriceCents") return "unitPrice";
      return String(segment);
    })
    .join(".");
}

export function evaluateDraft(draft: InvoiceDraft): DraftEvaluation {
  const errors: FieldErrors = {};

  const readNumber = ({ path, raw, decimals, optional }: NumberField): number => {
    const result = parseDecimal(raw, decimals);
    if (result.ok) return result.scaled;
    if (result.error === "empty" && optional) return 0;
    errors[path] = NUMBER_MESSAGES[result.error](decimals);
    return 0;
  };

  const values: InvoiceInput = {
    invoiceNumber: draft.invoiceNumber,
    issueDate: draft.issueDate,
    dueDate: draft.dueDate,
    from: draft.from,
    billTo: draft.billTo,
    lineItems: draft.lineItems.map((item, index) => ({
      id: item.id,
      description: item.description,
      quantity:
        readNumber({ path: `lineItems.${index}.quantity`, raw: item.quantity, decimals: QUANTITY_DECIMALS }) /
        10 ** QUANTITY_DECIMALS,
      unitPriceCents: readNumber({ path: `lineItems.${index}.unitPrice`, raw: item.unitPrice, decimals: 2 }),
    })),
    discountCents: readNumber({ path: "discount", raw: draft.discount, decimals: 2, optional: true }),
    taxRatePercent:
      readNumber({ path: "taxRate", raw: draft.taxRate, decimals: TAX_RATE_DECIMALS, optional: true }) /
      10 ** TAX_RATE_DECIMALS,
    notes: draft.notes,
    customFields: draft.customFields,
    accent: draft.accent,
  };

  const parsed = invoiceInputSchema.safeParse(values);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = schemaPathToDraftPath(issue.path);
      // A parse error ("Enter a number") is more useful than the schema's follow-up.
      errors[path] ??= issue.message;
    }
  }

  // Cross-field rules are re-checked here because the schema skips refinements
  // when a field has the wrong type; the preview should still flag them.
  for (const issue of crossFieldIssues(values)) {
    errors[schemaPathToDraftPath(issue.path)] ??= issue.message;
  }

  const hasErrors = Object.keys(errors).length > 0;
  return { values, errors, valid: !hasErrors && parsed.success ? parsed.data : null };
}

/**
 * DOM id for the input that edits a given draft path. `scope` must be unique
 * per editor: Next.js keeps recently visited pages mounted (hidden), so two
 * editors can be in the document at the same time.
 */
export function fieldId(scope: string, path: string): string {
  return `${scope}field-${path.replace(/\./g, "-")}`;
}
