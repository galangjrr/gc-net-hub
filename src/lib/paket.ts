/**
 * Custom ("Personal") pakets: the customer picks a price, the server decides everything else.
 * Rp1.000 buys 15 minutes. Name and duration are derived here so a browser can never send its own.
 */

import type { Paket } from "@/lib/db";

export type PaketGroup = "jam" | "nominal" | "malam";

export const PAKET_GROUPS: { key: PaketGroup; label: string }[] = [
  { key: "jam", label: "Per Jam" },
  { key: "nominal", label: "Nominal" },
  { key: "malam", label: "Paket Malam" },
];

export function paketGroupOf(p: Paket): PaketGroup {
  if (p.fixed_start_time) return "malam";
  return p.name.endsWith(" Jam") ? "jam" : "nominal";
}

/** Public (non-custom) pakets split by group, each sorted the way customers read them. */
export function groupPakets(pakets: Paket[]): Record<PaketGroup, Paket[]> {
  const visible = pakets.filter((p) => !p.is_custom);
  return {
    jam: visible.filter((p) => paketGroupOf(p) === "jam").sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0)),
    nominal: visible.filter((p) => paketGroupOf(p) === "nominal").sort((a, b) => a.price - b.price),
    malam: visible.filter((p) => paketGroupOf(p) === "malam").sort((a, b) => a.price - b.price),
  };
}

export function durationLabel(p: Pick<Paket, "duration_minutes" | "fixed_start_time" | "fixed_end_time">): string {
  if (p.fixed_start_time) return `${p.fixed_start_time} - ${p.fixed_end_time ?? "selesai"} WIB`;
  const m = p.duration_minutes || 0;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return [h ? `${h} Jam` : "", r ? `${r} Menit` : ""].filter(Boolean).join(" ") || "-";
}

export const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");

/** Online payment channels and their Midtrans fee in permille (QRIS 0,7%, GoPay app 2%). */
export const PAY_CHANNELS = { qris: 7, gopay: 20 } as const;
export type PayChannel = keyof typeof PAY_CHANNELS;

/**
 * Amounts a settled order may carry: any channel's online price, or the plain paket price for orders
 * charged before online pricing. Not keyed by Midtrans payment_type: Snap's GoPay on desktop settles as
 * payment_type "qris" at the GoPay price, so the channel can't be read back reliably.
 */
export function acceptedOnlineAmounts(price: number): number[] {
  return [price, ...(Object.keys(PAY_CHANNELS) as PayChannel[]).map((c) => onlinePrice(price, c))];
}

/**
 * GC Net's online (Midtrans) price: the paket price plus the channel's fee rounded up to the next Rp100,
 * so it stays a round number (QRIS Rp4.000 -> Rp4.100, GoPay Rp12.000 -> Rp12.300). Cash pays the paket price.
 */
export function onlinePrice(price: number, channel: PayChannel = "qris"): number {
  return price + Math.ceil((price * PAY_CHANNELS[channel]) / 100000) * 100;
}

/** Length of a fixed-time paket's window in minutes, wrapping past midnight (22:00-04:00 = 360). */
export function fixedWindowMinutes(p: Pick<Paket, "fixed_start_time" | "fixed_end_time">): number {
  if (!p.fixed_start_time || !p.fixed_end_time) return 0;
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
  return (toMin(p.fixed_end_time) - toMin(p.fixed_start_time) + 1440) % 1440;
}

export type DurationOption = { id: string; title: string; price: number; extraMinutes: number; isCustom: boolean };

/**
 * Up to 3 ways to play at least `mins` minutes, cheapest first; on equal price the one wasting less time wins.
 * Candidates: regular pakets long enough, plus the custom nominal that covers exactly `mins`.
 */
export function optionsForDuration(pakets: Paket[], mins: number): DurationOption[] {
  const opts: DurationOption[] = pakets
    .filter((p) => !p.is_custom && !p.fixed_start_time && (p.duration_minutes || 0) >= mins)
    .map((p) => {
      const dur = durationLabel(p);
      return { id: p.id, title: p.name === dur ? p.name : `${p.name} · ${dur}`, price: p.price, extraMinutes: (p.duration_minutes || 0) - mins, isCustom: false };
    });
  const custom = customPaketFor(Math.ceil(mins / 15) * 1000);
  if (custom) opts.push({ id: `custom-${custom.price}`, title: `Nominal bebas ${rupiah(custom.price)}`, price: custom.price, extraMinutes: custom.duration_minutes - mins, isCustom: true });

  opts.sort((a, b) => a.price - b.price || a.extraMinutes - b.extraMinutes || Number(a.isCustom) - Number(b.isCustom));
  const seen = new Set<string>();
  return opts.filter((o) => {
    const key = `${o.price}|${o.extraMinutes}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}

/** Cheapest fixed-time paket (malam, pagi) whose window covers `mins` and beats `price`, if any. */
export function cheaperFixedPaket(pakets: Paket[], mins: number, price: number): Paket | null {
  return pakets
    .filter((p) => !p.is_custom && p.fixed_start_time && fixedWindowMinutes(p) >= mins && p.price < price)
    .sort((a, b) => a.price - b.price)[0] ?? null;
}

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
