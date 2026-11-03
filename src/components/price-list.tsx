"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, Clock, Star } from "lucide-react";
import type { Paket } from "@/lib/db";
import { groupPakets, durationLabel } from "@/lib/paket";

type Vibe = { title: string; badge: string | null; badgeColor: string; description: string; detailTime: string | null };
type Theme = (typeof THEMES)[number];
type Category = { id: string; title: string; items: Paket[]; type: "jam" | "nominal" | "spesial" };

const GREEN = {
  glow: "bg-[#76b900]/10", border: "border-[#76b900]", border30: "border-[#76b900]/30",
  text: "text-[#76b900]", bg: "bg-[#76b900]",
  shadow: "shadow-[0_0_15px_rgba(118,185,0,0.2)]", shadowHover: "group-hover:shadow-[0_0_60px_rgba(118,185,0,0.3)]",
  hoverBorder: "hover:border-[#76b900]/50", hoverBgGlow: "hover:bg-[#76b900]/5",
};
const THEMES = [
  GREEN,
  {
    glow: "bg-white/5", border: "border-white/40", border30: "border-white/20",
    text: "text-white", bg: "bg-white",
    shadow: "shadow-[0_0_15px_rgba(255,255,255,0.06)]", shadowHover: "group-hover:shadow-[0_0_50px_rgba(255,255,255,0.1)]",
    hoverBorder: "hover:border-white/40", hoverBgGlow: "hover:bg-white/[0.03]",
  },
  GREEN,
];

const SLANG: Record<number, string> = {
  3000: "Paket Kilat", 5000: "Paket Goceng", 6000: "Paket Santai", 7000: "Paket Puas",
  9000: "Paket Seru", 10000: "Paket Ceban", 15000: "Paket Marathon",
};
const NOMINAL_DESC: Record<number, string> = {
  3000: "Durasi kilat urusan cepat.", 5000: "Goceng dapat satu jam lebih.", 6000: "Satu setengah jam santai.",
  7000: "Durasi pas tanpa nanggung.", 9000: "Dua jam lebih beberapa match.", 10000: "Ceban dapat dua setengah jam.",
  15000: "Empat jam puas hemat.",
};
const JAM_INFO: Record<number, [string | null, string]> = {
  1: [null, "Sesi kilat pemanasan santai."], 2: [null, "Pas buat dua sampai tiga match."],
  3: ["Populer", "Pilihan paling favorit buat mabar."], 4: ["Push Rank", "Fokus kejar win streak kompetitif."],
  5: [null, "Sesi panjang leluasa tanpa buru-buru."], 6: [null, "Leveling quest dan grinding santai."],
  7: [null, "Dungeon dan raid bareng squad."], 8: [null, "Setara satu shift warnet seharian."],
  9: [null, "Sesi gaming intensif tanpa jeda."],
};

function vibeOf(p: Paket, type: Category["type"]): Vibe {
  if (type === "jam") {
    const m = p.name.match(/(\d+)\s*Jam/i);
    const hours = m ? parseInt(m[1]) : Math.round((p.duration_minutes || 60) / 60);
    const [badge, description] = hours >= 10 ? ["Marathon", "Durasi maksimal puas seharian penuh."] : JAM_INFO[hours] ?? [null, "Durasi fleksibel main santai."];
    return { title: `${hours} Jam`, badge, badgeColor: "bg-nvidia-green/15 text-nvidia-green border border-nvidia-green/30", description, detailTime: `${hours * 60} Menit` };
  }
  if (type === "spesial") {
    const n = p.name.toLowerCase();
    const [badge, description] =
      n.includes("malam") || n.includes("night") ? ["Begadang", "Paket begadang sampai subuh."]
      : n.includes("pagi") || n.includes("subuh") ? ["Subuh", "Sesi tenang pagi hari."]
      : n.includes("sahur") || n.includes("ngabuburit") ? ["Ramadan", "Sesi sahur dan ngabuburit."]
      : ["Spesial", "Jadwal khusus tarif hemat."];
    return { title: p.name, badge, badgeColor: "bg-white/10 text-white border border-white/25", description, detailTime: durationLabel(p) };
  }
  const named = p.name && !p.name.toLowerCase().startsWith("rp");
  return {
    title: durationLabel(p),
    badge: named ? p.name : SLANG[p.price] ?? p.name.replace(/rp\.?\s*/i, "Paket "),
    badgeColor: "bg-white/[0.06] text-zinc-300 border border-white/15",
    description: NOMINAL_DESC[p.price] ?? "Pecahan pas di kantong.",
    detailTime: `± ${p.duration_minutes || 0} Menit`,
  };
}

function PriceCard({ category, theme }: { category: Category; theme: Theme }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [isBottom, setIsBottom] = useState(false);

  const checkScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setCanScroll(el.scrollHeight > el.clientHeight + 4);
    setIsBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 12);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll, category.items.length]);

  return (
    <div className={`nvidia-card p-4 sm:p-5 flex flex-col w-full bg-black/60 backdrop-blur-md border ${theme.border30} ${theme.shadow} ${theme.shadowHover} transition-shadow duration-500`}>
      <div className={`absolute -top-2.5 -right-2.5 w-7 h-7 border-t-2 border-r-2 ${theme.border} transition-colors`} />
      <div className={`absolute -bottom-2.5 -left-2.5 w-7 h-7 border-b-2 border-l-2 ${theme.border} transition-colors`} />

      <div className={`flex items-center justify-between border-b ${theme.border30} pb-2.5 mb-3`}>
        <h3 className={`text-base sm:text-lg font-bold ${theme.text} uppercase tracking-tight flex items-center gap-2.5`}>
          <span className={`w-2.5 h-2.5 ${theme.bg} rounded-[2px] shadow-[0_0_8px_currentColor] animate-pulse`}></span>
          {category.title}
        </h3>
        {canScroll && (
          <span className="text-[10px] font-mono text-zinc-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-bold">
            {category.items.length} Paket
          </span>
        )}
      </div>

      <div className="relative">
        <div
          ref={listRef}
          onScroll={checkScroll}
          className="flex flex-col gap-1.5 max-h-[300px] sm:max-h-[340px] md:max-h-[380px] overflow-y-auto pr-1.5 custom-card-scrollbar"
        >
          {category.items.length === 0 && (
            <p className="text-xs text-zinc-400 py-6 text-center">Belum ada paket di kategori ini.</p>
          )}
          {category.items.map((p) => {
            const vibe = vibeOf(p, category.type);
            return (
              <Link
                key={p.id}
                href={`/booking?paket=${encodeURIComponent(p.id)}`}
                className={`group relative p-2 sm:p-2.5 border border-white/5 bg-black/40 ${theme.hoverBgGlow} ${theme.hoverBorder} transition-all rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-nvidia-green`}
              >
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`${theme.text} opacity-50 group-hover:opacity-100 transition-opacity flex items-center shrink-0`}>
                      {category.type === "spesial" ? <Star size={12} className="text-amber-400 fill-amber-400" /> : <ChevronRight size={12} />}
                    </span>
                    <span className="tracking-tight text-white font-bold text-xs sm:text-sm">{vibe.title}</span>
                    {vibe.badge && (
                      <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wide shrink-0 ${vibe.badgeColor}`}>
                        {vibe.badge}
                      </span>
                    )}
                  </div>
                  <span className={`tracking-tight ${theme.text} font-extrabold text-xs sm:text-sm relative z-10 tabular-nums shrink-0 leading-none`}>
                    Rp {p.price.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="mt-1 pl-4 flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                  <span className="text-zinc-300 font-medium group-hover:text-white transition-colors leading-snug">{vibe.description}</span>
                  {vibe.detailTime && <span className="text-zinc-400 text-[10px] font-mono shrink-0">{vibe.detailTime}</span>}
                </div>
              </Link>
            );
          })}
        </div>

        {canScroll && !isBottom && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 rounded-b" />
        )}
      </div>

      {canScroll && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isBottom) listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            else listRef.current?.scrollBy({ top: 140, behavior: "smooth" });
          }}
          className="mt-3 pt-2.5 border-t border-hairline/60 flex items-center justify-between text-xs w-full cursor-pointer hover:bg-white/[0.04] px-1.5 py-1 rounded transition group/hint"
          title={isBottom ? "Kembali ke atas" : "Gulir untuk melihat opsi paket lainnya"}
        >
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center bg-white/5 border border-white/10 ${theme.text} group-hover/hint:bg-white/10 transition-colors`}>
              <ChevronDown size={13} className={isBottom ? "rotate-180 transition-transform duration-300" : "animate-bounce"} />
            </div>
            <span className="text-[11px] font-bold text-zinc-300 text-left group-hover/hint:text-white transition-colors">
              {isBottom ? "Semua paket sudah ditampilkan" : "Gulir ke bawah untuk paket lainnya"}
            </span>
          </div>
          <span className="text-[10px] font-medium text-zinc-400 group-hover/hint:text-zinc-200">
            {isBottom ? "Klik untuk ke atas" : "Scroll / Klik"}
          </span>
        </button>
      )}
    </div>
  );
}

/** Landing price board: the floating 3D carousel. Each row opens checkout with that paket picked. */
export default function PriceList({ pakets, isMobile }: { pakets: Paket[]; isMobile: boolean }) {
  const [active, setActive] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const groups = groupPakets(pakets);
  const isRamadan = new Intl.DateTimeFormat("en-US-u-ca-islamic", { month: "numeric" }).format(new Date()) === "9";
  const categories: Category[] = [
    { id: "reguler", title: "Jam Reguler", items: groups.jam, type: "jam" },
    { id: "nominal", title: "Uang Pas", items: groups.nominal, type: "nominal" },
    {
      id: "spesial",
      title: "Spesial & Malam",
      items: groups.malam.filter((p) => isRamadan || !/sahur|ngabuburit/i.test(p.name)),
      type: "spesial",
    },
  ];
  const last = categories.length - 1;

  // Wheel over the carousel flips cards instead of scrolling the page.
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(".custom-card-scrollbar")) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) < 10 && Math.abs(e.deltaX) < 10) return;
      if (timeout) return;
      setActive((prev) => (e.deltaY > 0 || e.deltaX > 0 ? Math.min(prev + 1, last) : Math.max(prev - 1, 0)));
      timeout = setTimeout(() => { timeout = null; }, 400);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [last]);

  return (
    <div className="flex flex-col gap-6">
      <div className="nvidia-card max-w-3xl mx-auto w-full p-[1px] relative overflow-hidden group mb-2">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-nvidia-green/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -translate-x-full group-hover:translate-x-full" />
        <div className="bg-black/90 backdrop-blur-xl px-4 py-3 flex items-center gap-3 relative z-10">
          <div className="relative flex items-center justify-center w-9 h-9 shrink-0">
            <div className="absolute inset-0 bg-nvidia-green/20 blur-[8px] rounded-full animate-pulse" />
            <Clock size={18} className="text-nvidia-green relative z-10" />
          </div>
          <div>
            <h4 className="font-bold text-nvidia-green text-xs sm:text-sm tracking-wider uppercase mb-0.5">Nominal Bebas</h4>
            <p className="text-xs text-zinc-200 tracking-tight font-medium">
              Bawa uang pas sendiri, <strong className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">Rp 1.000 dapet 15 menit</strong>. Mulai Rp 3.000.
            </p>
          </div>
        </div>
      </div>

      <div ref={carouselRef} className="relative w-full max-w-[1100px] mx-auto min-h-[460px] sm:min-h-[520px] md:min-h-[580px] flex items-center justify-center overflow-visible md:overflow-hidden py-2" style={{ perspective: "1200px" }}>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] ${THEMES[active].glow} blur-[100px] rounded-full pointer-events-none transition-colors duration-1000`} />

        <button
          type="button"
          aria-label="Kategori sebelumnya"
          onClick={() => setActive((prev) => Math.max(prev - 1, 0))}
          disabled={active === 0}
          className={`absolute left-1 md:left-8 z-50 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border transition-all ${active === 0 ? "bg-black/20 border-white/10 text-white/20 cursor-not-allowed" : `bg-black/50 ${THEMES[active].border30} ${THEMES[active].text} hover:bg-white/10`}`}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          aria-label="Kategori berikutnya"
          onClick={() => setActive((prev) => Math.min(prev + 1, last))}
          disabled={active === last}
          className={`absolute right-1 md:right-8 z-50 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border transition-all ${active === last ? "bg-black/20 border-white/10 text-white/20 cursor-not-allowed" : `bg-black/50 ${THEMES[active].border30} ${THEMES[active].text} hover:bg-white/10`}`}
        >
          <ChevronRight size={20} />
        </button>

        <div className="relative w-full h-full flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
          <AnimatePresence initial={false}>
            {categories.map((category, index) => {
              const offset = index - active;
              const isActive = offset === 0;
              const theme = THEMES[index];
              return (
                <motion.div
                  key={category.id}
                  className="absolute origin-center"
                  initial={false}
                  animate={{
                    x: offset * (isMobile ? 160 : 310),
                    y: isActive ? 0 : Math.abs(offset) * 16,
                    rotateY: offset * -40,
                    scale: isActive ? 1 : 0.82,
                    zIndex: 50 - Math.abs(offset) * 10,
                    opacity: isActive ? 1 : 0.4 - Math.abs(offset) * 0.15,
                  }}
                  transition={{ type: "spring", stiffness: 280, damping: 25, mass: 1.1 }}
                  style={{ transformStyle: "preserve-3d" }}
                  onClick={() => { if (!isActive) setActive(index); }}
                  aria-hidden={!isActive}
                  inert={!isActive}
                >
                  <motion.div
                    animate={isActive ? { y: [-6, 6, -6] } : { y: 0 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <div className={`relative w-[300px] sm:w-[350px] md:w-[380px] ${!isActive ? "cursor-pointer" : ""}`}>
                      {isActive && (
                        <motion.div
                          animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.04, 1] }}
                          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                          className={`absolute inset-0 rounded-full blur-[50px] -z-10 ${theme.glow}`}
                        />
                      )}
                      <PriceCard category={category} theme={theme} />
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
