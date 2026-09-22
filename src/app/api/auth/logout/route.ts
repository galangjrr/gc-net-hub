import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out" });

  response.cookies.set("admin_session_token", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  response.cookies.set("admin_unlocked", "", {
    path: "/",
    maxAge: 0,
    httpOnly: false,
    sameSite: "lax",
  });

  response.cookies.set("admin_forever", "", {
    path: "/",
    maxAge: 0,
    httpOnly: false,
    sameSite: "lax",
  });

  return response;
}
