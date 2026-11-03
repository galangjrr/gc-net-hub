"use client";

import Link from "next/link";
import Script from "next/script";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { rupiah, onlinePrice, type PayChannel } from "@/lib/paket";
import { Download, Banknote, Check, CheckCircle2, ChevronLeft, Clock, Copy, Gamepad2, Hourglass, Loader2, QrCode, RotateCw, SearchX, Smartphone, Wallet, WifiOff } from "lucide-react";

type BookingView = {
  id: string;
  player_name: string;
  status: "pending" | "active";
  payment_status: "paid" | "unpaid";
  payment_method: "online" | "kasir";
  booking_type: string | null;
  start_time: string | null;
  scheduled_at: string | null;
  pc_name: string;
  paket_name: string;
  price: number;
  /** What was actually paid online (channel-priced); null for cash and older bookings. */
  paid_amount: number | null;
  expires_at: number | null;
  queue_position: number | null;
};

type Method = PayChannel;
type Charge = { method: Method; orderId: string; qrImageUrl: string | null; qrDownloadUrl: string | null; deeplinkUrl: string | null };

const CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
const ONLINE_ENABLED = Boolean(CLIENT_KEY);
// shortcut: Midtrans hasn't opened Core API (/v2/charge, 402) for this merchant yet, so pay via the Snap popup.
// Flip to false once they do to get the dark QRIS/GoPay picker below back.
const PAY_WITH_SNAP = true;
const SNAP_SRC = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";
type SnapApi = { pay: (token: string, opts: { onSuccess?: () => void; onPending?: () => void; onError?: () => void; onClose?: () => void }) => void };
const orderKey = (id: string) => `gc-order-${id}`;

const METHODS: { key: Method; label: string; hint: string; icon: typeof QrCode }[] = [
  { key: "qris", label: "QRIS", hint: "DANA, OVO, LinkAja, m-banking", icon: QrCode },
  { key: "gopay", label: "GoPay", hint: "Langsung buka aplikasi GoPay", icon: Wallet },];

function readOrder(id: string): string | null {
  try { return sessionStorage.getItem(orderKey(id)); } catch { return null; }
}
function saveOrder(id: string, orderId: string) {
  try { sessionStorage.setItem(orderKey(id), orderId); } catch { /* private mode: status still polled from state */ }
}
function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function scheduleLabel(b: BookingView): string | null {
  const iso = b.scheduled_at || b.start_time;
  if (!iso || (b.booking_type !== "slot" && b.booking_type !== "scheduled")) return null;
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB";
}

export function StatusSkeleton() {
  return (
    <div className="max-w-md mx-auto px-4 py-8 animate-pulse" aria-busy="true" aria-label="Memuat status booking">
      <div className="h-4 w-28 bg-white/10 rounded mx-auto" />
      <div className="h-10 w-44 bg-white/10 rounded mx-auto mt-3" />
      <div className="h-36 rounded-xl bg-white/[0.06] mt-8" />
      <div className="h-11 rounded-lg bg-white/[0.06] mt-4" />
    </div>
  );
}

export default function BookingStatus() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingView | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");
  const [now, setNow] = useState(() => Date.now());
  const [charge, setCharge] = useState<Charge | null>(null);
  const [charging, setCharging] = useState<Method | null>(null);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [snapReady, setSnapReady] = useState(false);
  const [snapOrder, setSnapOrder] = useState<{ channel: Method; orderId: string; token: string } | null>(null);
  const [snapOpening, setSnapOpening] = useState<Method | null>(null);
  const cleared = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${id}`, { cache: "no-store" });
      if (res.status === 404 || res.status === 400) return setState("notfound");
      if (!res.ok) throw new Error();
      setBooking(await res.json());
      setState("ready");
    } catch {
      setState((s) => (s === "ready" ? s : "error"));
    }
  }, [id]);

  const checkPaid = useCallback(async (orderId: string | null) => {
    if (orderId) {
      try {
        await fetch("/api/midtrans/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId }),
        });
      } catch { /* the reload below shows whatever state we have */ }
    }
    await load();
  }, [load]);

  // First load; a settled order may be remembered from before (refresh / app return).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- checkPaid only sets state after its fetches resolve
    checkPaid(readOrder(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Drop ?pay from the URL (came from checkout's "Bayar Sekarang"); methods are already shown.
  useEffect(() => {
    if (!cleared.current && params.get("pay")) {
      cleared.current = true;
      router.replace(`/booking/${id}`, { scroll: false });
    }
  }, [params, id, router]);

  // Back from a GoPay/ShopeePay app: tab visible again, check immediately.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && booking?.payment_status === "unpaid") checkPaid(readOrder(id));
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [booking?.payment_status, checkPaid, id]);

  // Live: countdown each second, booking reload every 15s.
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) load(); }, 15000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(t); clearInterval(tick); };
  }, [load]);

  // While a QR/charge is open, poll settlement every 4s so the page flips to "Lunas" on its own.
  const pollOrderId = charge?.orderId ?? snapOrder?.orderId ?? null;
  useEffect(() => {
    if (!pollOrderId || booking?.payment_status !== "unpaid") return;
    const t = setInterval(async () => {
      setChecking(true);
      await checkPaid(pollOrderId);
      setChecking(false);
    }, 4000);
    return () => clearInterval(t);
  }, [pollOrderId, booking?.payment_status, checkPaid]);

  const openSnap = useCallback((order: { orderId: string; token: string }) => {
    const snap = (window as unknown as { snap?: SnapApi }).snap;
    if (!snap) return setNotice("Halaman pembayaran belum siap. Tunggu sebentar lalu coba lagi.");
    snap.pay(order.token, {
      onSuccess: () => checkPaid(order.orderId),
      onPending: () => checkPaid(order.orderId),
      onError: () => setNotice("Pembayaran gagal. Coba lagi, atau bayar tunai ke OP."),
      onClose: () => checkPaid(order.orderId),
    });
  }, [checkPaid]);

  const startSnap = useCallback(async (channel: Method) => {
    // Snap tokens stay valid until the order expires, so reopening the same channel reuses the same order.
    // Another channel has another price, so it needs a new order.
    if (snapOrder?.channel === channel) return openSnap(snapOrder);
    setNotice(null);
    setSnapOpening(channel);
    try {
      const res = await fetch("/api/midtrans/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, channel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token || !data.order_id) {
        setNotice(data?.error || "Pembayaran gagal dibuka. Coba lagi, atau bayar tunai ke OP.");
        if (res.status === 409 || res.status === 410) load();
        return;
      }
      const order = { channel, orderId: data.order_id as string, token: data.token as string };
      saveOrder(id, order.orderId);
      setSnapOrder(order);
      openSnap(order);
    } catch {
      setNotice("Koneksi putus pas buka pembayaran. Coba lagi.");
    } finally {
      setSnapOpening(null);
    }
  }, [id, load, openSnap, snapOrder]);

  const startCharge = useCallback(async (method: Method) => {
    setNotice(null);
    setCharging(method);
    try {
      const res = await fetch("/api/midtrans/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, method }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.order_id) {
        setCharging(null);
        setNotice(data?.error || "Pembayaran gagal dibuka. Coba lagi, atau bayar tunai ke OP.");
        if (res.status === 409 || res.status === 410) load();
        return;
      }
      saveOrder(id, data.order_id);
      setCharge({ method, orderId: data.order_id, qrImageUrl: data.qrImageUrl ?? null, qrDownloadUrl: data.qrDownloadUrl ?? null, deeplinkUrl: data.deeplinkUrl ?? null });
      setCharging(null);
      if (method === "gopay" && data.deeplinkUrl) window.location.href = data.deeplinkUrl;
    } catch {
      setCharging(null);
      setNotice("Koneksi putus pas buka pembayaran. Coba lagi.");
    }
  }, [id, load]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked: the code is on screen anyway */ }
  };

  if (state === "loading") return <StatusSkeleton />;
  if (state === "notfound") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <SearchX className="mx-auto text-zinc-500 mb-3" size={28} />
        <h1 className="text-base font-bold">Booking {id} nggak ketemu</h1>
        <p className="text-sm text-zinc-400 mt-1">Kodenya salah, atau waktu bayarnya udah habis jadi bookingnya hangus.</p>
        <Link href="/booking" className="mt-5 h-10 px-4 rounded-lg bg-nvidia-green text-black text-sm font-bold inline-flex items-center">Booking ulang</Link>
      </div>
    );
  }
  if (state === "error" || !booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center" role="alert">
        <WifiOff className="mx-auto text-zinc-500 mb-3" size={28} />
        <h1 className="text-base font-bold">Status booking gagal dimuat</h1>
        <p className="text-sm text-zinc-400 mt-1">Booking lu aman. Cek koneksi lalu coba lagi.</p>
        <button onClick={load} className="mt-5 h-10 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-bold inline-flex items-center gap-2">
          <RotateCw size={14} /> Coba lagi
        </button>
      </div>
    );
  }

  const unpaid = booking.payment_status === "unpaid";
  const msLeft = booking.expires_at ? booking.expires_at - now : 0;
  const expired = unpaid && msLeft <= 0;
  const sched = scheduleLabel(booking);

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-10">
      {/* Booking code, the thing the player shows OP */}
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Kode booking</p>
        <button onClick={copyCode} className="mt-1 inline-flex items-center gap-2 font-mono text-4xl font-extrabold tracking-wider tabular-nums hover:text-nvidia-green" aria-label={`Salin kode booking ${id}`}>
          {id} {copied ? <Check size={18} className="text-nvidia-green" /> : <Copy size={16} className="text-zinc-500" />}
        </button>
      </div>

      {/* Status card */}
      <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4" aria-live="polite">
        {booking.status === "active" ? (
          <StatusLine icon={<Gamepad2 size={18} />} tone="green" title={`Lagi main di ${booking.pc_name}`} sub="Selamat main, GG." />
        ) : !unpaid ? (
          <StatusLine
            icon={<CheckCircle2 size={18} />}
            tone="green"
            title="Lunas"
            sub={sched
              ? `Jadwal main jam ${sched} di ${booking.pc_name}.`
              : booking.queue_position
                ? `Antrean ke-${booking.queue_position} di ${booking.pc_name}. Datang ke OP pas giliran lu.`
                : `Masuk antrean ${booking.pc_name}.`}
          />
        ) : expired ? (
          <StatusLine icon={<Clock size={18} />} tone="red" title="Waktu bayar habis" sub="Booking ini hangus. Silakan booking ulang." />
        ) : (
          <StatusLine
            icon={<Hourglass size={18} />}
            tone="amber"
            title={`Menunggu pembayaran, sisa ${clock(msLeft)}`}
            sub="Belum dapet nomor antrean. Nomor keluar begitu lunas, yang bayar duluan dilayani duluan."
          />
        )}

        <dl className="mt-4 pt-4 border-t border-white/[0.08] grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-zinc-400">Nickname</dt><dd className="text-right font-bold truncate">{booking.player_name}</dd>
          <dt className="text-zinc-400">PC</dt><dd className="text-right font-bold">{booking.pc_name}</dd>
          <dt className="text-zinc-400">Paket</dt><dd className="text-right font-bold truncate">{booking.paket_name}</dd>
          <dt className="text-zinc-400">Total</dt>
          <dd className="text-right font-extrabold tabular-nums">
            {rupiah(booking.paid_amount ?? (booking.payment_method === "online" ? onlinePrice(booking.price) : booking.price))}
          </dd>
        </dl>
      </div>

      {/* Payment */}
      {unpaid && !expired && ONLINE_ENABLED && PAY_WITH_SNAP && (
        <div className="mt-4">
          <Script src={SNAP_SRC} data-client-key={CLIENT_KEY} strategy="afterInteractive" onReady={() => setSnapReady(true)} />
          <p className="text-sm font-bold mb-2">Pilih cara bayar</p>
          <div className="space-y-2">
            {METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => startSnap(m.key)}
                disabled={!snapReady || snapOpening !== null}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left disabled:opacity-50 ${snapOrder?.channel === m.key ? "border-nvidia-green bg-nvidia-green/[0.08]" : "border-white/[0.1] bg-white/[0.03] hover:border-nvidia-green/60 hover:bg-nvidia-green/[0.06]"}`}
              >
                <span className="w-9 h-9 rounded-lg bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center shrink-0">
                  {snapOpening === m.key || !snapReady ? <Loader2 size={16} className="animate-spin text-nvidia-green" /> : <m.icon size={16} className="text-nvidia-green" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{snapOrder?.channel === m.key ? `Lanjut bayar ${m.label}` : m.label}</span>
                  <span className="block text-[11px] text-zinc-400">{m.hint}</span>
                </span>
                <span className="ml-auto text-sm font-extrabold tabular-nums">{rupiah(onlinePrice(booking.price, m.key))}</span>
              </button>
            ))}
          </div>
          {snapOrder && (
            <p className="mt-3 text-[12px] text-zinc-400 inline-flex items-center gap-2">
              {checking ? <Loader2 size={13} className="animate-spin" /> : <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-nvidia-green" /></span>}
              Nunggu pembayaran, halaman berubah otomatis begitu lunas.
            </p>
          )}
        </div>
      )}

      {unpaid && !expired && ONLINE_ENABLED && !PAY_WITH_SNAP && (
        <div className="mt-4">
          {!charge ? (
            <>
              <p className="text-sm font-bold mb-2">Pilih cara bayar</p>
              <div className="space-y-2">
                {METHODS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => startCharge(m.key)}
                    disabled={charging !== null}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-nvidia-green/60 hover:bg-nvidia-green/[0.06] transition text-left disabled:opacity-50"
                  >
                    <span className="w-9 h-9 rounded-lg bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center shrink-0">
                      {charging === m.key ? <Loader2 size={16} className="animate-spin text-nvidia-green" /> : <m.icon size={16} className="text-nvidia-green" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{m.label}</span>
                      <span className="block text-[11px] text-zinc-400">{m.hint}</span>
                    </span>
                    <span className="ml-auto text-zinc-500 text-sm">›</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <button onClick={() => { setCharge(null); setNotice(null); }} className="text-xs font-bold text-zinc-400 hover:text-white inline-flex items-center gap-1">
                  <ChevronLeft size={14} /> Ganti metode
                </button>
                <span className="text-[11px] font-bold tabular-nums text-amber-400 inline-flex items-center gap-1"><Clock size={12} /> {clock(msLeft)}</span>
              </div>

              {charge.qrImageUrl && (
                <div className="flex flex-col items-center">
                  {/* QR must sit on light bg to scan; a small white tile reads as intentional on the dark page */}
                  <div className="bg-white p-3 rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={charge.qrImageUrl} alt={`QR ${charge.method}`} width={200} height={200} className="w-44 h-44 sm:w-52 sm:h-52" />
                  </div>
                  {charge.qrDownloadUrl && (
                    <a
                      href={charge.qrDownloadUrl}
                      download={`QRIS-GCNet-${booking.id}.png`}
                      className="mt-3 h-11 w-full rounded-lg bg-nvidia-green text-black text-sm font-bold inline-flex items-center justify-center gap-2"
                    >
                      <Download size={16} /> Unduh QR
                    </a>
                  )}
                  <p className="mt-3 text-[12px] text-zinc-400 text-center">
                    {charge.method === "qris"
                      ? "Bayar dari HP ini? Unduh QR, buka DANA, OVO, atau m-banking, pilih Scan, lalu ambil QR dari galeri."
                      : `Scan pakai aplikasi ${charge.method}.`}
                  </p>
                </div>
              )}

              {charge.deeplinkUrl && (
                <a
                  href={charge.deeplinkUrl}
                  className="mt-3 h-11 w-full rounded-lg bg-nvidia-green text-black text-sm font-bold inline-flex items-center justify-center gap-2"
                >
                  <Smartphone size={16} /> Buka aplikasi {charge.method === "gopay" ? "GoPay" : "ShopeePay"}
                </a>
              )}

              {!charge.qrImageUrl && !charge.deeplinkUrl && (
                <p className="text-sm text-zinc-400">Lanjutkan pembayaran di aplikasi {charge.method}.</p>
              )}

              <p className="mt-3 pt-3 border-t border-white/[0.08] text-[12px] text-zinc-400 inline-flex items-center gap-2">
                {checking ? <Loader2 size={13} className="animate-spin" /> : <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-nvidia-green" /></span>}
                Nunggu pembayaran, halaman berubah otomatis begitu lunas.
              </p>
            </div>
          )}

          <p className="mt-3 text-[12px] text-zinc-400 flex gap-2">
            <Banknote size={14} className="shrink-0 text-amber-400 mt-px" />
            Atau datang ke OP, tunjukkan kode {booking.id}, dan bayar tunai.
          </p>
        </div>
      )}

      {unpaid && !expired && !ONLINE_ENABLED && (
        <p className="mt-4 text-[12px] text-zinc-400 flex gap-2">
          <Banknote size={14} className="shrink-0 text-amber-400 mt-px" />
          Datang ke OP, tunjukkan kode {booking.id}, dan bayar tunai untuk dapat nomor antrean.
        </p>
      )}

      {notice && <p role="alert" className="mt-4 text-sm text-amber-400">{notice}</p>}

      <div className="mt-8 flex justify-center gap-4 text-sm">
        <Link href="/" className="text-zinc-400 hover:text-white">Beranda</Link>
        <Link href="/booking" className="text-zinc-400 hover:text-white">Booking lagi</Link>
      </div>
    </div>
  );
}

function StatusLine({ icon, tone, title, sub }: { icon: React.ReactNode; tone: "green" | "amber" | "red"; title: string; sub: string }) {
  const color = tone === "green" ? "text-nvidia-green" : tone === "amber" ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex gap-3">
      <span className={`${color} mt-0.5`}>{icon}</span>
      <div>
        <p className={`text-base font-bold ${color}`}>{title}</p>
        <p className="text-sm text-zinc-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
