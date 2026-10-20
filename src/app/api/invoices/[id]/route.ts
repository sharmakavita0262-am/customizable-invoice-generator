import { invoiceInputSchema } from "@/lib/invoice/schema";
import { getInvoiceRepository } from "@/server/db";
import { HttpError, parseOrThrow, readJson, withErrorHandling } from "@/server/http";
import { DuplicateInvoiceNumberError } from "@/server/invoice-repository";

type Context = RouteContext<"/api/invoices/[id]">;

const notFound = () => new HttpError(404, "Invoice not found.");

/** GET /api/invoices/:id */
export const GET = withErrorHandling(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  const invoice = (await getInvoiceRepository()).get(id);
  if (!invoice) throw notFound();
  return Response.json({ invoice });
});

/** PUT /api/invoices/:id: replace the invoice with a new version. */
export const PUT = withErrorHandling(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const input = parseOrThrow(invoiceInputSchema, await readJson(request));
  const repository = await getInvoiceRepository();
  try {
    const invoice = repository.update(id, input);
    if (!invoice) throw notFound();
    return Response.json({ invoice });
  } catch (error) {
    if (error instanceof DuplicateInvoiceNumberError) {
      throw new HttpError(409, error.message, [{ path: ["invoiceNumber"], message: "This number is already used" }]);
    }
    throw error;
  }
});

/** DELETE /api/invoices/:id */
export const DELETE = withErrorHandling(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  if (!(await getInvoiceRepository()).delete(id)) throw notFound();
  return new Response(null, { status: 204 });
});
