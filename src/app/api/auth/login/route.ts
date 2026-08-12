import { NextResponse } from "next/server";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password, rememberMe } = await req.json();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true });
      
      const maxAge = rememberMe ? 31536000 : 43200; // 1 year or 12 hours
      
      response.cookies.set("admin_unlocked", "true", {
        path: "/",
        maxAge: maxAge,
        httpOnly: false, // Must be readable by client script for middleware-less state OR we can just use the response status to flip client state
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
    
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
