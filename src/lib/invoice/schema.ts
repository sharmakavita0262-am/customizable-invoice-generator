import { z } from "zod";
import { ACCENT_IDS } from "./accents";
import { calculateTotals, QUANTITY_DECIMALS, TAX_RATE_DECIMALS } from "./calculations";
import { formatUSD, hasAtMostDecimals } from "./money";

/**
 * The single source of truth for what a valid invoice is. The editor, the API
 * routes and the database layer all validate against these schemas.
 */

export const LIMITS = {
  maxLineItems: 100,
  maxCustomFields: 20,
  // Chosen so the largest possible invoice (100 lines x max qty x max price)
  // stays below Number.MAX_SAFE_INTEGER cents and totals remain exact.
  maxQuantity: 100_000,
  maxUnitPriceCents: 100_000_000, // $1,000,000.00
  maxTaxRatePercent: 100,
} as const;

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address");

export const partySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Keep the name under 120 characters"),
  email: optionalEmail,
  address: z.string().trim().max(500, "Keep the address under 500 characters"),
});

export const lineItemSchema = z.object({
  id: z.string().min(1).max(64),
  description: z
    .string()
    .trim()
    .min(1, "Add a description")
    .max(500, "Keep the description under 500 characters"),
  quantity: z
    .number()
    .min(0, "Quantity can't be negative")
    .max(LIMITS.maxQuantity, "Quantity is too large")
    .refine((value) => hasAtMostDecimals(value, QUANTITY_DECIMALS), "Use at most 3 decimal places"),
  unitPriceCents: z
    .int("Use whole cents")
    .min(0, "Price can't be negative")
    .max(LIMITS.maxUnitPriceCents, "Price is too large"),
});

export const customFieldSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1, "Add a label").max(60, "Keep the label under 60 characters"),
  value: z.string().trim().max(300, "Keep the value under 300 characters"),
  visible: z.boolean(),
});

const isoDate = z.iso.date("Pick a valid date");

function hasUniqueIds(items: { id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

export const invoiceInputSchema = z
  .object({
    invoiceNumber: z
      .string()
      .trim()
      .min(1, "Invoice number is required")
      .max(40, "Keep the invoice number under 40 characters"),
    issueDate: isoDate,
    dueDate: isoDate,
    from: partySchema,
    billTo: partySchema,
    lineItems: z
      .array(lineItemSchema)
      .min(1, "Add at least one line item")
      .max(LIMITS.maxLineItems, `Use at most ${LIMITS.maxLineItems} line items`)
      .refine(hasUniqueIds, "Line item ids must be unique"),
    discountCents: z.int("Use whole cents").min(0, "Discount can't be negative"),
    taxRatePercent: z
      .number()
      .min(0, "Tax rate can't be negative")
      .max(LIMITS.maxTaxRatePercent, "Tax rate can't exceed 100%")
      .refine((value) => hasAtMostDecimals(value, TAX_RATE_DECIMALS), "Use at most 3 decimal places"),
    notes: z.string().trim().max(2000, "Keep notes under 2,000 characters"),
    customFields: z
      .array(customFieldSchema)
      .max(LIMITS.maxCustomFields, `Use at most ${LIMITS.maxCustomFields} custom fields`)
      .refine(hasUniqueIds, "Custom field ids must be unique"),
    accent: z.enum(ACCENT_IDS),
  })
  .superRefine((invoice, ctx) => {
    for (const issue of crossFieldIssues(invoice)) {
      ctx.addIssue({ code: "custom", ...issue });
    }
  });

export type Party = z.infer<typeof partySchema>;
export type LineItem = z.infer<typeof lineItemSchema>;
export type CustomField = z.infer<typeof customFieldSchema>;
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export interface FieldIssue {
  path: (string | number)[];
  message: string;
}

/** Rules that depend on more than one field. */
export function crossFieldIssues(
  invoice: Pick<InvoiceInput, "issueDate" | "dueDate" | "lineItems" | "discountCents" | "taxRatePercent">,
): FieldIssue[] {
  const issues: FieldIssue[] = [];

  // ISO dates compare correctly as strings.
  if (invoice.issueDate && invoice.dueDate && invoice.dueDate < invoice.issueDate) {
    issues.push({ path: ["dueDate"], message: "Due date can't be before the issue date" });
  }

  const { subtotalCents } = calculateTotals(invoice);
  if (invoice.discountCents > subtotalCents) {
    issues.push({
      path: ["discountCents"],
      message: `Discount can't exceed the subtotal (${formatUSD(subtotalCents)})`,
    });
  }

  return issues;
}

/** A saved invoice as returned by the API. */
export interface InvoiceRecord extends InvoiceInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastEmail: { to: string; sentAt: string } | null;
}

/** The fields the invoice list needs. */
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  totalCents: number;
  updatedAt: string;
  lastEmailedAt: string | null;
}

export const sendInvoiceEmailSchema = z.object({
  to: z.string().trim().pipe(z.email("Enter a valid email address")),
  message: z.string().trim().max(1000, "Keep the message under 1,000 characters").default(""),
});

export type SendInvoiceEmailInput = z.infer<typeof sendInvoiceEmailSchema>;
