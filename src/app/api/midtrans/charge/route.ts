/**
 * POST /api/midtrans/charge  { booking_id, method }  method: qris | gopay | shopeepay
 * Core API charge for an unpaid booking, so the booking page draws its own QR / e-wallet UI.
 * Amount comes from the booking's paket in the DB, never the browser.
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { chargeCore, makeOrderId, type ChargeMethod } from "@/lib/midtrans";
import { unpaidExpiresAt } from "@/lib/booking-rules";

const METHODS: ChargeMethod[] = ["qris", "gopay", "shopeepay"];

export async function POST(req: Request) {
  try {
    const { booking_id, method } = await req.json().catch(() => ({}));
    if (typeof booking_id !== "string" || !/^GC\d{4}$/.test(booking_id)) {
      return NextResponse.json({ error: "Kode booking tidak valid." }, { status: 400 });
    }
    if (!METHODS.includes(method)) {
      return NextResponse.json({ error: "Metode bayar tidak dikenal." }, { status: 400 });
    }

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, player_name, status, payment_status, payment_method, created_at, customer_email, pakets(id, name, price)")
      .eq("id", booking_id)
      .maybeSingle();
    if (!booking) return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
    if (booking.payment_status === "paid") return NextResponse.json({ error: "Booking ini sudah lunas." }, { status: 409 });
    if (booking.status !== "pending") return NextResponse.json({ error: "Booking sudah diproses OP." }, { status: 409 });

    const expiresAt = unpaidExpiresAt(booking);
    const minutesLeft = expiresAt === null ? 0 : Math.floor((expiresAt - Date.now()) / 60000);
    if (minutesLeft < 1) {
      return NextResponse.json({ error: "Waktu bayar booking ini sudah habis. Silakan booking ulang." }, { status: 410 });
    }

    const paket = Array.isArray(booking.pakets) ? booking.pakets[0] : booking.pakets;
    const amount = Number(paket?.price);
    if (!paket || !Number.isInteger(amount) || amount < 1) {
      return NextResponse.json({ error: "Harga paket tidak valid." }, { status: 400 });
    }

    const orderId = makeOrderId(booking.id);
    const charged = await chargeCore({
      orderId,
      amount,
      itemId: paket.id,
      itemName: paket.name,
      customerName: booking.player_name,
      customerEmail: booking.customer_email,
      method,
      callbackUrl: `${new URL(req.url).origin}/booking/${booking.id}`,
      expiryMinutes: minutesLeft,
    });
    return NextResponse.json({ order_id: orderId, method, amount, ...charged });
  } catch (err) {
    console.error("[Midtrans Charge] Error:", err);
    return NextResponse.json({ error: "Gagal membuka pembayaran online. Coba lagi atau bayar tunai ke OP." }, { status: 502 });
  }
}
