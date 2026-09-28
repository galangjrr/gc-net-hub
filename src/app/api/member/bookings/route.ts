import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMemberUser } from "@/lib/auth";

/**
 * GET /api/member/bookings
 * Riwayat booking member yang sedang login (Authorization: Bearer <access_token>)
 */
export async function GET(req: Request) {
  try {
    const user = await getMemberUser(req);
    if (!user) {
      return NextResponse.json({ error: "Login member dulu" }, { status: 401 });
    }

    const query = supabaseAdmin
      .from("bookings")
      .select(`
        id,
        pc_id,
        paket_id,
        player_name,
        status,
        created_at,
        member_id,
        pcs:pc_id (name, type),
        pakets:paket_id (name, price, duration_hours)
      `)
      .order("created_at", { ascending: false })
      .eq("member_id", user.id)
      .limit(10);

    const { data: bookings, error } = await query;

    if (error) {
      // Fallback jika foreign key join bermasalah di supabase schema
      const simpleQuery = supabaseAdmin
        .from("bookings")
        .select("id, pc_id, paket_id, player_name, status, created_at, member_id")
        .order("created_at", { ascending: false })
        .eq("member_id", user.id)
        .limit(10);

      const { data: fallbackBookings, error: fallbackError } = await simpleQuery;
      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }

      return NextResponse.json({ bookings: fallbackBookings || [] });
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
