import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/member/bookings?member_id=...&player_name=...
 * Mengambil riwayat booking milik member
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("member_id");
    const playerName = searchParams.get("player_name");

    if (!memberId && !playerName) {
      return NextResponse.json({ error: "Missing member_id or player_name" }, { status: 400 });
    }

    let query = supabaseAdmin
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
      .limit(10);

    if (memberId) {
      query = query.eq("member_id", memberId);
    } else if (playerName) {
      query = query.ilike("player_name", playerName);
    }

    const { data: bookings, error } = await query;

    if (error) {
      // Fallback jika foreign key join bermasalah di supabase schema
      let simpleQuery = supabaseAdmin
        .from("bookings")
        .select("id, pc_id, paket_id, player_name, status, created_at, member_id")
        .order("created_at", { ascending: false })
        .limit(10);

      if (memberId) {
        simpleQuery = simpleQuery.eq("member_id", memberId);
      } else if (playerName) {
        simpleQuery = simpleQuery.ilike("player_name", playerName);
      }

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
