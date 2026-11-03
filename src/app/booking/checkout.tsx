"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Banknote, Check, Clock, Loader2, Monitor, QrCode, RotateCw, WifiOff } from "lucide-react";
import type { DatabaseSchema, Paket } from "@/lib/db";
import { customPaketFor, CUSTOM_MIN_PRICE, CUSTOM_MAX_PRICE, PAKET_GROUPS, paketGroupOf as groupOf, groupPakets, durationLabel, rupiah, type PaketGroup as Group } from "@/lib/paket";
import { pcWaitMinutes, billingStale, waitLabel } from "@/lib/booking-rules";
import { supabase } from "@/lib/supabase";
import { memberFetch } from "@/lib/member-fetch";

type Db = Pick<DatabaseSchema, "pcs" | "pakets" | "bookings"> & { syncedAt?: string | null };
const ONLINE_ENABLED = Boolean(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY);

/** Today at HH:MM local time, as ISO. */
function todayAt(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toISOString();
}

export function CheckoutSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 animate-pulse" aria-busy="true" aria-label="Memuat halaman booking">
      <div className="h-4 w-24 bg-white/10 rounded mb-3" />
      <div className="h-7 w-56 bg-white/10 rounded mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.06] border border-white/5" />
        ))}
      </div>
    </div>
  );
}

export default function BookingCheckout() {
  const router = useRouter();
  const params = useSearchParams();
  const step = params.get("step") === "2" ? 2 : 1;
  const paketParam = params.get("paket");
  const timeParam = params.get("time") || "now";

  const [db, setDb] = useState<Db | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [groupPick, setGroup] = useState<Group | null>(null);
  const [customInput, setCustomInput] = useState(paketParam?.startsWith("custom-") ? paketParam.slice(7) : "");
  const [scheduleTime, setScheduleTime] = useState(timeParam !== "now" ? timeParam : "");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState<"online" | "kasir" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLoadError(false);
      setDb({ pcs: data.pcs || [], pakets: data.pakets || [], bookings: data.bookings || [], syncedAt: data.settings?.pc_synced_at ?? null });
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only sets state after its fetch resolves
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => clearInterval(t);
  }, []);

  // Logged-in members get their nickname and e-mail filled in.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) return;
      setNickname((n) => n || u.user_metadata?.username || "");
      setEmail((e) => e || u.email || "");
    });
  }, []);

  const selected = useMemo(() => {
    if (!paketParam) return null;
    if (paketParam.startsWith("custom-")) {
      const c = customPaketFor(Number(paketParam.slice(7)));
      return c ? { id: paketParam, name: c.name, price: c.price, duration_minutes: c.duration_minutes, isCustom: true as const } : null;
    }
    const p = db?.pakets.find((x) => x.id === paketParam && !x.is_custom);
    return p ? { ...p, isCustom: false as const } : null;
  }, [paketParam, db]);

  const groups = useMemo(() => groupPakets(db?.pakets || []), [db]);

  // Until the player picks a tab, open the one holding the selected paket (after a refresh or back).
  const paketInUrl = db?.pakets.find((x) => x.id === paketParam);
  const group: Group = groupPick ?? (paketParam?.startsWith("custom-") ? "nominal" : paketInUrl ? groupOf(paketInUrl) : "jam");

  const isFixed = Boolean(selected && !selected.isCustom && selected.fixed_start_time);
  const startTime = isFixed ? (selected as Paket).fixed_start_time! : timeParam !== "now" ? timeParam : null;

  // Every PC in name order, so regulars find their seat. The player always picks; the shortest
  // wait is only marked as a recommendation. The pick lives in the URL (?pc=) to survive a refresh.
  const pcOptions = useMemo(() => {
    if (!db) return [];
    return [...db.pcs]
      .sort((a, b) => a.name.localeCompare(b.name, "id", { numeric: true }))
      .map((pc) => ({ pc, wait: pcWaitMinutes(pc, db.bookings, db.pakets) }));
  }, [db]);
  const bookableWaits = pcOptions.map((o) => o.wait).filter((w): w is number => w !== null);
  const bestWait = bookableWaits.length ? Math.min(...bookableWaits) : null;
  // A badge on every PC says nothing: only recommend when some PCs really are quicker.
  const hasFasterPcs = bestWait !== null && bookableWaits.some((w) => w > bestWait);
  // Billing feed down: times on screen may be wrong, so flag them instead of lying.
  const stale = billingStale(db?.syncedAt);
  const pcParam = params.get("pc");
  const chosen = pcOptions.find((o) => o.pc.id === pcParam && o.wait !== null) ?? null;

  const go = (next: Record<string, string | null>, replace = false) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    const url = `/booking?${q.toString()}`;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  };

  // Step 2 without a valid paket (old link, paket removed): back to step 1.
  useEffect(() => {
    if (step === 2 && db && !selected) go({ step: null }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, db, selected]);

  const pickPaket = (id: string) => {
    setFormError(null);
    go({ paket: id }, true);
  };

  const onCustomChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    setCustomInput(digits);
    if (customPaketFor(Number(digits))) pickPaket(`custom-${digits}`);
    else if (paketParam?.startsWith("custom-")) go({ paket: null }, true);
  };

  const continueToStep2 = () => {
    if (!selected) return setFormError("Pilih paket dulu.");
    if (!isFixed && timeParam !== "now") {
      if (!/^\d{2}:\d{2}$/.test(timeParam)) return setFormError("Pilih jam mainnya dulu.");
      if (new Date(todayAt(timeParam)).getTime() < Date.now()) return setFormError("Jam itu udah lewat, pilih jam yang belum lewat hari ini.");
    }
    setFormError(null);
    go({ step: "2" });
  };

  const submit = async (method: "online" | "kasir") => {
    setFormError(null);
    const name = nickname.trim();
    if (!name) {
      nicknameRef.current?.focus();
      return setFormError("Isi nickname dulu, biar OP tahu ini booking siapa.");
    }
    if (!selected) return setFormError("Pilih paket dulu.");
    if (!chosen) return setFormError("Pilih PC dulu.");

    setSubmitting(method);
    try {
      const res = await memberFetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pc_id: chosen.pc.id,
          paket_id: selected.isCustom ? null : selected.id,
          custom_price: selected.isCustom ? selected.price : null,
          player_name: name,
          customer_email: email.trim() || null,
          payment_method: method,
          booking_type: startTime ? "scheduled" : "queue",
          start_time: startTime,
          scheduled_at: startTime ? todayAt(startTime) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.id) {
        setSubmitting(null);
        return setFormError(data?.error || "Booking gagal disimpan. Coba lagi.");
      }
      router.push(`/booking/${data.id}${method === "online" ? "?pay=1" : ""}`);
    } catch {
      setSubmitting(null);
      setFormError("Koneksi putus pas kirim booking. Cek internet lalu coba lagi.");
    }
  };

  if (loadError && !db) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center" role="alert">
        <WifiOff className="mx-auto text-zinc-500 mb-3" size={28} />
        <h1 className="text-base font-bold">Data paket gagal dimuat</h1>
        <p className="text-sm text-zinc-400 mt-1">Cek koneksi internet lu, lalu coba lagi.</p>
        <button onClick={load} className="mt-5 h-10 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-bold inline-flex items-center gap-2">
          <RotateCw size={14} /> Coba lagi
        </button>
      </div>
    );
  }
  if (!db) return <CheckoutSkeleton />;

  const tabs = PAKET_GROUPS;
  const customValid = customInput !== "" && customPaketFor(Number(customInput));

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 sm:pt-10 pb-40">
      <div>
      {/* Header + progress */}
      <div className="flex items-center justify-between gap-3 mb-5">
        {step === 1 ? (
          <Link href="/" className="h-9 px-2 -ml-2 rounded-lg text-sm text-zinc-400 hover:text-white inline-flex items-center gap-1.5">
            <ArrowLeft size={16} /> Beranda
          </Link>
        ) : (
          <button onClick={() => router.back()} className="h-9 px-2 -ml-2 rounded-lg text-sm text-zinc-400 hover:text-white inline-flex items-center gap-1.5">
            <ArrowLeft size={16} /> Ganti paket
          </button>
        )}
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 tabular-nums">Langkah {step} dari 2</span>
      </div>
      <div className="flex gap-1.5 mb-6" aria-hidden="true">
        <div className="h-1 flex-1 rounded-full bg-nvidia-green" />
        <div className={`h-1 flex-1 rounded-full ${step === 2 ? "bg-nvidia-green" : "bg-white/10"}`} />
      </div>

      {step === 1 ? (
        <>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mau main berapa lama?</h1>
          <p className="text-sm text-zinc-400 mt-1 mb-5">PC dipilihin otomatis yang paling cepat kosong.</p>

          <div role="tablist" aria-label="Jenis paket" className="flex gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.08] mb-4">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={group === t.key}
                onClick={() => setGroup(t.key)}
                className={`flex-1 h-9 rounded-md text-xs sm:text-sm font-bold transition ${group === t.key ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {groups[group].length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center border border-dashed border-white/10 rounded-xl">Belum ada paket di kategori ini.</p>
          ) : (
            <div role="radiogroup" aria-label="Pilih paket" className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {groups[group].map((p) => {
                const active = paketParam === p.id;
                return (
                  <button
                    key={p.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => pickPaket(p.id)}
                    className={`relative text-left p-3 sm:p-3.5 rounded-xl border transition ${active ? "border-nvidia-green bg-nvidia-green/10 ring-1 ring-nvidia-green" : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"}`}
                  >
                    {active && <Check size={14} className="absolute top-2.5 right-2.5 text-nvidia-green" />}
                    <span className="block text-sm font-bold pr-4">{group === "malam" ? p.name : durationLabel(p)}</span>
                    {(group === "malam" || p.name !== durationLabel(p)) && (
                      <span className="block text-[11px] text-zinc-400 mt-0.5">{group === "malam" ? durationLabel(p) : p.name}</span>
                    )}
                    <span className="block text-base font-extrabold tabular-nums mt-2">{rupiah(p.price)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {group === "nominal" && (
            <div className="mt-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03]">
              <label htmlFor="custom-nominal" className="block text-sm font-bold">Punya uang pas sendiri?</label>
              <p className="text-[11px] text-zinc-400 mb-2">Rp1.000 dapet 15 menit. Kelipatan Rp1.000, {rupiah(CUSTOM_MIN_PRICE)} sampai {rupiah(CUSTOM_MAX_PRICE)}.</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-400">Rp</span>
                <input
                  id="custom-nominal"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="12000"
                  value={customInput}
                  onChange={(e) => onCustomChange(e.target.value)}
                  aria-invalid={customInput !== "" && !customValid}
                  className="h-10 w-full sm:w-40 px-3 rounded-lg bg-black/40 border border-white/[0.12] text-base sm:text-sm font-bold tabular-nums focus:border-nvidia-green outline-none"
                />
                {customValid && <span className="text-xs text-nvidia-green font-bold whitespace-nowrap">{durationLabel(customValid)}</span>}
              </div>
              {customInput !== "" && !customValid && (
                <p className="text-[11px] text-amber-400 mt-1.5">Nominal harus kelipatan Rp1.000, minimal {rupiah(CUSTOM_MIN_PRICE)}.</p>
              )}
            </div>
          )}

          {/* When to play */}
          {selected && (
            <fieldset className="mt-6">
              <legend className="text-sm font-bold mb-2">Kapan mainnya?</legend>
              {isFixed ? (
                <p className="text-sm text-zinc-300 flex items-center gap-2">
                  <Clock size={14} className="text-purple-400" /> Paket ini mulai jam {(selected as Paket).fixed_start_time} WIB.
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    aria-pressed={timeParam === "now"}
                    onClick={() => go({ time: null }, true)}
                    className={`h-10 px-4 rounded-lg border text-sm font-bold ${timeParam === "now" ? "border-nvidia-green bg-nvidia-green/10" : "border-white/[0.12] text-zinc-300"}`}
                  >
                    Sekarang, masuk antrean
                  </button>
                  <div className={`h-10 px-3 rounded-lg border flex items-center gap-2 ${timeParam !== "now" ? "border-nvidia-green bg-nvidia-green/10" : "border-white/[0.12]"}`}>
                    <label htmlFor="schedule-time" className="text-sm font-bold text-zinc-300 whitespace-nowrap">Jam tertentu</label>
                    <input
                      id="schedule-time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => {
                        setScheduleTime(e.target.value);
                        go({ time: e.target.value || null }, true);
                      }}
                      className="bg-transparent text-base sm:text-sm font-bold tabular-nums outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}
            </fieldset>
          )}
        </>
      ) : (
        selected && (
          <>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Pilih PC dan isi nama</h1>
            <p className="text-sm text-zinc-400 mt-1 mb-5">Terus pilih cara bayar di bawah.</p>

            {/* Summary */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 mb-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{selected.isCustom ? selected.name : durationLabel(selected)}</p>
                  <p className="text-[11px] text-zinc-400">{startTime ? `Mulai jam ${startTime} WIB hari ini` : "Main sekarang, ikut antrean"}</p>
                </div>
                <p className="text-lg font-extrabold tabular-nums">{rupiah(selected.price)}</p>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400">PC: <span className="font-bold text-white">{chosen ? chosen.pc.name : "belum dipilih"}</span></p>

            </div>

            <fieldset className="mb-5">
              <legend className="text-sm font-bold mb-1">Pilih PC</legend>
              <p className="text-[11px] text-zinc-400 mb-2.5">
                {startTime ? "Booking jam tertentu, PC dipakai mulai jam itu." : stale ? "Pilih PC yang lu mau." : hasFasterPcs ? "Yang ada tanda Rekomendasi paling cepat bisa dipakai." : "Semua PC sama cepatnya, pilih yang lu suka."}
              </p>
              {stale && !startTime && (
                <p className="mb-2.5 flex items-center gap-1.5 text-[11px] text-amber-400"><Clock size={12} /> Sisa waktu PC lagi nggak live, bisa meleset. Pastiin ke OP ya.</p>
              )}
              {pcOptions.length === 0 ? (
                <p className="text-sm text-zinc-500 py-6 text-center border border-dashed border-white/10 rounded-xl">Belum ada data PC.</p>
              ) : (
                <div role="radiogroup" aria-label="Pilih PC" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {pcOptions.map(({ pc, wait }) => {
                    const active = chosen?.pc.id === pc.id;
                    const recommended = !startTime && !stale && hasFasterPcs && wait === bestWait;
                    return (
                      <button
                        key={pc.id}
                        role="radio"
                        aria-checked={active}
                        disabled={wait === null}
                        onClick={() => { setFormError(null); go({ pc: pc.id }, true); }}
                        className={`relative text-left p-2.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${active ? "border-nvidia-green bg-nvidia-green/10 ring-1 ring-nvidia-green" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"}`}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-bold">
                          <Monitor size={13} className={wait === 0 ? "text-nvidia-green" : "text-zinc-500"} />
                          <span className="truncate">{pc.name}</span>
                        </span>
                        <span className={`block text-[11px] mt-0.5 ${wait === null ? "text-red-400" : stale ? "text-zinc-500" : wait === 0 ? "text-nvidia-green" : "text-amber-400"}`}>
                          {wait === null ? "Maintenance" : stale ? "Status tidak live" : waitLabel(wait)}
                        </span>
                        {recommended && (
                          <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-nvidia-green text-black">Rekomendasi</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <div className="space-y-4">
              <div>
                <label htmlFor="nickname" className="block text-sm font-bold mb-1.5">Nickname</label>
                <input
                  id="nickname"
                  ref={nicknameRef}
                  maxLength={30}
                  autoComplete="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Nama yang dipanggil OP"
                  className="h-11 w-full px-3 rounded-lg bg-black/40 border border-white/[0.12] text-base sm:text-sm focus:border-nvidia-green outline-none"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-bold mb-1.5">
                  Email <span className="font-normal text-zinc-500">opsional, buat kirim invoice</span>
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="h-11 w-full px-3 rounded-lg bg-black/40 border border-white/[0.12] text-base sm:text-sm focus:border-nvidia-green outline-none"
                />
              </div>
            </div>

            <ul className="mt-5 space-y-1.5 text-[12px] text-zinc-400">
              <li className="flex gap-2"><QrCode size={14} className="shrink-0 text-nvidia-green mt-px" /> Bayar online: lunas langsung dapet nomor antrean.</li>
              <li className="flex gap-2"><Banknote size={14} className="shrink-0 text-amber-400 mt-px" /> Bayar di kasir: nomor antrean keluar pas OP terima uang. Booking hangus kalau 30 menit belum dibayar.</li>
            </ul>
          </>
        )
      )}

      {formError && (
        <p role="alert" className="mt-4 text-sm text-red-400">{formError}</p>
      )}
      </div>

      {/* Action bar, pinned to the bottom so the next step is always one tap away */}
      {/* fixed, not sticky: an ancestor in the layout has overflow-x-hidden. md:left-64 clears the sidebar. */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 border-t border-white/[0.08] bg-[#090a0c]/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {step === 1 ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider">Total</p>
                <p className="text-lg font-extrabold tabular-nums truncate">{selected ? rupiah(selected.price) : "-"}</p>
              </div>
              <button
                onClick={continueToStep2}
                disabled={!selected}
                className="h-11 px-5 rounded-lg bg-nvidia-green text-black text-sm font-bold inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Lanjut <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              {ONLINE_ENABLED && (
                <button
                  onClick={() => submit("online")}
                  disabled={submitting !== null || !chosen}
                  className="h-11 w-full sm:flex-1 rounded-lg bg-nvidia-green text-black text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting === "online" ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                  Bayar Sekarang {selected ? rupiah(selected.price) : ""}
                </button>
              )}
              <button
                onClick={() => submit("kasir")}
                disabled={submitting !== null || !chosen}
                className={`h-11 w-full sm:flex-1 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 ${ONLINE_ENABLED ? "border border-white/[0.15] text-zinc-200 hover:bg-white/5" : "bg-nvidia-green text-black"}`}
              >
                {submitting === "kasir" ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16} />}
                Bayar di Kasir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
