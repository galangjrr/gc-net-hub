import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/verify
 * Memverifikasi validitas token HMAC admin_session_token secara kriptografis di server
 */
export async function GET(req: Request) {
  try {
    const session = getAdminSession(req);

    if (!session) {
      return NextResponse.json({ authenticated: false, error: "Sesi tidak valid atau telah kadaluarsa" }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      role: session.role,
      exp: session.exp,
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
