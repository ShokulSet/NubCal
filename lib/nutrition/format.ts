export function roundTo(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** "12 g", "250 kcal", "1.5 g" — fewer decimals for larger numbers. */
export function formatAmount(value: number, unit: string): string {
  const rounded = roundTo(value, value >= 100 ? 0 : 1);
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${unit}`;
}
