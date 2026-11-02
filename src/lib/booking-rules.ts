/**
 * Pay-first queue rules, shared by the API and the pages.
 * A booking takes a queue spot only once it is paid (or already seated, status "active"),
 * and the queue runs in order of payment time. Unpaid bookings expire.
 */

export const UNPAID_TTL_MS = {
  online: 15 * 60 * 1000,
  kasir: 30 * 60 * 1000,
} as const;

export type PaymentMethod = keyof typeof UNPAID_TTL_MS;

type BookingLike = {
  status?: string;
  payment_status?: string | null;
  payment_method?: string | null;
  created_at: string;
  paid_at?: string | null;
};

export function inQueue(b: BookingLike): boolean {
  return b.payment_status === "paid" || b.status === "active";
}

/** When an unpaid booking stops being payable, or null when it never expires (paid or seated). */
export function unpaidExpiresAt(b: BookingLike): number | null {
  if (inQueue(b)) return null;
  const ttl = b.payment_method === "online" ? UNPAID_TTL_MS.online : UNPAID_TTL_MS.kasir;
  return new Date(b.created_at).getTime() + ttl;
}

export function isExpired(b: BookingLike, now = Date.now()): boolean {
  const at = unpaidExpiresAt(b);
  return at !== null && now >= at;
}

/** Queue order: whoever paid first. */
export function queueTime(b: BookingLike): number {
  return new Date(b.paid_at || b.created_at).getTime();
}

// Expired rows are hidden at once but deleted only after this extra grace, so a QRIS payment made in
// the last second and settled a little later still finds its booking instead of taking money for nothing.
export const DELETE_GRACE_MS = 15 * 60 * 1000;

/** Unpaid bookings created before these times are safe to delete. */
export function deletableUnpaidBeforeIso(now = Date.now()): { online: string; kasir: string } {
  return {
    online: new Date(now - UNPAID_TTL_MS.online - DELETE_GRACE_MS).toISOString(),
    kasir: new Date(now - UNPAID_TTL_MS.kasir - DELETE_GRACE_MS).toISOString(),
  };
}

type PcLike = { id: string; name: string; status?: string; expected_empty_time?: string | null };
type PaketLike = { id: string; duration_minutes?: number | null };
type QueuedLike = BookingLike & { pc_id: string; paket_id: string; booking_type?: string | null };

// shortcut: a PC marked occupied without a timer has an unknown end, so it is guessed at 2 hours.
// Good enough to rank PCs; switch to the real session end if OP starts recording one.
const UNKNOWN_SESSION_MIN = 120;
const DEFAULT_PAKET_MIN = 60;

/** Estimated minutes until a new booking on this PC can start, or null when the PC is not bookable. */
export function pcWaitMinutes(pc: PcLike, bookings: QueuedLike[], pakets: PaketLike[], now = Date.now()): number | null {
  if (pc.status === "maintenance") return null;
  const end = pc.expected_empty_time ? new Date(pc.expected_empty_time).getTime() : 0;
  let wait = end > now ? Math.ceil((end - now) / 60000) : pc.status === "occupied" ? UNKNOWN_SESSION_MIN : 0;
  for (const b of bookings) {
    if (b.pc_id !== pc.id || b.status !== "pending" || !inQueue(b) || b.booking_type !== "queue") continue;
    wait += pakets.find((p) => p.id === b.paket_id)?.duration_minutes || DEFAULT_PAKET_MIN;
  }
  return wait;
}

// GBilling watcher freshness. syncedAt null means billing integration is not in use (manual timers),
// so that is never "stale". A present-but-old stamp means the watcher or internet is down.
export const BILLING_STALE_MS = 120_000;

export function billingStale(syncedAt: string | null | undefined, now = Date.now()): boolean {
  if (!syncedAt) return false;
  const t = new Date(syncedAt).getTime();
  return Number.isFinite(t) && now - t > BILLING_STALE_MS;
}
