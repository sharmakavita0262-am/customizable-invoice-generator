import "server-only";
import fs from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import Database from "better-sqlite3";
import { createInvoiceRepository, migrate, type InvoiceRepository } from "./invoice-repository";

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as typeof globalThis & { invoiceDb?: Database.Database };

function openDatabase(): Database.Database {
  const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "invoices.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

/**
 * Returns the invoice repository for the current request.
 *
 * better-sqlite3 is synchronous, so without `connection()` Next.js would run
 * these queries while prerendering at build time and serve stale data.
 */
export async function getInvoiceRepository(): Promise<InvoiceRepository> {
  await connection();
  globalForDb.invoiceDb ??= openDatabase();
  return createInvoiceRepository(globalForDb.invoiceDb);
}
