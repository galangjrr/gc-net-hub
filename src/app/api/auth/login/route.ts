import { NextResponse } from "next/server";
import { ADMIN_USERNAME, ADMIN_PASSWORD, createAdminSessionToken, hashStaffPassword } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// In-Memory Rate Limiting Store (Memory-safe sliding window per IP)
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

function checkRateLimit(ip: string): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  if (record.lockUntil > now) {
    const remaining = Math.ceil((record.lockUntil - now) / 60000);
    return { allowed: false, waitMinutes: remaining };
  }

  if (record.lockUntil > 0 && record.lockUntil <= now) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  record.count += 1;

  if (record.count >= 5) {
    record.lockUntil = now + 15 * 60 * 1000; // 15 minutes cooldown
  }
  loginAttempts.set(ip, record);
}

function resetAttempts(ip: string) {
  loginAttempts.delete(ip);
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan gagal. Akses dikunci sementara selama ${rateCheck.waitMinutes} menit demi keamanan.` },
        { status: 429 }
      );
    }

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
      matchedRole = 'super_admin';
    }

    // 2. Match against Environment Variables if custom set in Vercel
    if (!isAuthenticated && ADMIN_USERNAME && ADMIN_PASSWORD) {
      if (normalizedUser === ADMIN_USERNAME.toLowerCase() && cleanPass === ADMIN_PASSWORD) {
        isAuthenticated = true;
        matchedRole = 'admin';
      }
    }

    // 3. Match against Dedicated staff Table
    if (!isAuthenticated) {
      try {
        const { data: staffMember } = await supabaseAdmin
          .from("staff")
          .select("*")
          .eq("username", normalizedUser)
          .eq("is_active", true)
          .maybeSingle();

        if (staffMember) {
          const hashedInput = hashStaffPassword(cleanPass);
          if (staffMember.password_hash === hashedInput || staffMember.password_hash === cleanPass) {
            isAuthenticated = true;
            matchedUser = staffMember.full_name || staffMember.username;
            matchedRole = staffMember.role || 'operator';
          }
        }
      } catch (_) {}
    }

    if (isAuthenticated) {
      resetAttempts(ip);
      const maxAge = rememberMe ? 31536000 : 43200; // 1 year or 12 hours
      const sessionToken = createAdminSessionToken(matchedUser, matchedRole, maxAge);

      const response = NextResponse.json({ success: true, user: matchedUser, role: matchedRole });

      // 1. Kriptografis HttpOnly Cookie (Inaccessible via JavaScript / DevTools document.cookie)
      response.cookies.set("admin_session_token", sessionToken, {
        path: "/",
        maxAge: maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      // 2. UI Indicator Cookie (Hanya untuk indikator visual frontend, bukan validasi otoritas API)
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

    // Record failed attempt on wrong credentials
    recordFailedAttempt(ip);
    const updatedRecord = loginAttempts.get(ip);
    const remainingChances = Math.max(0, 5 - (updatedRecord?.count || 0));

    return NextResponse.json({ 
      error: remainingChances > 0 
        ? `Username atau Password Salah. Sisa kesempatan: ${remainingChances}x.` 
        : "Akun dikunci sementara 15 menit karena 5x gagal." 
    }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
