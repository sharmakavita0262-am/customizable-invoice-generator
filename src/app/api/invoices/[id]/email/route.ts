import { renderInvoiceEmail } from "@/lib/invoice/email-template";
import { sendInvoiceEmailSchema } from "@/lib/invoice/schema";
import { getInvoiceRepository } from "@/server/db";
import { assertRecipientAllowed, EmailConfigError, RecipientNotAllowedError, sendEmail } from "@/server/email";
import { HttpError, parseOrThrow, readJson, withErrorHandling } from "@/server/http";

/**
 * POST /api/invoices/:id/email: email the saved version of an invoice.
 * Body: { to: string, message?: string }
 */
export const POST = withErrorHandling(async (request: Request, context: RouteContext<"/api/invoices/[id]/email">) => {
  const { id } = await context.params;
  const { to, message } = parseOrThrow(sendInvoiceEmailSchema, await readJson(request));

  const repository = await getInvoiceRepository();
  const invoice = repository.get(id);
  if (!invoice) throw new HttpError(404, "Invoice not found.");

  try {
    assertRecipientAllowed(to);
  } catch (error) {
    if (error instanceof RecipientNotAllowedError) {
      throw new HttpError(403, error.message, [{ path: ["to"], message: "This address isn't on the allowlist" }]);
    }
    throw error;
  }

  const { subject, html, text } = renderInvoiceEmail(invoice, message);

  let result: Awaited<ReturnType<typeof sendEmail>>;
  try {
    result = await sendEmail({ to, subject, html, text, replyTo: invoice.from.email || undefined });
  } catch (error) {
    if (error instanceof EmailConfigError) throw new HttpError(503, error.message);
    console.error("Email delivery failed", error);
    throw new HttpError(502, "The email provider rejected the message. Check the SMTP settings and try again.");
  }

  const lastEmail = repository.recordEmail(invoice.id, to, result.messageId);
  return Response.json({ lastEmail, previewUrl: result.previewUrl });
});
