export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export function isAdminRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  return cookieHeader.includes("admin_unlocked=true");
}
