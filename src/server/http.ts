import "server-only";
import type { z } from "zod";
import type { FieldIssue } from "@/lib/invoice/schema";

/** Shape of every error response: `{ error, issues? }`. */
export interface ApiErrorBody {
  error: string;
  issues?: FieldIssue[];
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues?: FieldIssue[],
  ) {
    super(message);
  }
}

const MAX_BODY_LENGTH = 256 * 1024; // characters; invoices are a few KB

export async function readJson(request: Request): Promise<unknown> {
  // Reject oversized bodies before buffering them when the size is declared.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_LENGTH * 4) throw new HttpError(413, "Request body is too large.");

  const text = await request.text();
  if (text.length > MAX_BODY_LENGTH) throw new HttpError(413, "Request body is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

export function parseOrThrow<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(
      400,
      "Please fix the highlighted fields.",
      result.error.issues.map((issue) => ({
        path: issue.path.filter((segment) => typeof segment !== "symbol"),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

/** Wraps a route handler so thrown HttpErrors become JSON responses. */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof HttpError) {
        return Response.json({ error: error.message, issues: error.issues } satisfies ApiErrorBody, {
          status: error.status,
        });
      }
      console.error(error);
      return Response.json({ error: "Something went wrong on our side. Please try again." } satisfies ApiErrorBody, {
        status: 500,
      });
    }
  };
}
