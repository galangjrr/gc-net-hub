"use client";

import Link from "next/link";
import { useState } from "react";
import { Moon } from "lucide-react";
import type { Paket } from "@/lib/db";
import { optionsForDuration, cheaperFixedPaket, fixedWindowMinutes, durationLabel, rupiah } from "@/lib/paket";

const MIN = 45;
const MAX = 600;
const QUICK = [
  { label: "1 jam", mins: 60 },
  { label: "2 jam", mins: 120 },
  { label: "3 jam", mins: 180 },
  { label: "5 jam", mins: 300 },
  { label: "Begadang", mins: 360 },
];

/** "Mau main berapa lama?" slider: pick a duration, see the price and the paket that fits best. */
export default function DurationCalc({ pakets }: { pakets: Paket[] }) {
  const [mins, setMins] = useState(180);
  const options = optionsForDuration(pakets, mins);
  const best = options[0];
  const fixed = best && mins >= 300 ? cheaperFixedPaket(pakets, mins, best.price) : null;
  const fill = ((mins - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="nvidia-card max-w-3xl mx-auto w-full bg-black/60 backdrop-blur-md border border-white/[0.08] p-4 sm:p-6 grid gap-6 md:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-3 min-w-0">
        <label htmlFor="durasi-main" className="text-xs sm:text-sm font-semibold text-zinc-400">Mau main berapa lama?</label>
        <output htmlFor="durasi-main" aria-live="polite" className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none">
          {durationLabel({ duration_minutes: mins })}
        </output>
        <input
          id="durasi-main"
          type="range"
          min={MIN}
          max={MAX}
          step={15}
          value={mins}
          onChange={(e) => setMins(Number(e.target.value))}
          aria-valuetext={durationLabel({ duration_minutes: mins })}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-nvidia-green"
          style={{ background: `linear-gradient(90deg, #76b900 ${fill}%, #23252c ${fill}%)` }}
        />
        <div className="relative h-4 mx-2 text-[11px] font-mono text-zinc-500" aria-hidden="true">
          {[[45, "45m"], [180, "3j"], [300, "5j"], [420, "7j"], [600, "10j"]].map(([m, label]) => (
            <span key={label} className="absolute -translate-x-1/2" style={{ left: `${((Number(m) - MIN) / (MAX - MIN)) * 100}%` }}>{label}</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pilihan cepat durasi">
          {QUICK.map((q) => (
            <button
              key={q.mins}
              type="button"
              onClick={() => setMins(q.mins)}
              aria-pressed={mins === q.mins}
              className={`h-8 px-3 rounded-lg border text-xs font-bold transition ${mins === q.mins ? "border-nvidia-green text-white bg-nvidia-green/10" : "border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-white/20"}`}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="pt-3 mt-1 border-t border-white/[0.08]">
          <div className="text-[11px] font-semibold text-zinc-400">Mulai dari</div>
          <div className="text-3xl sm:text-4xl font-mono font-bold text-nvidia-green tabular-nums tracking-tight">
            {best ? rupiah(best.price) : "-"}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 min-w-0">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-400">Pilihan buat durasi ini</h3>
        {options.length === 0 ? (
          <p className="text-sm text-zinc-400 py-6 text-center border border-dashed border-white/10 rounded-xl">Belum ada paket buat durasi ini. Tanya operator ya.</p>
        ) : (
          options.map((o, i) => (
            <Link
              key={o.id}
              href={`/booking?paket=${encodeURIComponent(o.id)}`}
              className={`grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 p-3 rounded-xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-nvidia-green ${i === 0 ? "border-nvidia-green bg-nvidia-green/10" : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"}`}
            >
              <span className="text-sm font-bold min-w-0">
                {o.title}
                {i === 0 && <span className="ml-1.5 align-[2px] text-[10px] font-mono font-bold uppercase tracking-wider bg-nvidia-green text-black rounded px-1.5 py-px">paling pas</span>}
              </span>
              <span className="text-sm font-mono font-bold tabular-nums">{rupiah(o.price)}</span>
              <span className="col-span-2 text-[11px] text-zinc-400">
                {o.isCustom ? "Bayar pas sesuai durasi, Rp1.000 per 15 menit." : o.extraMinutes > 0 ? `Bonus ${durationLabel({ duration_minutes: o.extraMinutes })} dari yang lu pilih.` : "Pas banget sama durasi lu."}
              </span>
            </Link>
          ))
        )}
        {fixed && (
          <Link
            href={`/booking?paket=${encodeURIComponent(fixed.id)}`}
            className="flex gap-2.5 items-start p-3 rounded-xl border border-purple-500/40 bg-purple-500/10 hover:border-purple-400 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
          >
            <Moon size={16} className="text-purple-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-xs text-zinc-200">
              Lebih hemat kalau main di jam tertentu: <strong className="text-white">{fixed.name}</strong> {fixed.fixed_start_time} - {fixed.fixed_end_time} WIB cuma <strong className="text-white">{rupiah(fixed.price)}</strong> buat {durationLabel({ duration_minutes: fixedWindowMinutes(fixed) })}.
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
