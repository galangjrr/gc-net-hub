/**
 * API Route: Query QRIS Payment Status
 * POST /api/dana/qris/status
 * 
 * Called by frontend to poll payment status after gamer scans the QR code.
 * Acts as a fallback if the webhook notification is delayed.
 */

import { NextResponse } from "next/server";
import { queryPaymentStatus } from "@/lib/dana";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { booking_id } = await req.json();

    if (!booking_id || typeof booking_id !== "string") {
      return NextResponse.json({ error: "booking_id wajib diisi" }, { status: 400 });
    }

    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("id, status, dana_partner_ref, dana_reference_no")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
    }

    // Already paid/active, no need to query DANA
    if (booking.status === "active" || booking.status === "paid") {
      return NextResponse.json({ paid: true, status: booking.status });
    }

    if (!booking.dana_partner_ref) {
      return NextResponse.json({ paid: false, status: booking.status, message: "Belum ada transaksi QRIS" });
    }

    // Query DANA for payment status
    const result = await queryPaymentStatus(
      booking.dana_partner_ref,
      booking.dana_reference_no || ""
    );

    // If paid, update booking status
    if (result.paid && booking.status === "pending") {
      await supabaseAdmin.from("bookings").update({
        status: "pending", // stays pending for OP to activate, but mark payment verified
        dana_payment_verified: true,
        dana_paid_at: new Date().toISOString(),
      }).eq("id", booking_id);
    }

    return NextResponse.json({
      paid: result.paid,
      status: result.transactionStatus,
      responseCode: result.responseCode,
    });
  } catch (err: any) {
    console.error("[DANA Query Status] Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Gagal mengecek status pembayaran" },
      { status: 500 }
    );
  }
}
