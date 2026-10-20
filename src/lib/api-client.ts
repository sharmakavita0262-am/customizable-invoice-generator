import type {
  FieldIssue,
  InvoiceInput,
  InvoiceRecord,
  SendInvoiceEmailInput,
} from "@/lib/invoice/schema";

/** Typed wrappers around the invoice REST API, for use in the browser. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: FieldIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error ?? `Request failed (${response.status}).`,
      Array.isArray(body?.issues) ? body.issues : [],
    );
  }
  return body as T;
}

export function createInvoice(input: InvoiceInput) {
  return request<{ invoice: InvoiceRecord }>("/api/invoices", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((body) => body.invoice);
}

export function updateInvoice(id: string, input: InvoiceInput) {
  return request<{ invoice: InvoiceRecord }>(`/api/invoices/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }).then((body) => body.invoice);
}

export function deleteInvoice(id: string) {
  return request<void>(`/api/invoices/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function emailInvoice(id: string, input: SendInvoiceEmailInput) {
  return request<{ lastEmail: { to: string; sentAt: string }; previewUrl: string | null }>(
    `/api/invoices/${encodeURIComponent(id)}/email`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
