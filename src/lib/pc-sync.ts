/**
 * Live PC timer feed from the GBilling watcher. The watcher owns expected_empty_time + status
 * for the PCs it maps, so the booking page shows real remaining time instead of an OP-typed guess.
 */
import crypto from "crypto";

export type PcTimerUpdate = { expected_empty_time: string | null; status: "occupied" | "available" };

/** minutesLeft > 0 means a live session; 0 or less means the PC is idle. */
export function pcTimerUpdate(minutesLeft: number, nowMs = Date.now()): PcTimerUpdate {
  if (Number.isFinite(minutesLeft) && minutesLeft > 0) {
    return { expected_empty_time: new Date(nowMs + minutesLeft * 60000).toISOString(), status: "occupied" };
  }
  return { expected_empty_time: null, status: "available" };
}

/** Parse the request body into a clean { pcId: minutesLeft } map, or null if it is malformed. */
export function parseSyncBody(body: unknown): Record<string, number> | null {
  if (!body || typeof body !== "object") return null;
  const pcs = (body as { pcs?: unknown }).pcs;
  if (!pcs || typeof pcs !== "object") return null;
  const entries = Object.entries(pcs as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 200) return null;
  const out: Record<string, number> = {};
  for (const [rawId, rawMin] of entries) {
    const id = rawId.trim().toLowerCase();
    const min = Number(rawMin);
    if (!id || id.length > 30 || !Number.isFinite(min) || min < 0 || min > 100000) return null;
    out[id] = Math.floor(min);
  }
  return out;
}

export function tokenOk(provided: string | null): boolean {
  const expected = process.env.PC_SYNC_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
