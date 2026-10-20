/**
 * Money and decimal helpers.
 *
 * Amounts are stored as integer cents and user input is parsed straight from
 * the typed string into a scaled integer, so binary floating point never
 * touches a monetary value (no `0.1 + 0.2` surprises).
 */

export type DecimalParseError = "empty" | "invalid" | "negative" | "precision" | "too_large";

export type DecimalParseResult =
  | { ok: true; scaled: number }
  | { ok: false; error: DecimalParseError };

const DECIMAL_PATTERN = /^(\d*)(?:\.(\d*))?$/;

/**
 * Parses a user-typed decimal such as "1,250.5" or "$40" into an integer
 * scaled by 10^decimals ("50.5" with 2 decimals -> 5050).
 */
export function parseDecimal(raw: string, decimals: number): DecimalParseResult {
  const cleaned = raw.trim().replace(/[\s,$]/g, "");
  if (cleaned === "") return { ok: false, error: "empty" };

  const negative = cleaned.startsWith("-");
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const match = DECIMAL_PATTERN.exec(unsigned);
  if (!match || (match[1] === "" && !match[2])) return { ok: false, error: "invalid" };
  if (negative) return { ok: false, error: "negative" };

  const [, whole, fraction = ""] = match;
  if (fraction.length > decimals) return { ok: false, error: "precision" };

  const scaled = Number((whole || "0") + fraction.padEnd(decimals, "0"));
  if (!Number.isSafeInteger(scaled)) return { ok: false, error: "too_large" };
  return { ok: true, scaled };
}

/** True when `value` has at most `decimals` digits after the decimal point. */
export function hasAtMostDecimals(value: number, decimals: number): boolean {
  const scaled = value * 10 ** decimals;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatUSD(cents: number): string {
  return usd.format(cents / 100);
}

/** Formats cents for an editable input: 5050 -> "50.50". */
export function centsToInput(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = String(Math.abs(cents % 100)).padStart(2, "0");
  return `${whole}.${fraction}`;
}

/** Formats a decimal number for an editable input without float noise. */
export function numberToInput(value: number): string {
  return String(Number(value.toFixed(6)));
}

/** Formats a quantity or percentage for display: 1.5 -> "1.5", 2 -> "2". */
export function formatDecimal(value: number, maxDecimals = 3): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
}
