/**
 * POST /api/midtrans/snap  { booking_id }
 * Opens a Snap payment for an unpaid booking. The amount comes from the booking's paket in the
 * database, never from the browser, and the order expires together with the booking.
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSnapTransaction, makeOrderId } from "@/lib/midtrans";
import { unpaidExpiresAt } from "@/lib/booking-rules";

export async function POST(req: Request) {
  try {
    const { booking_id } = await req.json().catch(() => ({}));
    if (typeof booking_id !== "string" || !/^GC\d{4}$/.test(booking_id)) {
      return NextResponse.json({ error: "Kode booking tidak valid." }, { status: 400 });
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
    const snap = await createSnapTransaction({
      orderId,
      amount,
      itemId: paket.id,
      itemName: paket.name,
      customerName: booking.player_name,
      customerEmail: booking.customer_email,
      finishUrl: `${new URL(req.url).origin}/booking/${booking.id}`,
      expiryMinutes: minutesLeft,
    });
    return NextResponse.json({ token: snap.token, order_id: orderId, amount });
  } catch (err) {
    console.error("[Midtrans Snap] Error:", err);
    return NextResponse.json({ error: "Gagal membuka pembayaran online. Coba lagi atau bayar tunai ke OP." }, { status: 502 });
  }
}
