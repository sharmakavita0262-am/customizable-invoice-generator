import type Database from "better-sqlite3";
import { calculateTotals } from "@/lib/invoice/calculations";
import {
  invoiceInputSchema,
  type InvoiceInput,
  type InvoiceRecord,
  type InvoiceSummary,
} from "@/lib/invoice/schema";

/**
 * SQLite persistence for invoices.
 *
 * Each invoice is stored as a JSON document (it is always read and written as
 * a whole), with the columns the list view sorts and displays copied out next
 * to it. This module has no Next.js dependencies so it can be unit tested
 * against an in-memory database.
 */

/** Ordered schema migrations; `PRAGMA user_version` records how many have run. */
const MIGRATIONS = [
  `
  CREATE TABLE invoices (
    id             TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE COLLATE NOCASE,
    customer_name  TEXT NOT NULL,
    issue_date     TEXT NOT NULL,
    due_date       TEXT NOT NULL,
    total_cents    INTEGER NOT NULL,
    data           TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
  CREATE INDEX invoices_updated_at ON invoices (updated_at DESC);

  CREATE TABLE invoice_emails (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id  TEXT NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
    recipient   TEXT NOT NULL,
    message_id  TEXT,
    sent_at     TEXT NOT NULL
  );
  CREATE INDEX invoice_emails_invoice ON invoice_emails (invoice_id, sent_at DESC);
  `,
];

export function migrate(db: Database.Database): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version]);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}

export class DuplicateInvoiceNumberError extends Error {
  constructor(invoiceNumber: string) {
    super(`Invoice number "${invoiceNumber}" is already used by another invoice`);
    this.name = "DuplicateInvoiceNumberError";
  }
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_name: string;
  issue_date: string;
  due_date: string;
  total_cents: number;
  data: string;
  created_at: string;
  updated_at: string;
  last_email_to: string | null;
  last_email_at: string | null;
}

const LAST_EMAIL_COLUMNS = `
  (SELECT recipient FROM invoice_emails e WHERE e.invoice_id = i.id ORDER BY sent_at DESC, id DESC LIMIT 1) AS last_email_to,
  (SELECT sent_at   FROM invoice_emails e WHERE e.invoice_id = i.id ORDER BY sent_at DESC, id DESC LIMIT 1) AS last_email_at`;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE";
}

function toRecord(row: InvoiceRow): InvoiceRecord {
  return {
    ...invoiceInputSchema.parse(JSON.parse(row.data)),
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastEmail:
      row.last_email_to && row.last_email_at ? { to: row.last_email_to, sentAt: row.last_email_at } : null,
  };
}

function toSummary(row: InvoiceRow): InvoiceSummary {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerName: row.customer_name,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    totalCents: row.total_cents,
    updatedAt: row.updated_at,
    lastEmailedAt: row.last_email_at,
  };
}

function columnsFor(input: InvoiceInput) {
  return {
    invoice_number: input.invoiceNumber,
    customer_name: input.billTo.name,
    issue_date: input.issueDate,
    due_date: input.dueDate,
    total_cents: calculateTotals(input).totalCents,
    data: JSON.stringify(input),
  };
}

export function createInvoiceRepository(db: Database.Database) {
  const selectOne = db.prepare<[string], InvoiceRow>(`SELECT i.*, ${LAST_EMAIL_COLUMNS} FROM invoices i WHERE id = ?`);
  const selectAll = db.prepare<[], InvoiceRow>(
    `SELECT i.*, ${LAST_EMAIL_COLUMNS} FROM invoices i ORDER BY updated_at DESC`,
  );

  const repository = {
    list(): InvoiceSummary[] {
      return selectAll.all().map(toSummary);
    },

    get(id: string): InvoiceRecord | null {
      const row = selectOne.get(id);
      return row ? toRecord(row) : null;
    },

    create(input: InvoiceInput): InvoiceRecord {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      try {
        db.prepare(
          `INSERT INTO invoices (id, invoice_number, customer_name, issue_date, due_date, total_cents, data, created_at, updated_at)
           VALUES (@id, @invoice_number, @customer_name, @issue_date, @due_date, @total_cents, @data, @now, @now)`,
        ).run({ id, now, ...columnsFor(input) });
      } catch (error) {
        if (isUniqueViolation(error)) throw new DuplicateInvoiceNumberError(input.invoiceNumber);
        throw error;
      }
      return repository.get(id)!;
    },

    /** Returns null when the invoice does not exist. */
    update(id: string, input: InvoiceInput): InvoiceRecord | null {
      try {
        const result = db
          .prepare(
            `UPDATE invoices SET invoice_number = @invoice_number, customer_name = @customer_name,
               issue_date = @issue_date, due_date = @due_date, total_cents = @total_cents,
               data = @data, updated_at = @now
             WHERE id = @id`,
          )
          .run({ id, now: new Date().toISOString(), ...columnsFor(input) });
        if (result.changes === 0) return null;
      } catch (error) {
        if (isUniqueViolation(error)) throw new DuplicateInvoiceNumberError(input.invoiceNumber);
        throw error;
      }
      return repository.get(id);
    },

    delete(id: string): boolean {
      return db.prepare("DELETE FROM invoices WHERE id = ?").run(id).changes > 0;
    },

    recordEmail(invoiceId: string, recipient: string, messageId: string | null): { to: string; sentAt: string } {
      const sentAt = new Date().toISOString();
      db.prepare(
        "INSERT INTO invoice_emails (invoice_id, recipient, message_id, sent_at) VALUES (?, ?, ?, ?)",
      ).run(invoiceId, recipient, messageId, sentAt);
      return { to: recipient, sentAt };
    },

    /** Suggests the next number in the "INV-0001" sequence. */
    suggestNextNumber(): string {
      const rows = db.prepare<[], { invoice_number: string }>("SELECT invoice_number FROM invoices").all();
      const highest = rows.reduce((max, { invoice_number }) => {
        const match = /^INV-(\d+)$/i.exec(invoice_number);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0);
      return `INV-${String(highest + 1).padStart(4, "0")}`;
    },
  };

  return repository;
}

export type InvoiceRepository = ReturnType<typeof createInvoiceRepository>;
