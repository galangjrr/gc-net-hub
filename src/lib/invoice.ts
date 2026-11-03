/**
 * Payment invoice e-mail, sent once when a booking turns paid. Uses the Resend REST API with plain
 * fetch, no SDK. Without RESEND_API_KEY / INVOICE_FROM_EMAIL it logs and skips: e-mail is a receipt,
 * never something a payment should fail over.
 */

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");
const wib = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB";

export type InvoiceData = {
  bookingId: string;
  playerName: string;
  pcName: string;
  paketName: string;
  amount: number;
  method: "online" | "kasir";
  paidAt: string;
  statusUrl: string;
};

export function buildInvoice(d: InvoiceData): { subject: string; html: string; text: string } {
  const rows: [string, string][] = [
    ["Kode booking", d.bookingId],
    ["Nickname", d.playerName],
    ["PC", d.pcName],
    ["Paket", d.paketName],
    ["Metode bayar", d.method === "online" ? "Online (QRIS / e-wallet)" : "Tunai di kasir"],
    ["Waktu lunas", wib(d.paidAt)],
  ];
  const subject = `Invoice GC Net ${d.bookingId}, ${rupiah(d.amount)} lunas`;
  const text = [
    "GC Net, bukti pembayaran booking",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    `Total: ${rupiah(d.amount)}`,
    `Cek posisi antrean: ${d.statusUrl}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#0b0c0e;font-family:Arial,sans-serif;color:#e4e4e7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#16171b;border:1px solid #2a2b31;border-radius:12px">
<tr><td style="padding:20px 24px;border-bottom:2px solid #76b900">
<div style="font-size:12px;letter-spacing:2px;color:#76b900;font-weight:bold">GC NET</div>
<div style="font-size:20px;font-weight:bold;color:#fff;margin-top:4px">Pembayaran lunas</div>
</td></tr>
<tr><td style="padding:16px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;font-size:13px;color:#a1a1aa">${k}</td><td align="right" style="padding:6px 0;font-size:13px;color:#fff;font-weight:bold">${escapeHtml(v)}</td></tr>`).join("")}
<tr><td style="padding:12px 0 0;border-top:1px solid #2a2b31;font-size:14px;color:#fff">Total</td><td align="right" style="padding:12px 0 0;border-top:1px solid #2a2b31;font-size:18px;color:#76b900;font-weight:bold">${rupiah(d.amount)}</td></tr>
</table></td></tr>
<tr><td style="padding:8px 24px 24px"><a href="${escapeHtml(d.statusUrl)}" style="display:block;text-align:center;background:#76b900;color:#000;font-weight:bold;font-size:14px;text-decoration:none;padding:12px;border-radius:8px">Cek posisi antrean</a>
<p style="font-size:11px;color:#71717a;margin:12px 0 0">Tunjukkan kode booking ke OP saat datang. Email ini dikirim otomatis, tidak perlu dibalas.</p></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, text };
}

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

/** Sends the invoice for a booking that just turned paid, then stamps invoice_sent_at. Never throws. */
export async function sendBookingInvoice(bookingId: string): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.INVOICE_FROM_EMAIL;
    const { supabaseAdmin } = await import("@/lib/supabase");

    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select("id, player_name, payment_method, paid_at, customer_email, invoice_sent_at, pcs(name), pakets(name, price)")
      .eq("id", bookingId)
      .maybeSingle();
    if (!b?.customer_email || !b.paid_at || b.invoice_sent_at) return;
    if (!apiKey || !from) {
      console.warn("[Invoice] RESEND_API_KEY / INVOICE_FROM_EMAIL belum diisi, invoice tidak dikirim:", bookingId);
      return;
    }

    // Claim the send first so a webhook and a status check racing each other send one e-mail.
    const { data: claimed } = await supabaseAdmin
      .from("bookings")
      .update({ invoice_sent_at: new Date().toISOString() })
      .eq("id", bookingId)
      .is("invoice_sent_at", null)
      .select("id");
    if (!claimed?.length) return;

    const pc = Array.isArray(b.pcs) ? b.pcs[0] : b.pcs;
    const paket = Array.isArray(b.pakets) ? b.pakets[0] : b.pakets;
    const price = Number(paket?.price) || 0;
    const { onlinePrice } = await import("@/lib/paket");
    const inv = buildInvoice({
      bookingId: b.id,
      playerName: b.player_name,
      pcName: pc?.name || "-",
      paketName: paket?.name || "-",
      amount: b.payment_method === "online" ? onlinePrice(price) : price,
      method: b.payment_method === "online" ? "online" : "kasir",
      paidAt: b.paid_at,
      statusUrl: `${siteUrl()}/booking/${b.id}`,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [b.customer_email], subject: inv.subject, html: inv.html, text: inv.text }),
    });
    if (!res.ok) {
      console.error("[Invoice] Resend error:", res.status, await res.text().catch(() => ""));
      // Release the claim so the next status check or webhook retry tries again.
      await supabaseAdmin.from("bookings").update({ invoice_sent_at: null }).eq("id", bookingId);
    }
  } catch (err) {
    console.error("[Invoice] Gagal kirim invoice:", bookingId, err);
  }
}
