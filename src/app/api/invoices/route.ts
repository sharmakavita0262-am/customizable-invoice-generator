import { invoiceInputSchema } from "@/lib/invoice/schema";
import { getInvoiceRepository } from "@/server/db";
import { HttpError, parseOrThrow, readJson, withErrorHandling } from "@/server/http";
import { DuplicateInvoiceNumberError } from "@/server/invoice-repository";

/** GET /api/invoices: summaries of all saved invoices, most recently updated first. */
export const GET = withErrorHandling(async () => {
  const repository = await getInvoiceRepository();
  return Response.json({ invoices: repository.list() });
});

/** POST /api/invoices: create an invoice. */
export const POST = withErrorHandling(async (request: Request) => {
  const input = parseOrThrow(invoiceInputSchema, await readJson(request));
  const repository = await getInvoiceRepository();
  try {
    const invoice = repository.create(input);
    return Response.json({ invoice }, { status: 201, headers: { Location: `/api/invoices/${invoice.id}` } });
  } catch (error) {
    if (error instanceof DuplicateInvoiceNumberError) {
      throw new HttpError(409, error.message, [{ path: ["invoiceNumber"], message: "This number is already used" }]);
    }
    throw error;
  }
});
