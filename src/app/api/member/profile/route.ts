import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMemberUser } from "@/lib/auth";

/**
 * GET /api/member/profile
 * Profil member yang sedang login (Authorization: Bearer <access_token>)
 */
export async function GET(req: Request) {
  try {
    const user = await getMemberUser(req);
    if (!user) {
      return NextResponse.json({ error: "Login member dulu" }, { status: 401 });
    }

    const { data: member, error } = await supabaseAdmin
      .from("members")
      .select("*")
      .eq("id", user.id)
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
    const { username, phone, full_name } = body;

    if (!username) {
      return NextResponse.json({ error: "Username wajib diisi" }, { status: 400 });
    }

    // Signed in: edit your own row. Right after sign-up there is no session yet (email confirmation is on),
    // so an account whose email is still unconfirmed may create its row once; it can never overwrite one.
    let user = await getMemberUser(req);
    let insertOnly = false;
    if (!user) {
      const { data } = typeof body.id === "string" && body.id ? await supabaseAdmin.auth.admin.getUserById(body.id) : { data: null };
      const fresh = data?.user;
      if (!fresh || fresh.email_confirmed_at || fresh.email?.toLowerCase() !== String(body.email || "").trim().toLowerCase()) {
        return NextResponse.json({ error: "Login member dulu" }, { status: 401 });
      }
      user = fresh;
      insertOnly = true;
    }
    const id = user.id;
    const email = user.email || "";

    // Validasi format username (persiapan gc_user_id)
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return NextResponse.json({ 
        error: "Username hanya boleh huruf, angka, dan underscore (3-20 karakter)" 
      }, { status: 400 });
    }

    // Upsert profil member ke tabel members
    const row = {
      id,
      email: email.trim().toLowerCase(),
      username: cleanUsername,
      phone: phone ? String(phone).trim() : null,
      full_name: full_name ? String(full_name).trim() : cleanUsername,
      updated_at: new Date().toISOString()
    };
    const { data, error } = insertOnly
      ? await supabaseAdmin.from("members").insert(row).select().single()
      : await supabaseAdmin.from("members").upsert(row, { onConflict: "id" }).select().single();

    if (error) {
      console.error("[Member Profile] Upsert error:", error);
      if (error.code === "23505" || error.message?.toLowerCase().includes("unique")) {
        return NextResponse.json({ 
          error: "Username ini sudah dipakai pemain lain. Coba pakai nickname lain ya." 
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message || "Gagal menyimpan data member" }, { status: 500 });
    }

    return NextResponse.json({ success: true, member: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
