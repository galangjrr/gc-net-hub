export const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function isAdminRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  return cookieHeader.includes("admin_unlocked=true");
}
