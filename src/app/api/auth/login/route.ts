import { NextResponse } from "next/server";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { username, password, rememberMe } = await req.json();

    const normalizedUser = (username || "").trim().toLowerCase();
    const cleanPass = (password || "").trim();

    if (!normalizedUser || !cleanPass) {
      return NextResponse.json({ error: "Username dan Password wajib diisi" }, { status: 400 });
    }

    let isAuthenticated = false;
    let matchedUser = normalizedUser;
    let matchedRole = 'operator';

    // 1. Primary GC Net Master Owner Credential
    if (normalizedUser === "gcnet" && cleanPass === (ADMIN_PASSWORD || "gcnet1975")) {
      isAuthenticated = true;
      matchedRole = 'owner';
    }

    // 2. Match against Environment Variables if custom set in Vercel
    if (!isAuthenticated && ADMIN_USERNAME && ADMIN_PASSWORD) {
      if (normalizedUser === ADMIN_USERNAME.toLowerCase() && cleanPass === ADMIN_PASSWORD) {
        isAuthenticated = true;
        matchedRole = 'admin';
      }
    }

    // 3. Match against Database Managed Staff Accounts
    if (!isAuthenticated) {
      try {
        const { data: rows } = await supabaseAdmin
          .from("inventory")
          .select("*")
          .eq("category", "staff_account")
          .neq("stock", 0); // active accounts only

        if (rows && rows.length > 0) {
          for (const r of rows) {
            try {
              const acc = JSON.parse(r.name);
              if (acc.username?.toLowerCase() === normalizedUser && acc.password === cleanPass) {
                isAuthenticated = true;
                matchedUser = acc.fullName || acc.username;
                matchedRole = acc.role || 'operator';
                break;
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    if (isAuthenticated) {
      const response = NextResponse.json({ success: true, user: matchedUser, role: matchedRole });
      const maxAge = rememberMe ? 31536000 : 43200; // 1 year or 12 hours

      response.cookies.set("admin_unlocked", "true", {
        path: "/",
        maxAge: maxAge,
        httpOnly: false,
        sameSite: "lax",
      });

      if (rememberMe) {
        response.cookies.set("admin_forever", "true", {
          path: "/",
          maxAge: 31536000,
          httpOnly: false,
          sameSite: "lax",
        });
      }

      return response;
    }

    return NextResponse.json({ error: "Username atau Password Salah" }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
