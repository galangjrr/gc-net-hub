/**
 * API Route: Request B2B Access Token
 * POST /api/dana/token
 * 
 * Utility endpoint for debugging/testing the DANA token flow.
 * In production, tokens are managed internally by src/lib/dana.ts.
 * Protected: admin-only access.
 */

import { NextResponse } from "next/server";
import { getAccessToken, getTimestamp } from "@/lib/dana";
import { isAdminRequest } from "@/lib/auth";

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getAccessToken();
    return NextResponse.json({
      accessToken: token.slice(0, 12) + "...", // Never expose full token
      timestamp: getTimestamp(),
      status: "ok",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal mendapatkan token DANA" },
      { status: 500 }
    );
  }
}
