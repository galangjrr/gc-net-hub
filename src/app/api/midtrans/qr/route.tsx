/**
 * GET /api/midtrans/qr?kind=qris&tx=<uuid>&booking=GC1234
 * A GC Net branded payment card (PNG) around the Midtrans QR, sent as a download so a player paying
 * from the same phone can save it and pick it from the gallery in DANA / OVO / m-banking.
 * Midtrans' own QR URL has no CORS, so the browser can't save it directly.
 * Only a UUID is accepted; the Midtrans URL is rebuilt server-side (no open proxy). Amount and paket
 * come from the DB, never the query string.
 */

import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { qrImageUrl } from "@/lib/midtrans";
import { supabaseAdmin } from "@/lib/supabase";
import { onlinePrice, rupiah } from "@/lib/paket";
import { unpaidExpiresAt } from "@/lib/booking-rules";

const GREEN = "#76b900";
const BG = "#090a0c";
const SURFACE = "#15161b";
const LINE = "#23252c";
const MUTED = "#9a9ea6";

const STEPS = [
  "Buka DANA, OVO, LinkAja, atau m-banking",
  "Pilih Scan, lalu ambil gambar ini dari galeri",
  "Balik ke halaman booking, lunas otomatis",
];

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const url = qrImageUrl(params.get("kind") || "", params.get("tx") || "");
  const bookingId = params.get("booking") || "";
  if (!url || !/^GC\d{4}$/.test(bookingId)) return NextResponse.json({ error: "QR tidak valid." }, { status: 400 });

  const [qrRes, { data: booking }] = await Promise.all([
    fetch(url, { cache: "no-store" }).catch(() => null),
    supabaseAdmin
      .from("bookings")
      .select("id, created_at, status, payment_status, payment_method, booking_type, pakets(name, price)")
      .eq("id", bookingId)
      .maybeSingle(),
  ]);
  if (!booking) return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
  if (!qrRes?.ok || !qrRes.headers.get("content-type")?.startsWith("image/")) {
    return NextResponse.json({ error: "QR sudah tidak tersedia. Buat pembayaran baru." }, { status: 502 });
  }

  const qr = `data:image/png;base64,${Buffer.from(await qrRes.arrayBuffer()).toString("base64")}`;
  const paket = Array.isArray(booking.pakets) ? booking.pakets[0] : booking.pakets;
  const price = Number(paket?.price) || 0;
  const expiresAt = unpaidExpiresAt(booking);
  const deadline = expiresAt
    ? new Date(expiresAt).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).replace(".", ":")
    : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: GREEN, color: "#000", padding: "28px 44px" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>GC NET HUB</div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 4, border: "3px solid #000", borderRadius: 10, padding: "4px 14px" }}>QRIS</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "36px 44px 0" }}>
          <div style={{ display: "flex", fontSize: 22, color: MUTED }}>Total bayar</div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: GREEN, letterSpacing: -2, lineHeight: 1.1 }}>{rupiah(onlinePrice(price))}</div>
          <div style={{ display: "flex", fontSize: 24, color: "#d4d4d8", marginTop: 6 }}>
            {`${booking.id} · ${paket?.name ?? "Paket"}`}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
          <div style={{ display: "flex", background: "#fff", borderRadius: 24, padding: 22, border: `6px solid ${GREEN}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={qr} width={440} height={440} />
          </div>
        </div>

        {deadline && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 22, fontSize: 24, color: "#f59e0b", fontWeight: 700 }}>
            {`Bayar sebelum ${deadline} WIB`}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", margin: "28px 44px 0", padding: "22px 26px", background: SURFACE, border: `2px solid ${LINE}`, borderRadius: 18 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", marginTop: i ? 16 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 20, background: GREEN, color: "#000", fontSize: 22, fontWeight: 800, marginRight: 18 }}>
                {String(i + 1)}
              </div>
              <div style={{ display: "flex", fontSize: 24, color: "#e4e4e7" }}>{s}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "auto", padding: "0 0 30px", fontSize: 20, color: MUTED }}>
          gcnethub.vercel.app
        </div>
      </div>
    ),
    {
      width: 720,
      height: 1240,
      headers: {
        "Content-Disposition": `attachment; filename="QRIS-GCNet-${booking.id}.png"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
