/**
 * API Route: Generate QRIS Dynamic Code
 * POST /api/dana/qris/generate
 * 
 * Called by frontend when gamer selects QRIS payment method and confirms booking.
 * Returns a QR content string that the frontend renders as a scannable barcode.
 */

import { NextResponse } from "next/server";
import { generateQris } from "@/lib/dana";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { booking_id } = await req.json();

    if (!booking_id || typeof booking_id !== "string") {
      return NextResponse.json({ error: "booking_id wajib diisi" }, { status: 400 });
    }

    // Fetch booking + paket to get the amount
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("*, pakets(*)")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
    }

    if (booking.status !== "pending") {
      return NextResponse.json({ error: "Booking sudah diproses atau dibatalkan" }, { status: 400 });
    }

    const amount = booking.pakets?.price;
    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Nominal paket tidak valid" }, { status: 400 });
    }

    // Generate unique partner reference (max 25 chars)
    // Format: GC-{timestamp_base36}-{random} 
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    const partnerReferenceNo = `GC-${ts}-${rnd}`.slice(0, 25);

    // Call DANA SNAP API
    const result = await generateQris({
      partnerReferenceNo,
      amount,
    });

    // Store DANA reference data on the booking for reconciliation
    await supabaseAdmin.from("bookings").update({
      dana_partner_ref: partnerReferenceNo,
      dana_reference_no: result.referenceNo,
      dana_qr_content: result.qrContent,
      payment_method: "qris",
    }).eq("id", booking_id);

    return NextResponse.json({
      qrContent: result.qrContent,
      partnerReferenceNo,
      referenceNo: result.referenceNo,
      amount,
    });
  } catch (err: any) {
    console.error("[DANA QRIS Generate] Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Gagal membuat kode QRIS" },
      { status: 500 }
    );
  }
}
