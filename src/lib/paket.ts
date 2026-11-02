/**
 * Custom ("Personal") pakets: the customer picks a price, the server decides everything else.
 * Rp1.000 buys 15 minutes. Name and duration are derived here so a browser can never send its own.
 */

export const CUSTOM_MIN_PRICE = 3000;
export const CUSTOM_MAX_PRICE = 100000;

export function customPaketFor(price: unknown): { name: string; price: number; duration_minutes: number } | null {
  if (typeof price !== "number" || !Number.isInteger(price)) return null;
  if (price < CUSTOM_MIN_PRICE || price > CUSTOM_MAX_PRICE || price % 1000 !== 0) return null;

  const mins = (price / 1000) * 15;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  const time = [hours > 0 ? `${hours} Jam` : "", rem > 0 ? `${rem} Menit` : ""].filter(Boolean).join(" ");
  return { name: `Personal ${time}`, price, duration_minutes: mins };
}
