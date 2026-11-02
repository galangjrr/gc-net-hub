/**
 * POST /api/webhooks/midtrans
 * Midtrans HTTP notification. The signature_key is checked first so random callers cannot
 * make us hit Midtrans, then the real status is read back from Midtrans before anything changes.
 */

import { NextResponse } from "next/server";
import { isValidNotification, syncOrderPayment } from "@/lib/midtrans";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !isValidNotification(body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  try {
    const result = await syncOrderPayment(body.order_id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[Midtrans Webhook] Error:", err);
    // Non-2xx makes Midtrans retry the notification later.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
