/** Rounds to paise so client-side sums of 2-decimal amounts never show float noise. */
export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const roundQuantity = (value: number): number => Math.round((value + Number.EPSILON) * 1000) / 1000;

/** Parses a numeric text input; returns NaN for blank or malformed text. */
export function parseNumber(text: string): number {
  const trimmed = text.trim();
  return /^\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export const decimalsOf = (text: string): number => text.trim().split(".")[1]?.length ?? 0;
