/**
 * POST /api/midtrans/status  { order_id }
 * Called by the booking page after paying (Snap callback or the return from a GoPay/ShopeePay app).
 * Checks the order with Midtrans and marks the booking paid, so payment lands even before the
 * notification arrives, and on localhost where no notification ever arrives.
 */

import { NextResponse } from "next/server";
import { parseOrderId, syncOrderPayment } from "@/lib/midtrans";

// shortcut: per-instance memory, so each serverless instance counts on its own. Move to a table if abused.
const hits = new Map<string, { count: number; resetAt: number }>();
function allow(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || rec.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  rec.count += 1;
  return rec.count <= 30;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  if (!allow(ip)) return NextResponse.json({ error: "Terlalu sering cek status. Tunggu sebentar." }, { status: 429 });
  try {
    const { order_id } = await req.json().catch(() => ({}));
    if (!parseOrderId(order_id)) return NextResponse.json({ error: "Order tidak valid." }, { status: 400 });
    return NextResponse.json(await syncOrderPayment(order_id));
  } catch (err) {
    console.error("[Midtrans Status] Error:", err);
    return NextResponse.json({ error: "Gagal mengecek status pembayaran." }, { status: 502 });
  }
}
