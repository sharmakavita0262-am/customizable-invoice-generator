/**
 * Invoice totals, following the order in the brief:
 *   1. round each line (quantity x unit price) to cents
 *   2. sum the lines into the subtotal
 *   3. subtract the fixed discount
 *   4. apply the tax rate to the discounted amount and round to cents
 *
 * Quantities and tax rates are scaled to integers and multiplied with BigInt,
 * so intermediate products cannot lose precision.
 */

export const QUANTITY_DECIMALS = 3;
export const TAX_RATE_DECIMALS = 3;

const QUANTITY_SCALE = BigInt(10 ** QUANTITY_DECIMALS);
// Percent (x100) times the rate's own decimal scale.
const TAX_RATE_DIVISOR = 100n * BigInt(10 ** TAX_RATE_DECIMALS);

export interface CalculableLine {
  quantity: number;
  unitPriceCents: number;
}

export interface CalculableInvoice {
  lineItems: readonly CalculableLine[];
  discountCents: number;
  taxRatePercent: number;
}

export interface InvoiceTotals {
  lineTotalsCents: number[];
  subtotalCents: number;
  /** Discount actually applied: never negative and never above the subtotal. */
  discountCents: number;
  taxableCents: number;
  taxCents: number;
  totalCents: number;
}

/** Integer division of a non-negative numerator, rounding halves up. */
function divideRoundHalfUp(numerator: bigint, divisor: bigint): bigint {
  return (numerator * 2n + divisor) / (2n * divisor);
}

function toScaledBigInt(value: number, decimals: number): bigint {
  return BigInt(Math.round(Math.max(0, value) * 10 ** decimals));
}

export function calculateLineTotalCents(line: CalculableLine): number {
  const quantity = toScaledBigInt(line.quantity, QUANTITY_DECIMALS);
  const price = BigInt(Math.max(0, Math.round(line.unitPriceCents)));
  return Number(divideRoundHalfUp(quantity * price, QUANTITY_SCALE));
}

export function calculateTotals(invoice: CalculableInvoice): InvoiceTotals {
  const lineTotalsCents = invoice.lineItems.map(calculateLineTotalCents);
  const subtotalCents = lineTotalsCents.reduce((sum, cents) => sum + cents, 0);

  const discountCents = Math.min(Math.max(0, Math.round(invoice.discountCents)), subtotalCents);
  const taxableCents = subtotalCents - discountCents;

  const rate = toScaledBigInt(invoice.taxRatePercent, TAX_RATE_DECIMALS);
  const taxCents = Number(divideRoundHalfUp(BigInt(taxableCents) * rate, TAX_RATE_DIVISOR));

  return {
    lineTotalsCents,
    subtotalCents,
    discountCents,
    taxableCents,
    taxCents,
    totalCents: taxableCents + taxCents,
  };
}
