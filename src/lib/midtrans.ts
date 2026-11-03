/**
 * Midtrans Snap integration. Server-side only: the server key never leaves the backend.
 *
 * Sandbox or production comes from NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION, never from the key's shape.
 * A booking counts as paid only after Midtrans' own status API says so, never on the
 * browser's word or an unverified notification.
 */

import crypto from "crypto";

function serverKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum diisi di env.");
  return key;
}

// Newer Midtrans accounts issue sandbox keys without the "SB-" prefix, so the mode is an explicit
// flag. Anything but "true" means sandbox: a forgotten flag never charges real money.
function isSandbox(): boolean {
  return process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION !== "true";
}

function authHeader(): string {
  return "Basic " + Buffer.from(`${serverKey()}:`).toString("base64");
}

// Booking ids (GC1234) are reused once a booking is deleted, so every payment attempt
// gets its own order_id: <bookingId>-<attempt time in base36 ms>.
const ORDER_ID_RE = /^(GC\d{4})-([0-9a-z]{6,10})$/;

export function makeOrderId(bookingId: string, nowMs = Date.now()): string {
  return `${bookingId}-${nowMs.toString(36)}`;
}

export function parseOrderId(orderId: unknown): { bookingId: string; createdMs: number } | null {
  if (typeof orderId !== "string") return null;
  const m = ORDER_ID_RE.exec(orderId);
  if (!m) return null;
  return { bookingId: m[1], createdMs: parseInt(m[2], 36) };
}

export function signatureFor(orderId: string, statusCode: string, grossAmount: string, key = serverKey()): string {
  return crypto.createHash("sha512").update(orderId + statusCode + grossAmount + key).digest("hex");
}

export function isValidNotification(body: Record<string, unknown>): boolean {
  const { order_id, status_code, gross_amount, signature_key } = body;
  if (typeof order_id !== "string" || typeof status_code !== "string" || typeof gross_amount !== "string" || typeof signature_key !== "string") {
    return false;
  }
  const expected = Buffer.from(signatureFor(order_id, status_code, gross_amount));
  const given = Buffer.from(signature_key);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

const QR_PATH = /\/v2\/(qris|gopay)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/qr-code$/;

/** Pulls { kind, tx } out of a Midtrans QR image URL, or null if it isn't one. */
export function parseQrUrl(url: string): { kind: "qris" | "gopay"; tx: string } | null {
  const m = QR_PATH.exec(url);
  return m ? { kind: m[1] as "qris" | "gopay", tx: m[2] } : null;
}

/** Midtrans QR image URL rebuilt from validated parts, so the download proxy can never be pointed elsewhere. */
export function qrImageUrl(kind: string, tx: string): string | null {
  const parsed = parseQrUrl(`/v2/${kind}/${tx}/qr-code`);
  if (!parsed) return null;
  const base = isSandbox() ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com";
  return `${base}/v2/${parsed.kind}/${parsed.tx}/qr-code`;
}

/** Midtrans sends gross_amount as a string like "10000.00". */
export function amountMatches(grossAmount: unknown, price: unknown): boolean {
  const paid = Number(grossAmount);
  const expected = Number(price);
  return Number.isFinite(paid) && Number.isFinite(expected) && expected > 0 && paid === expected;
}

export function isPaidStatus(s: { transaction_status?: string; fraud_status?: string }): boolean {
  if (s.transaction_status === "settlement") return true;
  return s.transaction_status === "capture" && s.fraud_status === "accept";
}

export async function createSnapTransaction(params: {
  orderId: string;
  amount: number;
  itemId: string;
  itemName: string;
  customerName: string;
  customerEmail?: string | null;
  finishUrl: string;
  expiryMinutes: number;
  /** One Snap payment code; the amount is priced for it, so Snap must not offer the others. */
  enabledPayment: "other_qris" | "gopay";
}): Promise<{ token: string; redirect_url: string }> {
  const url = isSandbox()
    ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
    : "https://app.midtrans.com/snap/v1/transactions";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      transaction_details: { order_id: params.orderId, gross_amount: params.amount },
      item_details: [{ id: params.itemId, name: params.itemName.slice(0, 50), price: params.amount, quantity: 1 }],
      customer_details: {
        first_name: params.customerName.slice(0, 50),
        ...(params.customerEmail ? { email: params.customerEmail } : {}),
      },
      enabled_payments: [params.enabledPayment],
      // The order is only payable for as long as the booking holds (see UNPAID_TTL_MS.online).
      expiry: { unit: "minutes", duration: params.expiryMinutes },
      callbacks: { finish: params.finishUrl },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    console.error("[Midtrans] Snap error:", res.status, JSON.stringify(data));
    throw new Error("Gagal membuka pembayaran Midtrans.");
  }
  return { token: data.token, redirect_url: data.redirect_url };
}

export type ChargeMethod = "qris" | "gopay" | "shopeepay";

/**
 * Core API charge, so the booking page renders its own dark payment UI (QR / e-wallet deeplink)
 * instead of Midtrans' white Snap widget. Amount still comes from the caller (the DB paket).
 */
export async function chargeCore(params: {
  orderId: string;
  amount: number;
  itemId: string;
  itemName: string;
  customerName: string;
  customerEmail?: string | null;
  method: ChargeMethod;
  callbackUrl: string;
  expiryMinutes: number;
}): Promise<{ qrImageUrl: string | null; deeplinkUrl: string | null; qrString: string | null; expiryTime: string | null }> {
  const base = isSandbox() ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com";
  const body: Record<string, unknown> = {
    payment_type: params.method,
    transaction_details: { order_id: params.orderId, gross_amount: params.amount },
    item_details: [{ id: params.itemId, name: params.itemName.slice(0, 50), price: params.amount, quantity: 1 }],
    customer_details: {
      first_name: params.customerName.slice(0, 50),
      ...(params.customerEmail ? { email: params.customerEmail } : {}),
    },
    custom_expiry: { expiry_duration: params.expiryMinutes, unit: "minute" },
  };
  if (params.method === "qris") body.qris = { acquirer: "gopay" };
  if (params.method === "gopay") body.gopay = { enable_callback: true, callback_url: params.callbackUrl };
  if (params.method === "shopeepay") body.shopeepay = { callback_url: params.callbackUrl };

  const res = await fetch(`${base}/v2/charge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: authHeader() },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  // 201 = created, 200 = already exists (same order charged twice). Both carry the actions.
  if (!res.ok || (data.status_code !== "201" && data.status_code !== "200")) {
    console.error("[Midtrans] Charge error:", res.status, JSON.stringify(data));
    throw new Error("Gagal membuka pembayaran Midtrans.");
  }
  const actions: Array<{ name?: string; url?: string }> = Array.isArray(data.actions) ? data.actions : [];
  const action = (name: string) => actions.find((a) => a.name === name)?.url ?? null;
  return {
    qrImageUrl: action("generate-qr-code"),
    deeplinkUrl: action("deeplink-redirect"),
    qrString: typeof data.qr_string === "string" ? data.qr_string : null,
    expiryTime: typeof data.expiry_time === "string" ? data.expiry_time : null,
  };
}

/**
 * Asks Midtrans for the order's real status and marks the booking paid when it settled.
 * Safe to call any number of times: the update only flips unpaid to paid.
 */
export async function syncOrderPayment(orderId: string): Promise<{ paid: boolean; status: string }> {
  const parsed = parseOrderId(orderId);
  if (!parsed) return { paid: false, status: "invalid_order" };
  // Loaded here so the pure helpers above stay importable without Supabase env (scripts/test-midtrans.mjs).
  const { supabaseAdmin } = await import("@/lib/supabase");

  const base = isSandbox() ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com";
  const res = await fetch(`${base}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: "application/json", Authorization: authHeader() },
    cache: "no-store",
  });
  const status = await res.json().catch(() => ({}));
  if (!res.ok || status.status_code === "404") return { paid: false, status: "not_found" };
  if (!isPaidStatus(status)) return { paid: false, status: status.transaction_status || "unknown" };

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, created_at, payment_status, pakets(price)")
    .eq("id", parsed.bookingId)
    .maybeSingle();
  // A booking created after this order is a reused id, not the one that was paid for.
  if (!booking || new Date(booking.created_at).getTime() > parsed.createdMs) {
    // Money settled but the booking is gone: OP has to refund or seat this player by hand.
    console.error("[Midtrans] PAID ORDER WITHOUT BOOKING, needs manual refund:", orderId, status.gross_amount);
    return { paid: false, status: "booking_missing" };
  }

  // Backup check: the paid amount must be one of the paket's online prices (see acceptedOnlineAmounts).
  const { acceptedOnlineAmounts } = await import("@/lib/paket");
  const paket = Array.isArray(booking.pakets) ? booking.pakets[0] : booking.pakets;
  const price = Number(paket?.price);
  if (!acceptedOnlineAmounts(price).some((a) => amountMatches(status.gross_amount, a))) {
    console.error("[Midtrans] Paid amount does not match online price:", orderId, status.payment_type, status.gross_amount, paket?.price);
    return { paid: false, status: "amount_mismatch" };
  }

  if (booking.payment_status !== "paid") {
    // Paid late but still settled: the money arrived, so the booking counts, ordered by when it was paid.
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "paid", payment_method: "online", paid_at: new Date().toISOString(), paid_amount: Math.round(Number(status.gross_amount)) })
      .eq("id", booking.id)
      .eq("payment_status", "unpaid");
    if (error) throw new Error(`Gagal menandai booking lunas: ${error.message}`);
  }
  const { sendBookingInvoice } = await import("@/lib/invoice");
  await sendBookingInvoice(booking.id);
  return { paid: true, status: status.transaction_status };
}
