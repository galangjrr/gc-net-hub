import crypto from "crypto";

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Secret key untuk HMAC signing session token admin
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "gcnet-secure-admin-token-salt-1975";

export interface AdminSession {
  user: string;
  role: string;
  exp: number; // timestamp expiry
}

/**
 * Membuat token session yang ditandatangani HMAC-SHA256
 * Format: base64(payload).signature
 */
export function createAdminSessionToken(user: string, role: string = "operator", maxAgeSeconds: number = 43200): string {
  const payload: AdminSession = {
    user,
    role,
    exp: Date.now() + maxAgeSeconds * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Memverifikasi validitas dan keaslian token admin session
 */
export function verifyAdminSessionToken(token: string | null | undefined): AdminSession | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  // Verifikasi signature HMAC
  const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(encodedPayload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null; // Token telah dimanipulasi
  }

  try {
    const payload: AdminSession = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    // Cek expired
    if (Date.now() > payload.exp) {
      return null; // Sesi kadaluarsa
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Helper untuk memeriksa apakah request HTTP berasal dari Admin / Operator yang sah
 */
export function isAdminRequest(req: Request): boolean {
  const cookieHeader = req.headers.get("cookie") || "";
  
  // Ekstrak cookie admin_session_token
  const match = cookieHeader.match(/admin_session_token=([^;]+)/);
  if (!match) {
    // Backward compatibility darurat: jika masih ada admin_unlocked lama saat transisi
    // tapi ke depan kita utamakan token kriptografis
    return false;
  }

  const token = match[1];
  const session = verifyAdminSessionToken(token);
  return session !== null;
}

/**
 * Helper untuk mengambil info sesi admin dari request
 */
export function getAdminSession(req: Request): AdminSession | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/admin_session_token=([^;]+)/);
  if (!match) return null;
  return verifyAdminSessionToken(match[1]);
}

/**
 * Hashing password staff dengan HMAC-SHA256
 */
export function hashStaffPassword(password: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(password.trim()).digest("hex");
}

