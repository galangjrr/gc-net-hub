/**
 * API Route: DANA Finish Notify Webhook
 * POST /api/webhooks/dana
 * 
 * This endpoint receives server-to-server payment notifications from DANA
 * when a gamer successfully completes a QRIS payment.
 * 
 * SECURITY:
 * 1. Verifies X-SIGNATURE using HMAC-SHA512 with client secret
 * 2. Validates timestamp freshness (max 5 min drift)
 * 3. Idempotent: duplicate notifications are safely ignored
 */

import { NextResponse } from "next/server";
import { verifyWebhookSignature, getTimestamp } from "@/lib/dana";
import { supabaseAdmin } from "@/lib/supabase";

// Max allowed clock drift between DANA's timestamp and our server (5 minutes)
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;

function isTimestampFresh(danaTimestamp: string): boolean {
  try {
    const danaTime = new Date(danaTimestamp).getTime();
    const now = Date.now();
    return Math.abs(now - danaTime) <= MAX_TIMESTAMP_DRIFT_MS;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const timestamp = req.headers.get("X-TIMESTAMP") || "";
    const signature = req.headers.get("X-SIGNATURE") || "";
    const accessToken = (req.headers.get("Authorization") || "").replace("Bearer ", "");

    // Guard 1: Timestamp freshness
    if (!timestamp || !isTimestampFresh(timestamp)) {
      console.warn("[DANA Webhook] Stale or missing timestamp:", timestamp);
      return NextResponse.json(
        { responseCode: "4004701", responseMessage: "Timestamp expired" },
        { status: 400 }
      );
    }

    // Guard 2: Signature verification
    const relativePath = "/api/webhooks/dana";
    const signatureValid = verifyWebhookSignature(
      "POST",
      relativePath,
      accessToken,
      rawBody,
      timestamp,
      signature
    );

    if (!signatureValid) {
      console.warn("[DANA Webhook] Invalid signature");
      return NextResponse.json(
        { responseCode: "4014700", responseMessage: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the verified body
    const payload = JSON.parse(rawBody);

    const partnerReferenceNo = payload.originalPartnerReferenceNo || payload.partnerReferenceNo || "";
    const transactionStatus = payload.latestTransactionStatus?.transactionStatusDesc || "";
    const paidAmount = payload.amount?.value ? parseFloat(payload.amount.value) : 0;

    if (!partnerReferenceNo) {
      console.warn("[DANA Webhook] Missing partnerReferenceNo in payload");
      return NextResponse.json(
        { responseCode: "4004701", responseMessage: "Missing reference" },
        { status: 400 }
      );
    }

    // Find booking by DANA partner reference
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, status, dana_payment_verified")
      .eq("dana_partner_ref", partnerReferenceNo)
      .single();

    if (!booking) {
      console.warn("[DANA Webhook] Booking not found for ref:", partnerReferenceNo);
      // Return 200 OK anyway to prevent DANA from retrying
      return NextResponse.json({
        responseCode: "2004700",
        responseMessage: "Noted but booking not found",
      });
    }

    // Idempotent: skip if already verified
    if (booking.dana_payment_verified) {
      return NextResponse.json({
        responseCode: "2004700",
        responseMessage: "Already processed",
      });
    }

    // Mark payment as verified if DANA says success
    const isSuccess = transactionStatus.toUpperCase().includes("SUCCESS") || transactionStatus === "00";

    if (isSuccess) {
      await supabaseAdmin.from("bookings").update({
        dana_payment_verified: true,
        dana_paid_at: new Date().toISOString(),
        dana_paid_amount: paidAmount,
      }).eq("id", booking.id);

      console.log(`[DANA Webhook] Payment verified: ${partnerReferenceNo} = Rp ${paidAmount}`);
    } else {
      console.log(`[DANA Webhook] Non-success status for ${partnerReferenceNo}: ${transactionStatus}`);
    }

    // DANA expects a specific response format
    return NextResponse.json({
      responseCode: "2004700",
      responseMessage: "Success",
    });
  } catch (err: any) {
    console.error("[DANA Webhook] Unhandled error:", err?.message || err);
    // Return 200 to prevent DANA from infinite retries on our parse errors
    return NextResponse.json({
      responseCode: "5004700",
      responseMessage: "Internal error",
    });
  }
}
