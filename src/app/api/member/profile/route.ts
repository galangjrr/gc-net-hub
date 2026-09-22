import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/member/profile?user_id=...
 * Mengambil profil member berdasarkan auth user id
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const { data: member, error } = await supabaseAdmin
      .from("members")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/member/profile
 * Sinkronisasi/Pastikan profile member tersimpan saat register
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, email, username, phone, full_name } = body;

    if (!id || !email || !username) {
      return NextResponse.json({ error: "ID, email, dan username wajib diisi" }, { status: 400 });
    }

    // Validasi format username (persiapan gc_user_id)
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return NextResponse.json({ 
        error: "Username hanya boleh huruf, angka, dan underscore (3-20 karakter)" 
      }, { status: 400 });
    }

    // Upsert profil member ke tabel members
    const { data, error } = await supabaseAdmin
      .from("members")
      .upsert({
        id,
        email: email.trim().toLowerCase(),
        username: cleanUsername,
        phone: phone ? phone.trim() : null,
        full_name: full_name ? full_name.trim() : cleanUsername,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("[Member Profile] Upsert error:", error);
      if (error.code === "23505" || error.message?.toLowerCase().includes("unique")) {
        return NextResponse.json({ 
          error: "Username ini sudah digunakan pemain lain. Silakan pilih nickname lain." 
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message || "Gagal menyimpan data member" }, { status: 500 });
    }

    return NextResponse.json({ success: true, member: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
