/**
 * Monetary Utility Functions
 * LankaEats stores all currency amounts as integer minor units (cents / euro-cents)
 * to prevent floating-point representation errors in database storage and calculations.
 * Example: €12.50 -> 1250 cents
 */

export function eurosToCents(euros: number): number {
  if (typeof euros !== 'number' || Number.isNaN(euros)) {
    throw new TypeError('Monetary conversion requires a valid number');
  }
  return Math.round(euros * 100);
}

export function centsToEuros(cents: number): number {
  if (typeof cents !== 'number' || Number.isNaN(cents)) {
    throw new TypeError('Monetary conversion requires a valid number');
  }
  return Number((cents / 100).toFixed(2));
}

export function centsToEurosFormatted(cents: number): string {
  const euros = centsToEuros(cents);
  return `€${euros.toFixed(2)}`;
}
