"use client";

import Link from "next/link";
import Script from "next/script";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Banknote, Check, CheckCircle2, Clock, Copy, Gamepad2, Hourglass, Loader2, QrCode, RotateCw, SearchX, WifiOff } from "lucide-react";

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
  expires_at: number | null;
  queue_position: number | null;
};

type SnapCallbacks = { onSuccess?: () => void; onPending?: () => void; onError?: () => void; onClose?: () => void };
type SnapApi = { embed: (token: string, opts: SnapCallbacks & { embedId: string }) => void };

const CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
const SNAP_SRC = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";
const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");
const orderKey = (id: string) => `gc-order-${id}`;

function readOrder(id: string): string | null {
  try { return sessionStorage.getItem(orderKey(id)); } catch { return null; }
}
function saveOrder(id: string, orderId: string) {
  try { sessionStorage.setItem(orderKey(id), orderId); } catch { /* private mode: the finish redirect still carries order_id */ }
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
  const [snapReady, setSnapReady] = useState(false);
  const [paying, setPaying] = useState<"idle" | "opening" | "open" | "checking">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const autoPayDone = useRef(false);

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

  // Asks Midtrans through our server whether the last order settled, then refreshes the booking.
  const checkPaid = useCallback(async (orderId: string | null) => {
    if (orderId) {
      try {
        await fetch("/api/midtrans/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId }),
        });
      } catch { /* the booking reload below shows whatever state we have */ }
    }
    await load();
  }, [load]);

  // After the Snap widget reports back: show a spinner while the server confirms with Midtrans.
  const confirmPayment = useCallback(async (orderId: string) => {
    setPaying("checking");
    await checkPaid(orderId);
    setPaying("idle");
  }, [checkPaid]);

  // First load. Coming back from Snap's finish redirect brings order_id in the URL.
  useEffect(() => {
    const fromRedirect = params.get("order_id");
    if (fromRedirect) saveOrder(id, fromRedirect);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- checkPaid() only sets state after its fetches resolve
    checkPaid(fromRedirect || readOrder(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Back from the GoPay / ShopeePay app: the tab becomes visible again, check right away.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      checkPaid(booking?.payment_status === "unpaid" ? readOrder(id) : null);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [booking?.payment_status, checkPaid, id]);

  // Keep the page live: OP may take the cash, the queue moves.
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) load(); }, 15000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(t); clearInterval(tick); };
  }, [load]);

  const startPay = useCallback(async () => {
    const snap = (window as unknown as { snap?: SnapApi }).snap;
    if (!snap) return setNotice("Halaman pembayaran belum siap. Tunggu sebentar lalu coba lagi.");
    setNotice(null);
    setPaying("opening");
    try {
      const res = await fetch("/api/midtrans/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        setPaying("idle");
        setNotice(data?.error || "Pembayaran online gagal dibuka. Coba lagi, atau bayar tunai ke OP.");
        if (res.status === 409 || res.status === 410) load();
        return;
      }
      saveOrder(id, data.order_id);
      setPaying("open");
      snap.embed(data.token, {
        embedId: "snap-embed",
        onSuccess: () => confirmPayment(data.order_id),
        onPending: () => setNotice("Selesaikan pembayaran di aplikasi lu. Halaman ini otomatis berubah begitu lunas."),
        onError: () => {
          setPaying("idle");
          setNotice("Pembayaran gagal. Coba lagi, atau bayar tunai ke OP.");
        },
        onClose: () => confirmPayment(data.order_id),
      });
    } catch {
      setPaying("idle");
      setNotice("Koneksi putus pas buka pembayaran. Coba lagi.");
    }
  }, [id, confirmPayment, load]);

  // Arriving from checkout with "Bayar Sekarang": open the payment once, then drop ?pay from the URL.
  useEffect(() => {
    if (autoPayDone.current || params.get("pay") !== "1" || !snapReady || booking?.payment_status !== "unpaid") return;
    autoPayDone.current = true;
    router.replace(`/booking/${id}`, { scroll: false });
    startPay();
  }, [params, snapReady, booking?.payment_status, id, router, startPay]);

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
      {CLIENT_KEY && unpaid && (
        <Script src={SNAP_SRC} data-client-key={CLIENT_KEY} strategy="afterInteractive" onReady={() => setSnapReady(true)} />
      )}

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
          <dt className="text-zinc-400">Total</dt><dd className="text-right font-extrabold tabular-nums">{rupiah(booking.price)}</dd>
        </dl>
      </div>

      {/* Payment */}
      {unpaid && !expired && (
        <div className="mt-4">
          {CLIENT_KEY && paying !== "open" && (
            <button
              onClick={startPay}
              disabled={!snapReady || paying !== "idle"}
              className="h-11 w-full rounded-lg bg-nvidia-green text-black text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {paying === "idle" && snapReady ? <QrCode size={16} /> : <Loader2 size={16} className="animate-spin" />}
              {paying === "checking" ? "Ngecek pembayaran..." : `Bayar ${rupiah(booking.price)} pakai QRIS / GoPay / ShopeePay`}
            </button>
          )}
          <div id="snap-embed" className={paying === "open" ? "mt-2 min-h-[520px] rounded-xl overflow-hidden bg-white" : "hidden"} />
          {paying === "open" && (
            <p className="text-[11px] text-zinc-400 mt-2">Bayar dari HP yang sama? Simpan gambar QR, lalu di aplikasi bank atau e-wallet pilih scan dari galeri.</p>
          )}
          <p className="mt-3 text-[12px] text-zinc-400 flex gap-2">
            <Banknote size={14} className="shrink-0 text-amber-400 mt-px" />
            Atau datang ke OP, tunjukkan kode {booking.id}, dan bayar tunai.
          </p>
        </div>
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
