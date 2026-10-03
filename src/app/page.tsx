"use client";

import { motion, AnimatePresence, Variants } from "motion/react";
import { Monitor, ArrowRight, Gamepad2, AlertCircle, CheckCircle2, Crosshair, Upload, ChevronLeft, ChevronRight, ChevronDown, Sparkles, Clock, User, Users, Package, Crown, UtensilsCrossed, Ban, Banknote, AlertTriangle, Star, Check, X, Hourglass, Play, QrCode, Flame, Cpu, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { DatabaseSchema, PC, Paket } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { memberFetch } from "@/lib/member-fetch";
import PCCarousel from "@/components/pc-carousel";
import GameIcons from "@/components/game-icons";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function PriceListCardContent({
  category,
  theme,
  getPaketVibeInfo,
}: {
  category: {
    id: string;
    title: string;
    items: Paket[];
    type: string;
  };
  theme: {
    glow: string;
    border: string;
    border30: string;
    text: string;
    bg: string;
    shadow: string;
    shadowHover: string;
    hoverBorder: string;
    hoverBgGlow: string;
  };
  getPaketVibeInfo: (pkg: any) => any;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [isBottom, setIsBottom] = useState(false);

  const checkScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 4;
    setCanScroll(hasOverflow);
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 12;
    setIsBottom(atBottom);
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

      {/* Card Header with count pill */}
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

      {/* List Container with High-Affordance Visible Scrollbar & Fade Mask */}
      <div className="relative">
        <div
          ref={listRef}
          onScroll={checkScroll}
          className="flex flex-col gap-1.5 max-h-[300px] sm:max-h-[340px] md:max-h-[380px] overflow-y-auto pr-1.5 custom-card-scrollbar"
        >
          {category.items.map(p => {
            const vibe = getPaketVibeInfo(p);
            return (
              <div key={p.id} className={`group relative p-2 sm:p-2.5 border border-white/5 bg-black/40 ${theme.hoverBgGlow} ${theme.hoverBorder} transition-all rounded-lg`}>
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`${theme.text}/50 group-hover:${theme.text} transition-colors flex items-center shrink-0`}>
                      {category.type === "spesial" ? <Star size={12} className="text-amber-400 fill-amber-400" /> : <ChevronRight size={12} />}
                    </span>
                    <span className="tracking-tight text-white font-bold text-xs sm:text-sm">
                      {vibe.title}
                    </span>
                    {vibe.badge && (
                      <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wide shrink-0 ${vibe.badgeColor}`}>
                        {vibe.badge}
                      </span>
                    )}
                  </div>
                  <span className={`tracking-tight ${theme.text} font-extrabold text-xs sm:text-sm relative z-10 tabular-nums shrink-0 leading-none`}>
                    Rp {p.price.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="mt-1 pl-4 flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                  <span className="text-zinc-300 font-medium group-hover:text-white transition-colors leading-snug">
                    {vibe.description}
                  </span>
                  {vibe.detailTime && (
                    <span className="text-zinc-400 text-[10px] font-mono shrink-0">
                      {vibe.detailTime}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Bottom Gradient Fade Mask */}
        {canScroll && !isBottom && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 rounded-b" />
        )}
      </div>

      {/* Interactive Scroll Affordance Footer */}
      {canScroll && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isBottom) {
              listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              listRef.current?.scrollBy({ top: 140, behavior: 'smooth' });
            }
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

export default function Home() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [selectedPc, setSelectedPc] = useState<string | null>(null);
  const [selectedPaket, setSelectedPaket] = useState<string | null>(null);
  const [searchPaket, setSearchPaket] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [ssFile, setSsFile] = useState<File | null>(null);
  const [ssPreviewUrl, setSsPreviewUrl] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'kasir'>('kasir');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  // pingPong removed — replaced by CSS .animate-game-ping class
  const [isMobile, setIsMobile] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [showTcModal, setShowTcModal] = useState(false);
  const [showQueueWarning, setShowQueueWarning] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [latestBookingCode, setLatestBookingCode] = useState<string | null>(null);
  const [lastBookingReceipt, setLastBookingReceipt] = useState<{
    id: string;
    playerName: string;
    pcName: string;
    paketName: string;
    price: number;
    scheduleText: string;
    paymentMethod: string;
  } | null>(null);
  const [bookingStep, setBookingStep] = useState<1 | 2>(1);
  const [antreanSearch, setAntreanSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [bookingPaketTab, setBookingPaketTab] = useState<'jam' | 'spesial' | 'nominal'>('jam');
  const [customNominalInput, setCustomNominalInput] = useState("");
  const [bookingTimingMode, setBookingTimingMode] = useState<'now' | 'scheduled'>('now');
  const [customScheduleTime, setCustomScheduleTime] = useState<string>("15:00");
  const [antreanCategoryTab, setAntreanCategoryTab] = useState<'all' | 'now' | 'scheduled'>('all');
  const [isShakingNickname, setIsShakingNickname] = useState(false);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const triggeredExpiredPcIds = useRef<Set<string>>(new Set());

  const timePresets = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const nowD = new Date();
    const plus30 = new Date(nowD.getTime() + 30 * 60000);
    const plus60 = new Date(nowD.getTime() + 60 * 60000);
    const p30 = `${pad(plus30.getHours())}:${pad(plus30.getMinutes())}`;
    const p60 = `${pad(plus60.getHours())}:${pad(plus60.getMinutes())}`;
    return [
      { label: "+30 Menit", value: p30 },
      { label: "+1 Jam", value: p60 },
      { label: "18:30 WIB", value: "18:30" },
      { label: "19:30 WIB", value: "19:30" },
      { label: "20:30 WIB", value: "20:30" },
      { label: "22:00 WIB", value: "22:00" },
    ];
  }, []);
  // DANA QRIS dynamic payment states
  const [danaQrContent, setDanaQrContent] = useState<string | null>(null);
  const [danaBookingId, setDanaBookingId] = useState<string | null>(null);
  const [danaPaymentStatus, setDanaPaymentStatus] = useState<'idle' | 'generating' | 'waiting' | 'paid' | 'error'>('idle');
  const danaPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [memberSession, setMemberSession] = useState<any>(null);
  const [memberProfile, setMemberProfile] = useState<any>(null);

  const isScheduledBooking = useCallback((b: any) => {
    if (b.booking_type === 'scheduled' || b.booking_type === 'slot') return true;
    if (b.scheduled_at) return true;
    if (b.start_time) return true;
    const pkg = db?.pakets?.find(p => p.id === b.paket_id);
    return Boolean(pkg?.fixed_start_time);
  }, [db?.pakets]);

  const getBookingScheduleLabel = useCallback((b: any) => {
    const pkg = db?.pakets?.find(p => p.id === b.paket_id);
    if (pkg?.fixed_start_time && pkg?.fixed_end_time) {
      return `${pkg.fixed_start_time} - ${pkg.fixed_end_time} WIB`;
    }
    const raw = b.start_time || b.scheduled_at;
    if (raw) {
      if (typeof raw === 'string' && raw.includes(':') && !raw.includes('T')) {
        return `Jam ${raw.slice(0, 5)} WIB`;
      }
      try {
        const dt = new Date(raw);
        if (!isNaN(dt.getTime())) {
          return `Jam ${dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB`;
        }
      } catch (_) {}
    }
    return null;
  }, [db?.pakets]);

  const getSlangName = useCallback((price: number, originalName: string) => {
    if (originalName && !originalName.toLowerCase().startsWith("rp")) return originalName;
    if (price === 5000) return "Paket Goceng";
    if (price === 10000) return "Paket Ceban";
    if (price === 3000) return "Paket Kilat";
    if (price === 6000) return "Paket Santai";
    if (price === 7000) return "Paket Puas";
    if (price === 9000) return "Paket Seru";
    if (price === 15000) return "Paket Marathon";
    return originalName.replace(/rp\.?\s*/i, "Paket ");
  }, []);

  const formatDuration = useCallback((mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} Jam ${m} Menit`;
    if (h > 0) return `${h} Jam`;
    return `${m} Menit`;
  }, []);

  const getPaketVibeInfo = useCallback((pkg: {
    id: string;
    name: string;
    price: number;
    duration_minutes?: number | null;
    fixed_start_time?: string | null;
    fixed_end_time?: string | null;
    is_custom?: boolean;
  }) => {
    // 1. Paket Kustom
    if (pkg.id.startsWith("custom-")) {
      const mins = pkg.duration_minutes || Math.floor((pkg.price / 4000) * 60);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const durTitle = h > 0 && m > 0 ? `${h} Jam ${m} Menit` : h > 0 ? `${h} Jam` : `${m} Menit`;
      return {
        title: durTitle,
        badge: "Uang Pas",
        badgeColor: "bg-nvidia-green/20 text-nvidia-green border border-nvidia-green/30",
        description: "Dihitung otomatis nominal pas.",
        detailTime: `± ${mins} Menit`,
      };
    }

    // 2. Paket Jam Reguler
    if (pkg.name.endsWith(" Jam") && !pkg.fixed_start_time && !pkg.is_custom) {
      const hoursMatch = pkg.name.match(/(\d+)\s*Jam/i);
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : Math.round((pkg.duration_minutes || 60) / 60);
      let badge: string | null = null;
      const badgeColor = "bg-nvidia-green/15 text-nvidia-green border border-nvidia-green/30";
      let description = "Durasi fleksibel main santai.";

      if (hours === 1) {
        description = "Sesi kilat pemanasan santai.";
      } else if (hours === 2) {
        description = "Pas buat dua sampai tiga match.";
      } else if (hours === 3) {
        badge = "Populer";
        description = "Pilihan paling favorit buat mabar.";
      } else if (hours === 4) {
        badge = "Push Rank";
        description = "Fokus kejar win streak kompetitif.";
      } else if (hours === 5) {
        description = "Sesi panjang leluasa tanpa buru-buru.";
      } else if (hours === 6) {
        description = "Leveling quest dan grinding santai.";
      } else if (hours === 7) {
        description = "Dungeon dan raid bareng squad.";
      } else if (hours === 8) {
        description = "Setara satu shift warnet seharian.";
      } else if (hours === 9) {
        description = "Sesi gaming intensif tanpa jeda.";
      } else if (hours >= 10) {
        badge = "Marathon";
        description = "Durasi maksimal puas seharian penuh.";
      }

      return {
        title: `${hours} Jam`,
        badge,
        badgeColor,
        description,
        detailTime: `${hours * 60} Menit`,
      };
    }

    // 3. Paket Spesial (Malam / Subuh / Ramadan)
    if (pkg.fixed_start_time) {
      const nameLower = pkg.name.toLowerCase();
      let badge = "Spesial";
      const badgeColor = "bg-white/10 text-white border border-white/25";
      let description = "Jadwal khusus tarif hemat.";

      if (nameLower.includes("malam") || nameLower.includes("night")) {
        badge = "Begadang";
        description = "Paket begadang sampai subuh.";
      } else if (nameLower.includes("pagi") || nameLower.includes("subuh")) {
        badge = "Subuh";
        description = "Sesi tenang pagi hari.";
      } else if (nameLower.includes("sahur") || nameLower.includes("ngabuburit")) {
        badge = "Ramadan";
        description = "Sesi sahur dan ngabuburit.";
      }

      return {
        title: pkg.name,
        badge,
        badgeColor,
        description,
        detailTime: `${pkg.fixed_start_time} - ${pkg.fixed_end_time} WIB`,
      };
    }

    // 4. Paket Nominal / Pecahan
    const durationMins = pkg.duration_minutes || Math.round((pkg.price / 1000) * 15);
    const h = Math.floor(durationMins / 60);
    const m = durationMins % 60;
    const durTitle = h > 0 && m > 0 ? `${h} Jam ${m} Menit` : h > 0 ? `${h} Jam` : `${m} Menit`;

    const badge = getSlangName(pkg.price, pkg.name);
    const badgeColor = "bg-white/[0.06] text-zinc-300 border border-white/15";
    let description = "Pecahan pas di kantong.";

    if (pkg.price === 3000) {
      description = "Durasi kilat urusan cepat.";
    } else if (pkg.price === 5000) {
      description = "Goceng dapat satu jam lebih.";
    } else if (pkg.price === 6000) {
      description = "Satu setengah jam santai.";
    } else if (pkg.price === 7000) {
      description = "Durasi pas tanpa nanggung.";
    } else if (pkg.price === 9000) {
      description = "Dua jam lebih beberapa match.";
    } else if (pkg.price === 10000) {
      description = "Ceban dapat dua setengah jam.";
    } else if (pkg.price === 15000) {
      description = "Empat jam puas hemat.";
    }

    return {
      title: durTitle,
      badge,
      badgeColor,
      description,
      detailTime: `± ${durationMins} Menit`,
    };
  }, [getSlangName]);

  const selectedPaketObj = useMemo(() => {
    if (!selectedPaket) return null;
    if (selectedPaket.startsWith("custom-")) {
      const price = parseInt(selectedPaket.replace("custom-", "")) || 0;
      const mins = Math.floor(price / 4000 * 60);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const timeStr = [h > 0 ? `${h}j` : '', m > 0 ? `${m}m` : ''].filter(Boolean).join(' ') || '0m';
      return { id: selectedPaket, name: `Paket Kustom (± ${timeStr})`, price, duration_minutes: mins };
    }
    return db?.pakets?.find(p => p.id === selectedPaket) || null;
  }, [selectedPaket, db?.pakets]);

  const selectedPaketDuration = useMemo(() => {
    if (!selectedPaketObj) return "-";
    if (selectedPaketObj.duration_minutes) {
      const hours = Math.floor(selectedPaketObj.duration_minutes / 60);
      const mins = selectedPaketObj.duration_minutes % 60;
      if (hours > 0 && mins > 0) return `${hours} Jam ${mins} Menit`;
      if (hours > 0) return `${hours} Jam`;
      return `${mins} Menit`;
    }
    if (selectedPaketObj.fixed_start_time && selectedPaketObj.fixed_end_time) {
      return `${selectedPaketObj.fixed_start_time} - ${selectedPaketObj.fixed_end_time} WIB`;
    }
    return "Sesi Sesuai Tarif";
  }, [selectedPaketObj]);

  const selectedPaketVibe = useMemo(() => {
    if (!selectedPaketObj) return null;
    return getPaketVibeInfo(selectedPaketObj);
  }, [selectedPaketObj, getPaketVibeInfo]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    let timeout: NodeJS.Timeout | null = null;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 10 && Math.abs(e.deltaX) < 10) return;
      if (timeout) return;
      if (e.deltaY > 0 || e.deltaX > 0) {
        setActiveCategory(prev => Math.min(prev + 1, 2));
      } else {
        setActiveCategory(prev => Math.max(prev - 1, 0));
      }
      timeout = setTimeout(() => { timeout = null; }, 400);
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const loadData = async () => {
    const res = await fetch("/api/data");
    const data = await res.json();
    setDb(data);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchPaket);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchPaket]);

  useEffect(() => {
    setMounted(true);
    loadData();
    // Auto-refresh every 15 seconds (was 5s — 3x less network)
    const interval = setInterval(loadData, 15000);

    const timerInterval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);

    const fetchMemberProfile = async (accessToken: string) => {
      try {
        const res = await memberFetch("/api/member/profile", {}, accessToken);
        const data = await res.json();
        if (res.ok && data.member) {
          setMemberProfile(data.member);
        }
      } catch (_) {}
    };

    // Track Supabase Member Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setMemberSession(session.user);
        const uname = session.user.user_metadata?.username || session.user.email?.split("@")[0] || "";
        if (uname) setPlayerName(uname);
        fetchMemberProfile(session.access_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setMemberSession(session?.user || null);
      if (session?.user) {
        const uname = session.user.user_metadata?.username || session.user.email?.split("@")[0] || "";
        if (uname) setPlayerName(uname);
        fetchMemberProfile(session.access_token);
      } else {
        setMemberProfile(null);
      }
    });
    let scrollTicking = false;
    const handleScroll = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        const pricelistEl = document.getElementById("pricelist");
        const antreanEl = document.getElementById("antrean");
        const bookingEl = document.getElementById("booking");
        const showcaseEl = document.getElementById("showcase");

        const scrollY = window.scrollY;
        const innerHeight = window.innerHeight;
        const scrollHeight = document.documentElement.scrollHeight;

        // Mentok bawah dengan toleransi 200px
        const isAtBottom = Math.ceil(scrollY + innerHeight) >= scrollHeight - 200;

        if (isAtBottom || (showcaseEl && showcaseEl.getBoundingClientRect().top < innerHeight * 0.8)) {
          setActiveSection("showcase");
        } else if (bookingEl && bookingEl.getBoundingClientRect().top < innerHeight * 0.5) {
          setActiveSection("booking");
        } else if (antreanEl && antreanEl.getBoundingClientRect().top < innerHeight * 0.5) {
          setActiveSection("antrean");
        } else if (pricelistEl && pricelistEl.getBoundingClientRect().top < innerHeight * 0.5) {
          setActiveSection("pricelist");
        } else {
          setActiveSection("home");
        }
        scrollTicking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Realtime Supabase Sync for instant UI updates on status change
    const channel = supabase
      .channel('public:gc-booking-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pcs' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      clearInterval(timerInterval);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Trigger audio alert when any PC timer reaches 0
  useEffect(() => {
    if (!db?.pcs) return;
    db.pcs.forEach((pc: PC) => {
      if (pc.expected_empty_time) {
        const expTime = new Date(pc.expected_empty_time).getTime();
        if (expTime <= now && now - expTime < 15000 && !triggeredExpiredPcIds.current.has(pc.id)) {
          triggeredExpiredPcIds.current.add(pc.id);
          try {
            const audio = new Audio("/sounds/timer-alarm-10s.wav");
            audio.volume = 0.6;
            audio.play().catch(() => {});
          } catch (_) {}
        }
      }
    });
  }, [now, db?.pcs]);

  useEffect(() => {
    if (!ssFile) {
      setSsPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(ssFile);
    setSsPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [ssFile]);

  // DANA QRIS polling: check payment status every 4s
  useEffect(() => {
    return () => {
      if (danaPollingRef.current) clearInterval(danaPollingRef.current);
    };
  }, []);

  const stopDanaPolling = useCallback(() => {
    if (danaPollingRef.current) {
      clearInterval(danaPollingRef.current);
      danaPollingRef.current = null;
    }
  }, []);

  const startDanaPolling = useCallback((bookingId: string) => {
    stopDanaPolling();
    danaPollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/dana/qris/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: bookingId }),
        });
        const data = await res.json();
        if (data.paid) {
          stopDanaPolling();
          setDanaPaymentStatus('paid');
          setLatestBookingCode(bookingId);
          setShowSuccessModal(true);
          setDanaQrContent(null);
          setDanaBookingId(null);
          setPlayerName("");
          setBookingTimingMode('now');
          setBookingStep(1);
          loadData();
        }
      } catch {
        // Silent fail on poll, will retry next interval
      }
    }, 4000);
  }, [stopDanaPolling]);

  const totalPcs = db?.pcs?.length || 0;
  const bookedPcsCount = db?.pcs?.filter(pc => (pc.status === 'occupied' || Boolean(pc.expected_empty_time)) || db?.bookings?.some(b => b.pc_id === pc.id)).length || 0;

  // ── Memoized computed data (avoid recompute on every polling render) ──
  const generatedJamPakets = useMemo(() => {
    return [...(db?.pakets?.filter(p =>
      p.name.endsWith(" Jam") && !p.fixed_start_time && !p.is_custom
    ) || [])].sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
  }, [db?.pakets]);

  const hargaPakets = useMemo(() => {
    return [...(db?.pakets?.filter(p =>
      !p.name.endsWith(" Jam") && !p.fixed_start_time && !p.is_custom
    ) || [])].sort((a, b) => a.price - b.price);
  }, [db?.pakets]);

  const spesialPakets = useMemo(() => {
    const isRamadan = new Intl.DateTimeFormat('en-US-u-ca-islamic', { month: 'numeric' }).format(new Date()) === '9';
    return [...(db?.pakets?.filter(p => {
      if (!p.fixed_start_time || p.is_custom) return false;
      const name = p.name.toLowerCase();
      const isRamadanPaket = name.includes('sahur') || name.includes('ngabuburit');
      if (isRamadanPaket && !isRamadan) return false;
      return true;
    }) || [])].sort((a, b) => a.price - b.price);
  }, [db?.pakets]);

  const searchPaketQuery = (searchPaket || "").trim().toLowerCase();
  const filteredJamPakets = useMemo(() => {
    if (!searchPaketQuery) return generatedJamPakets;
    return generatedJamPakets.filter(p =>
      p.name.toLowerCase().includes(searchPaketQuery) ||
      p.price.toString().includes(searchPaketQuery) ||
      (p.duration_minutes && `${p.duration_minutes}`.includes(searchPaketQuery))
    );
  }, [generatedJamPakets, searchPaketQuery]);

  const filteredSpesialPakets = useMemo(() => {
    if (!searchPaketQuery) return spesialPakets;
    return spesialPakets.filter(p =>
      p.name.toLowerCase().includes(searchPaketQuery) ||
      p.price.toString().includes(searchPaketQuery) ||
      (p.fixed_start_time && `${p.fixed_start_time}-${p.fixed_end_time}`.includes(searchPaketQuery))
    );
  }, [spesialPakets, searchPaketQuery]);

  const filteredHargaPakets = useMemo(() => {
    if (!searchPaketQuery) return hargaPakets;
    return hargaPakets.filter(p =>
      p.name.toLowerCase().includes(searchPaketQuery) ||
      getSlangName(p.price, p.name).toLowerCase().includes(searchPaketQuery) ||
      p.price.toString().includes(searchPaketQuery)
    );
  }, [hargaPakets, searchPaketQuery, getSlangName]);

  const ensureSensiblePaketSelection = useCallback((currentPaketId?: string | null) => {
    const targetId = currentPaketId || selectedPaket;
    if (!targetId && db?.pakets && db.pakets.length > 0) {
      const defaultJam = generatedJamPakets.find(p => p.name.includes("2 Jam") || p.name.includes("3 Jam")) || generatedJamPakets[0] || db.pakets[0];
      if (defaultJam) {
        setSelectedPaket(defaultJam.id);
        setBookingPaketTab('jam');
        return;
      }
    }
    if (targetId) {
      if (targetId.startsWith("custom-")) {
        setBookingPaketTab('nominal');
      } else if (generatedJamPakets.some(p => p.id === targetId)) {
        setBookingPaketTab('jam');
      } else if (spesialPakets.some(p => p.id === targetId)) {
        setBookingPaketTab('spesial');
      } else if (hargaPakets.some(p => p.id === targetId)) {
        setBookingPaketTab('nominal');
      }
    }
  }, [selectedPaket, db?.pakets, generatedJamPakets, spesialPakets, hargaPakets]);

  const handlePcClick = (pcId: string) => {
    setSelectedPc(pcId);
    if (!selectedPaket && db?.pakets && db.pakets.length > 0) {
      const defaultJam = generatedJamPakets.find(p => p.name.includes("2 Jam") || p.name.includes("3 Jam")) || generatedJamPakets[0] || db.pakets[0];
      if (defaultJam) {
        setSelectedPaket(defaultJam.id);
        setBookingPaketTab('jam');
      }
    }
  };

  const handleNextStep = () => {
    ensureSensiblePaketSelection();
    const selectedPcDirectBookings = db?.bookings?.filter(b => b.pc_id === selectedPc && !isScheduledBooking(b)) || [];
    const targetPc = db?.pcs?.find(p => p.id === selectedPc);
    const hasActiveTimer = targetPc?.expected_empty_time && new Date(targetPc.expected_empty_time).getTime() > Date.now();
    if (selectedPcDirectBookings.length > 0 || hasActiveTimer) {
      setShowQueueWarning(true);
      return;
    }
    setBookingStep(2);
    setTimeout(() => {
      const elem = document.getElementById("booking");
      if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const handlePayment = async () => {
    setFormError(null);
    const trimmedName = playerName.trim();
    if (!selectedPc || !selectedPaket || !trimmedName) {
      if (!trimmedName) {
        setIsShakingNickname(true);
        setTimeout(() => setIsShakingNickname(false), 500);
        if (nicknameInputRef.current) nicknameInputRef.current.focus();
        setFormError("Ketik nickname pemain dulu untuk melanjutkan.");
        return;
      }
      setFormError("Lengkapi data: pilih PC dan paket billing");
      return;
    }
    setLoading(true);

    let finalPaketId = selectedPaket;
    if (selectedPaket.startsWith("custom-")) {
      const price = parseInt(selectedPaket.replace("custom-", ""));
      const mins = (price / 1000) * 15;
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      let timeStr = "";
      if (hours > 0) timeStr += `${hours} Jam `;
      if (remMins > 0) timeStr += `${remMins} Menit`;

      const existingCustom = db?.pakets?.find(p => p.is_custom && p.price === price);
      if (existingCustom) {
        finalPaketId = existingCustom.id;
      } else {
        try {
          const newPaketRes = await fetch("/api/pakets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: `Personal ${timeStr.trim()}`, price, is_custom: true })
          });
          const createdPaket = await newPaketRes.json();
          if (!newPaketRes.ok || !createdPaket?.id) {
            setFormError(createdPaket?.error || "Gagal memproses paket custom");
            setLoading(false);
            return;
          }
          finalPaketId = createdPaket.id;
        } catch (err) {
          setFormError("Gagal menghubungi server untuk paket custom");
          setLoading(false);
          return;
        }
      }
    }

    const isPaketScheduled = Boolean(selectedPaketObj?.fixed_start_time);
    const isScheduled = isPaketScheduled || bookingTimingMode === 'scheduled';
    const resolvedStartTime = selectedPaketObj?.fixed_start_time || (bookingTimingMode === 'scheduled' ? customScheduleTime : null);
    let resolvedScheduledAt: string | null = null;
    if (resolvedStartTime) {
      try {
        const [hh, mm] = resolvedStartTime.split(':').map(Number);
        const schedD = new Date();
        schedD.setHours(hh || 0, mm || 0, 0, 0);
        resolvedScheduledAt = schedD.toISOString();
      } catch (_) {}
    }

    try {
      // Step 1: Create booking (pending status)
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pc_id: selectedPc,
          paket_id: finalPaketId,
          player_name: trimmedName,
          member_id: memberSession?.id || null,
          booking_type: isScheduled ? 'scheduled' : 'queue',
          start_time: resolvedStartTime,
          scheduled_at: resolvedScheduledAt,
        })
      });
      const bookingData = await bookingRes.json();
      if (!bookingRes.ok) {
        setFormError(bookingData?.error || "Gagal bikin booking. Coba lagi bentar ya.");
        setLoading(false);
        return;
      }

      if (paymentMethod === 'qris') {
        // Step 2: Generate dynamic QRIS from DANA
        setDanaPaymentStatus('generating');
        try {
          const qrisRes = await fetch("/api/dana/qris/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ booking_id: bookingData.id })
          });
          const qrisData = await qrisRes.json();
          if (!qrisRes.ok) {
            setFormError(qrisData?.error || "Gagal bikin kode QRIS. Booking tetap masuk, bisa bayar tunai ke OP.");
            setDanaPaymentStatus('error');
            setLoading(false);
            loadData();
            return;
          }
          setDanaQrContent(qrisData.qrContent);
          setDanaBookingId(bookingData.id);
          setDanaPaymentStatus('waiting');
          setShowQrModal(true);
          setLoading(false);
          // Step 3: Start polling for payment confirmation
          startDanaPolling(bookingData.id);
          loadData();
        } catch (err: any) {
          setFormError("Gagal tersambung ke server QRIS. Booking tetap masuk, bisa bayar tunai ke OP.");
          setDanaPaymentStatus('error');
          setLoading(false);
          loadData();
        }
      } else {
        // Kasir (cash) flow: booking created, done
        setLatestBookingCode(bookingData.id);
        setShowSuccessModal(true);
        setPlayerName("");
        setSsFile(null);
        setBookingTimingMode('now');
        setBookingStep(1);
        setLoading(false);
        loadData();
      }
    } catch (err: any) {
      setFormError("Jaringan lagi bermasalah pas kirim booking. Coba lagi ya.");
      setLoading(false);
    }
  };

  const scrollToBooking = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const elem = document.getElementById("booking");
    if (elem) elem.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToPricelist = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const elem = document.getElementById("pricelist");
    if (elem) elem.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToAntrean = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const elem = document.getElementById("antrean");
    if (elem) elem.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToShowcase = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const elem = document.getElementById("showcase");
    if (elem) elem.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToHome = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const allAntreanBookings = useMemo(() => {
    if (!db?.bookings) return [];
    return db.bookings.filter((b) => {
      const pc = db.pcs?.find((p) => p.id === b.pc_id);
      const playerName = b.player_name || "";
      const pcName = pc?.name || b.pc_id || "";
      const search = (antreanSearch || "").toLowerCase();
      return playerName.toLowerCase().includes(search) || pcName.toLowerCase().includes(search);
    });
  }, [db?.bookings, db?.pcs, antreanSearch]);

  const directAntreanCount = useMemo(() => {
    return allAntreanBookings.filter(b => !isScheduledBooking(b)).length;
  }, [allAntreanBookings, isScheduledBooking]);

  const scheduledAntreanCount = useMemo(() => {
    return allAntreanBookings.filter(b => isScheduledBooking(b)).length;
  }, [allAntreanBookings, isScheduledBooking]);

  const filteredBookings = useMemo(() => {
    return allAntreanBookings
      .filter((b) => {
        const isSched = isScheduledBooking(b);
        if (antreanCategoryTab === 'now' && isSched) return false;
        if (antreanCategoryTab === 'scheduled' && !isSched) return false;
        return true;
      })
      .sort((a, b) => {
        // PRIORITAS SISTEM:
        // 1. Antrean Langsung / Main Sekarang SELALU DI ATAS (prioritas utama)
        // 2. Booking Jam Tertentu (Scheduled / Slot) SELALU DI BAWAH
        const aSched = isScheduledBooking(a);
        const bSched = isScheduledBooking(b);
        if (!aSched && bSched) return -1;
        if (aSched && !bSched) return 1;

        if (aSched && bSched) {
          const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
          const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
          if (aTime && bTime && aTime !== bTime) return aTime - bTime;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [allAntreanBookings, antreanCategoryTab, isScheduledBooking]);

  // Cek apakah member yang login punya booking aktif / antrean berjalan
  const myActiveBooking = useMemo(() => {
    if (!db?.bookings || !memberSession) return null;
    const currentUsername = (memberProfile?.username || memberSession.user_metadata?.username || memberSession.email?.split("@")[0] || "").toLowerCase();
    return db.bookings.find(b => {
      const matchName = (b.player_name || "").trim().toLowerCase() === currentUsername;
      const matchMemberId = (b as any).member_id === memberSession.id;
      return (matchName || matchMemberId) && (b.status === "pending" || b.status === "active");
    }) || null;
  }, [db?.bookings, memberSession, memberProfile]);

  const CAROUSEL_THEMES = useMemo(() => [
    {
      glow: "bg-[#76b900]/10", border: "border-[#76b900]", border30: "border-[#76b900]/30",
      text: "text-[#76b900]", bg: "bg-[#76b900]",
      shadow: "shadow-[0_0_15px_rgba(118,185,0,0.2)]", shadowHover: "group-hover:shadow-[0_0_60px_rgba(118,185,0,0.3)]",
      hoverBorder: "hover:border-[#76b900]/50", hoverBgGlow: "hover:bg-[#76b900]/5",
    },
    {
      glow: "bg-white/5", border: "border-white/40", border30: "border-white/20",
      text: "text-white", bg: "bg-white",
      shadow: "shadow-[0_0_15px_rgba(255,255,255,0.06)]", shadowHover: "group-hover:shadow-[0_0_50px_rgba(255,255,255,0.1)]",
      hoverBorder: "hover:border-white/40", hoverBgGlow: "hover:bg-white/[0.03]",
    },
    {
      glow: "bg-[#76b900]/10", border: "border-[#76b900]", border30: "border-[#76b900]/30",
      text: "text-[#76b900]", bg: "bg-[#76b900]",
      shadow: "shadow-[0_0_15px_rgba(118,185,0,0.2)]", shadowHover: "group-hover:shadow-[0_0_60px_rgba(118,185,0,0.3)]",
      hoverBorder: "hover:border-[#76b900]/50", hoverBgGlow: "hover:bg-[#76b900]/5",
    }
  ], []);

  const CAROUSEL_DATA = useMemo(() => [
    { id: "reguler", title: "Jam Reguler", items: generatedJamPakets, type: "jam" },
    { id: "nominal", title: "Uang Pas", items: hargaPakets, type: "harga" },
    { id: "spesial", title: "Spesial & Malam", items: spesialPakets, type: "spesial" }
  ], [generatedJamPakets, hargaPakets, spesialPakets]);

  if (!db) return <div suppressHydrationWarning className="min-h-screen bg-surface-dark p-8 tracking-tight text-white/50">INITIALIZING SYSTEM...</div>;

  const selectedPcObj = db.pcs?.find(p => p.id === selectedPc);
  const selectedPcAllBookings = selectedPc ? (db?.bookings?.filter(b => b.pc_id === selectedPc) || []) : [];
  const selectedPcDirectBookings = selectedPcAllBookings.filter(b => !isScheduledBooking(b));
  const selectedPcScheduledBookings = selectedPcAllBookings.filter(b => isScheduledBooking(b));
  const selectedPcBookings = selectedPcDirectBookings;
  const selectedPcFirstBooking = selectedPcDirectBookings[0] || selectedPcScheduledBookings[0];
  const selectedPcDiff = selectedPcObj?.expected_empty_time ? new Date(selectedPcObj.expected_empty_time).getTime() - now : 0;
  const selectedPcHasTimer = Boolean(selectedPcObj?.expected_empty_time);
  const selectedPcExpired = selectedPcHasTimer && selectedPcDiff <= 0;
  const selectedPcWarning = selectedPcHasTimer && selectedPcDiff > 0 && selectedPcDiff <= 10 * 60 * 1000;
  const selectedPcMins = Math.max(0, Math.floor(selectedPcDiff / 60000));

  return (
    <div className="relative bg-surface-dark">

      {/* ── Top Navbar (Menu) Vibe Coder Edition ── */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="group fixed top-[72px] md:top-6 left-1/2 -translate-x-1/2 z-[90] max-md:hidden bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] rounded-full px-2 py-2 flex items-center cursor-pointer overflow-hidden transition-all duration-500 hover:bg-black/80"
      >
        <div className="flex items-center gap-0 group-hover:gap-1 transition-all duration-500 relative">
          {[
            { id: "home", label: "HOME", fn: scrollToHome },
            { id: "pricelist", label: "PRICE LIST", fn: scrollToPricelist },
            { id: "antrean", label: "STATUS ANTREAN", fn: scrollToAntrean },
            { id: "booking", label: "BOOKING", fn: scrollToBooking },
            { id: "showcase", label: "PC SHOWCASE", fn: scrollToShowcase }
          ].map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={item.fn}
                className={`relative py-2 tracking-tight font-bold text-xs md:text-sm tracking-widest uppercase transition-all duration-500 z-10 whitespace-nowrap overflow-hidden ${isActive ? "max-w-[250px] px-4 opacity-100 text-black drop-shadow-md" : "max-w-0 px-0 opacity-0 group-hover:max-w-[250px] group-hover:px-4 group-hover:opacity-100 text-white/50 hover:text-white"}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-nvidia-green rounded-full -z-10 shadow-[0_0_20px_rgba(118,185,0,0.4)] border border-nvidia-green/50"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {item.label}
              </a>
            );
          })}
        </div>
      </motion.nav>



      {/* ── QRIS Pop-Up Modal ── */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="nvidia-card p-8 w-full max-w-sm relative flex flex-col items-center border-nvidia-green/50 shadow-[0_0_40px_rgba(118,185,0,0.15)]"
            >
              <button
                onClick={() => {
                  setShowQrModal(false);
                  if (danaPaymentStatus !== 'waiting') {
                    stopDanaPolling();
                  }
                }}
                className="absolute top-4 right-4 text-white/50 hover:text-error transition-colors"
              >
                TUTUP
              </button>
              <div className="nvidia-corner bg-nvidia-green"></div>

              {danaPaymentStatus === 'paid' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-nvidia-green/20 flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} className="text-nvidia-green" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white mb-2 uppercase tracking-widest text-center">Pembayaran Berhasil</h2>
                  <p className="text-xs text-zinc-300 font-medium mb-4 uppercase tracking-wider text-center">Booking lu udah masuk dan nunggu diverifikasi OP</p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold tracking-tight text-white mb-2 uppercase tracking-widest text-center">Scan QRIS</h2>
                  <p className="text-xs text-zinc-300 font-medium mb-4 uppercase tracking-wider text-center">Pembayaran via DANA atau QRIS</p>

                  {selectedPaket && (
                    <div className="w-full bg-black/40 border border-nvidia-green/30 rounded p-3 mb-6 flex flex-col items-center">
                      <span className="text-xs text-zinc-200 uppercase font-bold tracking-wider mb-1">Total Tagihan</span>
                      <span className="text-2xl font-bold text-nvidia-green tracking-tight drop-shadow-[0_0_8px_rgba(118,185,0,0.5)]">
                        Rp {(selectedPaketObj?.price || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                  )}

                  <div className="w-48 h-48 mx-auto flex items-center justify-center mb-4 rounded-[2px] overflow-hidden border border-nvidia-green bg-white p-2 shadow-[0_0_15px_rgba(118,185,0,0.3)]">
                    {danaQrContent ? (
                      <img
                        src={`https://chart.googleapis.com/chart?cht=qr&chs=400x400&chl=${encodeURIComponent(danaQrContent)}&choe=UTF-8`}
                        alt="QRIS Barcode"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="text-zinc-400 animate-spin" />
                        <span className="text-xs text-zinc-300 font-medium">Generating QR...</span>
                      </div>
                    )}
                  </div>

                  {danaPaymentStatus === 'waiting' && (
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <Loader2 size={15} className="text-amber-400 animate-spin shrink-0" />
                      <span className="text-xs text-amber-200 font-medium">Menunggu pembayaran... scan barcode di atas dengan aplikasi e-wallet</span>
                    </div>
                  )}
                </>
              )}

              <div className="w-full flex gap-3 mt-2">
                <button
                  onClick={() => {
                    setShowQrModal(false);
                    if (danaPaymentStatus === 'paid') {
                      setDanaPaymentStatus('idle');
                    }
                  }}
                  className="flex-1 nvidia-button uppercase text-xs tracking-widest"
                >
                  {danaPaymentStatus === 'paid' ? 'Selesai' : 'Tutup'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Immersive Gamer Hero Vibe Coder Edition ── */}
      <section className="relative min-h-[50vh] md:min-h-[58vh] w-full flex items-center border-b border-white/5 overflow-hidden py-8 md:py-12">
        <div className="absolute inset-0 z-0">
          <motion.img
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            transition={{ duration: 2, ease: "easeOut" }}
            src="/hero.png"
            alt="Warnet GC Net"
            className="w-full h-full object-cover object-center mix-blend-luminosity grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />

          {/* Ambient Lighting - Refined radial lighting */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(118,185,0,0.12),rgba(0,0,0,0))]" />

          <div className="scanlines opacity-20"></div>
        </div>

        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">

          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl flex-1 mt-6 md:mt-0"
          >
            {/* Mobile Hero Logo */}
            <div className="md:hidden flex items-center justify-start mb-5 h-16 w-16 relative">
              <motion.img
                src="/logo/GC Master Logo.svg"
                alt="GC Net Logo"
                className="absolute h-full w-full object-contain object-left"
                style={{ filter: "brightness(0) invert(1)" }}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.img
                src="/logo/GC Net Master Logo.svg"
                alt="GC Net Master Logo"
                className="absolute h-full w-full object-contain object-left"
                style={{ filter: "brightness(0) invert(1)" }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            {/* ── MEMBER PERSONALIZATION WIDGET (Tactical Cyber Hub State) ── */}
            {myActiveBooking ? (
              /* State A: Live Booking / Active Queue Boarding Pass */
              <div className="mb-4 p-3.5 rounded-xl bg-black/80 border border-nvidia-green/40 shadow-[0_0_20px_rgba(118,185,0,0.12)] backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-nvidia-green/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-nvidia-green"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-nvidia-green">
                      Antrean Aktif Lu
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/10 text-white border border-white/20">
                      {myActiveBooking.id}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    myActiveBooking.status === "active" 
                      ? "bg-nvidia-green/20 text-nvidia-green border border-nvidia-green/40" 
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}>
                    {myActiveBooking.status === "active" ? "Siap Digunakan" : "Menunggu OP"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-base font-black text-white uppercase tracking-tight block">
                      {db?.pcs?.find(p => p.id === myActiveBooking.pc_id)?.name || myActiveBooking.pc_id}
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      {db?.pakets?.find(p => p.id === myActiveBooking.paket_id)?.name || "Paket Warnet"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {myActiveBooking.status === "pending" && !myActiveBooking.dana_payment_verified && (
                      <button
                        type="button"
                        onClick={() => {
                          if (myActiveBooking.dana_qr_content) {
                            setDanaQrContent(myActiveBooking.dana_qr_content);
                            setDanaBookingId(myActiveBooking.id);
                            setDanaPaymentStatus('waiting');
                            setShowQrModal(true);
                          } else {
                            scrollToAntrean(null as any);
                          }
                        }}
                        className="px-2.5 py-1 rounded-md bg-nvidia-green text-black text-[10px] font-black uppercase tracking-wider hover:bg-white transition"
                      >
                        Buka QRIS
                      </button>
                    )}
                    <a
                      href="#antrean"
                      onClick={scrollToAntrean}
                      className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider transition"
                    >
                      Status Antrean →
                    </a>
                  </div>
                </div>
              </div>
            ) : memberSession ? (
              /* State B: Member Logged In (No Active Booking) */
              <div className="mb-4 p-3 rounded-xl bg-black/60 border border-hairline/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-nvidia-green/15 border border-nvidia-green/40 flex items-center justify-center text-nvidia-green font-black text-xs">
                    {(memberProfile?.username || memberSession.email)?.[0]?.toUpperCase() || "M"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white tracking-tight">
                        Halo, @{memberProfile?.username || memberSession.user_metadata?.username || memberSession.email?.split("@")[0]}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-nvidia-green bg-nvidia-green/10 px-1 py-0.2 rounded border border-nvidia-green/20">
                        Member
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block">
                      Saldo Deposit: <strong className="text-white">Rp {(memberProfile?.balance || 0).toLocaleString("id-ID")}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href="#booking"
                    onClick={scrollToBooking}
                    className="px-2.5 py-1 rounded-md bg-nvidia-green text-black text-[10px] font-black uppercase tracking-wider hover:bg-white transition shadow-[0_0_10px_rgba(118,185,0,0.25)]"
                  >
                    Pilih PC & Main
                  </a>
                  <Link
                    href="/member"
                    className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-bold uppercase transition"
                  >
                    Profil
                  </Link>
                </div>
              </div>
            ) : (
              /* State C: Guest / Belum Login */
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <div className="flex items-center gap-2.5 bg-[#16171b] border border-hairline shadow-sm px-3.5 py-1 rounded-full">
                  <span className="flex items-center justify-center w-2 h-2">
                    <span className="absolute inline-flex h-2 w-2 rounded-full bg-nvidia-green animate-ping opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-nvidia-green shadow-[0_0_8px_rgba(118,185,0,1)]"></span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-wider">
                    System Online • {totalPcs} Units Ready
                  </span>
                </div>

                <Link
                  href="/member"
                  className="text-[10px] sm:text-[11px] font-bold text-zinc-400 hover:text-nvidia-green transition uppercase tracking-wider flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.03] border border-hairline hover:border-nvidia-green/30"
                >
                  <User size={11} />
                  <span>Daftar / Masuk Member</span>
                </Link>
              </div>
            )}

            <motion.h1
              className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.08] text-white mb-4 uppercase drop-shadow-xl"
            >
              BOOKING DULU.<br />
              <span className="whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-nvidia-green to-emerald-300 drop-shadow-[0_0_15px_rgba(118,185,0,0.25)]">
                BARU MASUK ANTREAN.
              </span>
            </motion.h1>

            {/* Mobile Compact Live PC Status */}
            <div className="md:hidden flex items-center justify-between p-2.5 rounded-lg bg-[#121316] border border-hairline mb-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Monitor size={14} className="text-nvidia-green" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">Status PC</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="text-zinc-400">
                  Tersedia: <span className="text-nvidia-green font-bold tabular-nums">{Math.max(0, totalPcs - bookedPcsCount)}</span>
                </div>
                <div className="text-zinc-600">•</div>
                <div className="text-zinc-400">
                  Aktif: <span className="text-zinc-200 font-bold tabular-nums">{bookedPcsCount}</span>
                </div>
              </div>
            </div>

            {/* Kotak Aturan Booking Selaras */}
            <div className="bg-[#121316]/90 border border-hairline border-l-2 border-l-nvidia-green/80 p-3 sm:p-3.5 rounded-lg mb-6 max-w-[460px] space-y-2 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                <div className="w-4 h-4 rounded-full bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center shrink-0">
                  <Check className="text-nvidia-green" size={10} />
                </div>
                <span>Saat PC penuh, booking online buat amankan nomor antrean.</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                <div className="w-4 h-4 rounded-full bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center shrink-0">
                  <Check className="text-nvidia-green" size={10} />
                </div>
                <span>Pemain yang datang langsung ke meja OP tetap prioritas.</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                <div className="w-4 h-4 rounded-full bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center shrink-0">
                  <Check className="text-nvidia-green" size={10} />
                </div>
                <span>Tunggu konfirmasi OP, pantau antrean, langsung duduk main.</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 items-center">
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="#booking"
                onClick={scrollToBooking}
                className="nvidia-button group gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg shadow-[0_0_20px_rgba(118,185,0,0.25)] transition"
              >
                <span>Booking Sekarang</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </motion.a>

              <button
                onClick={() => setShowTcModal(true)}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[#16171b] hover:bg-[#1f2126] text-zinc-300 hover:text-white border border-hairline rounded-lg font-bold text-xs uppercase tracking-wider cursor-pointer transition-all duration-200"
              >
                Syarat dan Ketentuan
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hidden md:flex flex-1 justify-end"
          >
            {/* Card Status Ketersediaan PC Selaras */}
            <div className="p-4 sm:p-5 w-[280px] sm:w-[300px] bg-[#121316]/95 backdrop-blur-xl border border-hairline rounded-xl relative shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-hairline">
                <div className="flex items-center gap-2">
                  <Monitor size={16} className="text-nvidia-green" />
                  <h3 className="text-xs font-bold text-white tracking-wider uppercase">Status PC Live</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-nvidia-green/10 border border-nvidia-green/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-nvidia-green animate-pulse" />
                  <span className="text-[9px] font-bold text-nvidia-green uppercase tracking-wide">Live</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">PC Tersedia</span>
                  <span className="text-sm font-bold text-nvidia-green tabular-nums">
                    {Math.max(0, totalPcs - bookedPcsCount)} Unit
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Sedang Digunakan</span>
                  <span className="text-sm font-bold text-zinc-100 tabular-nums">
                    {bookedPcsCount} Unit
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1 font-medium">
                    <span>Keterisian PC</span>
                    <span className="tabular-nums font-bold text-white">
                      {totalPcs > 0 ? Math.round((bookedPcsCount / totalPcs) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800/80 rounded-full overflow-hidden border border-hairline">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalPcs > 0 ? Math.round((bookedPcsCount / totalPcs) * 100) : 0}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-nvidia-green to-emerald-400 rounded-full"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-hairline flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Total Kapasitas</span>
                  <span className="font-bold text-white tabular-nums">{totalPcs} Unit PC</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>


      </section>

      {/* ── Price List Section ── */}
      <motion.section
        id="pricelist"
        className="relative z-20 py-8 md:py-14 border-b border-hairline bg-surface-dark/50 scroll-mt-16"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight uppercase mb-2">DAFTAR HARGA PAKET BILLING</h2>
            <p className="text-xs sm:text-sm text-zinc-300 tracking-tight max-w-lg mx-auto">Pilih paket billing yang paling pas buat lu. Dari jam reguler, uang pas, sampai paket begadang.</p>
          </div>

          <div className="flex flex-col gap-6">

            {/* Note Tambahan Informatif (Redesigned) */}
            <motion.div
              className="nvidia-card max-w-3xl mx-auto w-full p-[1px] relative overflow-hidden group mb-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              {/* Animated glowing border effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-nvidia-green/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -translate-x-full group-hover:translate-x-full" />

              <div className="bg-black/90 backdrop-blur-xl px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3 w-full">
                  <div className="relative flex items-center justify-center w-9 h-9 shrink-0">
                    <div className="absolute inset-0 bg-nvidia-green/20 blur-[8px] rounded-full animate-pulse" />
                    <Clock size={18} className="text-nvidia-green relative z-10" />
                  </div>
                  <div>
                    <h4 className="tracking-tight font-bold text-nvidia-green text-xs sm:text-sm tracking-wider uppercase mb-0.5">Custom Durasi Fleksibel</h4>
                    <p className="text-xs text-zinc-200 tracking-tight font-medium">Bisa nambah waktu sesukamu, cukup <strong className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">Rp 2.000 per 30 Menit</strong>.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 3D Hero Selection Carousel matched to pc-carousel.tsx */}
            <div ref={carouselRef} className="relative w-full max-w-[1100px] mx-auto min-h-[460px] sm:min-h-[520px] md:min-h-[580px] flex items-center justify-center overflow-visible md:overflow-hidden py-2" style={{ perspective: "1200px" }}>

              {/* Background Glow */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] ${CAROUSEL_THEMES[activeCategory].glow} blur-[100px] rounded-full pointer-events-none transition-colors duration-1000`} />

              {/* Navigation Buttons */}
              <button
                onClick={() => setActiveCategory(prev => Math.max(prev - 1, 0))}
                disabled={activeCategory === 0}
                className={`absolute left-1 md:left-8 z-50 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border transition-all 
                  ${activeCategory === 0
                    ? "bg-black/20 border-white/10 text-white/20 cursor-not-allowed"
                    : `bg-black/50 ${CAROUSEL_THEMES[activeCategory].border30} ${CAROUSEL_THEMES[activeCategory].text} hover:bg-white/10`}`}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setActiveCategory(prev => Math.min(prev + 1, 2))}
                disabled={activeCategory === 2}
                className={`absolute right-1 md:right-8 z-50 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border transition-all 
                  ${activeCategory === 2
                    ? "bg-black/20 border-white/10 text-white/20 cursor-not-allowed"
                    : `bg-black/50 ${CAROUSEL_THEMES[activeCategory].border30} ${CAROUSEL_THEMES[activeCategory].text} hover:bg-white/10`}`}
              >
                <ChevronRight size={20} />
              </button>

              {/* Carousel Track */}
              <div className="relative w-full h-full flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
                <AnimatePresence initial={false}>
                  {CAROUSEL_DATA.map((category, index) => {
                    let offset = index - activeCategory;
                    const isActive = offset === 0;
                    const theme = CAROUSEL_THEMES[index];

                    const offsetX = isMobile ? 160 : 310;
                    const x = offset * offsetX;
                    const y = isActive ? 0 : Math.abs(offset) * 16;
                    const rotateY = offset * -40;
                    const rotateX = 0;
                    const rotateZ = 0;
                    const scale = isActive ? 1 : 0.82;
                    const zIndex = 50 - Math.abs(offset) * 10;
                    const opacity = isActive ? 1 : 0.4 - Math.abs(offset) * 0.15;

                    return (
                      <motion.div
                        key={category.id}
                        className="absolute origin-center"
                        initial={false}
                        animate={{ x, y, rotateX, rotateY, rotateZ, scale, zIndex, opacity }}
                        transition={{ type: "spring", stiffness: 280, damping: 25, mass: 1.1 }}
                        style={{ transformStyle: "preserve-3d" }}
                        onClick={() => { if (!isActive) setActiveCategory(index); }}
                      >
                        <motion.div
                          animate={isActive ? { y: [-6, 6, -6] } : { y: 0 }}
                          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                          className="w-full h-full flex items-center justify-center"
                        >
                          <div className={`relative w-[300px] sm:w-[350px] md:w-[380px] ${!isActive ? "cursor-pointer" : ""}`}>

                            {/* Breathing Aura */}
                            {isActive && (
                              <motion.div
                                animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.04, 1] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className={`absolute inset-0 rounded-full blur-[50px] -z-10 ${theme.glow}`}
                              />
                            )}

                            {/* Main Card with High-Affordance Scroll & Hint */}
                            <PriceListCardContent
                              category={category}
                              theme={theme}
                              getPaketVibeInfo={getPaketVibeInfo}
                            />
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Live Antrean & Status Section ── */}
      <motion.section
        id="antrean"
        className="relative z-20 py-8 md:py-14 border-b border-hairline bg-surface-dark/50 scroll-mt-16"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 pb-4 border-b border-hairline">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-nvidia-green"></span>
                </span>
                <span className="text-[10px] font-bold text-nvidia-green uppercase tracking-wider">LIVE MONITORING</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight uppercase">STATUS ANTREAN BOOKING</h2>
              <p className="text-white/50 tracking-tight text-xs sm:text-sm mt-1 max-w-xl">Pantau posisi antrean pemain dan sisa waktu PC secara langsung.</p>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 p-1 bg-black/60 border border-hairline rounded-lg overflow-x-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setAntreanCategoryTab('all')}
                  className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 active:scale-95 whitespace-nowrap ${
                    antreanCategoryTab === 'all'
                      ? "bg-nvidia-green text-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Semua ({allAntreanBookings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAntreanCategoryTab('now')}
                  className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 active:scale-95 whitespace-nowrap ${
                    antreanCategoryTab === 'now'
                      ? "bg-emerald-500 text-black font-extrabold"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Langsung ({directAntreanCount})
                </button>
                <button
                  type="button"
                  onClick={() => setAntreanCategoryTab('scheduled')}
                  className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 active:scale-95 whitespace-nowrap ${
                    antreanCategoryTab === 'scheduled'
                      ? "bg-white text-black font-extrabold"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Jam Tertentu ({scheduledAntreanCount})
                </button>
              </div>

              <input
                type="text"
                placeholder="Cari pemain / PC..."
                value={antreanSearch}
                onChange={(e) => setAntreanSearch(e.target.value)}
                className="bg-black/60 border border-hairline px-3 py-1.5 h-8 sm:h-9 text-xs text-white rounded-lg outline-none focus:border-nvidia-green w-full sm:w-52"
              />
            </div>
          </div>

          {/* Cards Grid */}
          {filteredBookings.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#0f1013]/90 border border-hairline flex-1 flex flex-col items-center justify-center text-zinc-400 text-xs uppercase tracking-wider">
              Belum ada data antrean dengan filter ini
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredBookings.map((b) => {
                const pc = db.pcs?.find((p: PC) => p.id === b.pc_id);
                const pkg = db.pakets?.find((p: Paket) => p.id === b.paket_id);
                const isPending = b.status === "pending";
                const isSched = isScheduledBooking(b);
                const schedLabel = getBookingScheduleLabel(b);

                const pkgTitle = pkg?.name || (b.paket_id?.startsWith('custom-') ? 'Kustom' : 'Tarif Langsung');

                const pcDiff = pc?.expected_empty_time ? new Date(pc.expected_empty_time).getTime() - now : 0;
                const pcHasTimer = Boolean(pc?.expected_empty_time);
                const pcExpired = !isPending && pcHasTimer && pcDiff <= 0;
                const pcWarning = !isPending && pcHasTimer && pcDiff > 0 && pcDiff <= 10 * 60 * 1000;
                const pcMins = Math.max(0, Math.floor(pcDiff / 60000));
                const pcSecs = Math.max(0, Math.floor((pcDiff % 60000) / 1000));

                const rawPc = pc?.name || b.pc_id;
                const pcLabel = rawPc.toUpperCase().startsWith("PC") ? rawPc : `PC ${rawPc}`;

                return (
                  <motion.div
                    key={b.id}
                    variants={itemVariants}
                    className={`p-4 sm:p-4.5 rounded-2xl flex flex-col justify-between gap-3 relative overflow-hidden group transition-all duration-200 bg-[#111215] border shadow-sm ${
                      pcExpired
                        ? "border-red-500/60 bg-red-500/[0.03] shadow-[0_0_20px_rgba(239,68,68,0.08)]"
                        : pcWarning
                        ? "border-amber-500/60 bg-amber-500/[0.03] shadow-[0_0_20px_rgba(245,158,11,0.08)]"
                        : "border-white/[0.08] hover:border-white/20 hover:bg-[#14151a]"
                    }`}
                  >
                    {/* Baris 1: Header Pemain & Target PC */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isPending ? (
                          <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                            <Clock size={13} className="text-amber-400 animate-pulse" />
                          </div>
                        ) : pcExpired ? (
                          <div className="w-7 h-7 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-nvidia-green/15 border border-nvidia-green/30 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={14} className="text-nvidia-green" />
                          </div>
                        )}
                        <span className="font-extrabold text-white text-sm sm:text-base uppercase tracking-tight truncate">
                          {b.player_name}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-nvidia-green text-black font-black text-xs sm:text-sm tracking-wide uppercase shadow-[0_0_15px_rgba(118,185,0,0.35)] shrink-0">
                        <Monitor size={13} className="stroke-[2.5]" />
                        <span>{pcLabel}</span>
                      </div>
                    </div>

                    {/* Baris 2: Paket - Tarif Sejajar & Metode Pembayaran */}
                    <div className="flex items-center justify-between gap-2 py-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-zinc-200 font-semibold truncate">
                          {pkgTitle}
                        </span>
                        <span className="text-zinc-500 text-xs shrink-0">-</span>
                        <span className="text-xs sm:text-sm font-bold text-white tabular-nums tracking-tight shrink-0">
                          Rp {(pkg?.price || (b.paket_id?.startsWith('custom-') ? parseInt(b.paket_id.replace('custom-', '')) || 0 : 0)).toLocaleString("id-ID")}
                        </span>
                      </div>

                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider shrink-0 ${b.ss_bukti ? 'bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                        {b.ss_bukti ? 'QRIS' : 'TUNAI OP'}
                      </span>
                    </div>

                    {/* Baris 3: Status Giliran Bar / Footer Capsule */}
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs mt-auto">
                      {isSched ? (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0 text-zinc-300">
                            <Clock size={13} className="text-zinc-400 shrink-0" />
                            <span className="truncate font-semibold text-xs">{schedLabel ? `Mulai ${schedLabel}` : 'Sesi Jam Tertentu'}</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-white border border-white/20 shrink-0 ml-2">
                            {isPending ? 'Menunggu OP' : 'Terjadwal'}
                          </span>
                        </>
                      ) : isPending ? (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0 text-amber-300">
                            <Clock size={13} className="animate-spin shrink-0 text-amber-400" />
                            <span className="truncate font-semibold text-xs">Menunggu Konfirmasi OP</span>
                          </div>
                          <span suppressHydrationWarning className="text-zinc-400 text-xs tabular-nums font-mono font-medium shrink-0 ml-2">
                            {new Date(b.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        </>
                      ) : pcExpired ? (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0 text-red-400">
                            <Flame size={13} className="shrink-0 animate-bounce" />
                            <span className="truncate font-bold text-xs">Giliran Main Sekarang</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 shrink-0 ml-2">
                            Waktu Habis
                          </span>
                        </>
                      ) : pcWarning ? (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0 text-amber-300">
                            <Clock size={13} className="animate-spin shrink-0 text-amber-400" />
                            <span className="truncate font-semibold text-xs">Bersiap Main</span>
                          </div>
                          <span suppressHydrationWarning className="text-xs font-mono font-bold text-amber-300 tabular-nums shrink-0 ml-2">
                            {pcMins}:{pcSecs.toString().padStart(2, '0')}
                          </span>
                        </>
                      ) : pcHasTimer && pcMins > 0 ? (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0 text-zinc-300">
                            <Hourglass size={13} className="text-nvidia-green shrink-0" />
                            <span className="truncate font-medium text-xs">Antre di PC ini</span>
                          </div>
                          <span suppressHydrationWarning className="text-nvidia-green font-bold tabular-nums shrink-0 ml-2">
                            ~{pcMins}m Lagi
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0 text-nvidia-green">
                            <CheckCircle2 size={13} className="shrink-0" />
                            <span className="truncate font-bold text-xs">{pcLabel} Siap Main</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/20 shrink-0 ml-2">
                            Standby
                          </span>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Booking Interface ── */}
      <motion.section
        id="booking"
        className="relative z-20 py-10 md:py-16 scroll-mt-16"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="max-w-7xl 2xl:max-w-[1440px] w-full mx-auto px-4 sm:px-6">
          {/* Stepper Header */}
          <div className="flex items-center justify-between max-w-sm mx-auto w-full mb-6 px-2">
            <button
              onClick={() => setBookingStep(1)}
              className="flex items-center gap-2 group cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                bookingStep === 1 
                  ? "bg-nvidia-green text-black shadow-[0_0_12px_rgba(118,185,0,0.5)]" 
                  : "bg-nvidia-green/20 text-nvidia-green border border-nvidia-green/40 group-hover:bg-nvidia-green group-hover:text-black"
              }`}>
                {bookingStep === 2 ? <Check size={14} /> : "1"}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                bookingStep === 1 ? "text-white" : "text-zinc-400 group-hover:text-white"
              }`}>
                Pilih PC
              </span>
            </button>

            <div className="flex-1 h-[2px] mx-4 bg-zinc-800 relative overflow-hidden rounded-full">
              <div className={`h-full bg-nvidia-green transition-all duration-300 ${bookingStep === 2 ? "w-full" : "w-0"}`} />
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedPc) setBookingStep(2);
              }}
              disabled={!selectedPc}
              className={`flex items-center gap-2 transition-all duration-200 ${
                selectedPc 
                  ? "cursor-pointer group hover:scale-105 active:scale-95" 
                  : "cursor-not-allowed opacity-60"
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                bookingStep === 2 
                  ? "bg-nvidia-green text-black shadow-[0_0_12px_rgba(118,185,0,0.5)]" 
                  : selectedPc
                  ? "bg-nvidia-green/20 text-nvidia-green border border-nvidia-green/40 group-hover:bg-nvidia-green group-hover:text-black"
                  : "bg-[#16171b] text-zinc-500 border border-hairline"
              }`}>
                2
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                bookingStep === 2 ? "text-white" : selectedPc ? "text-zinc-400 group-hover:text-white" : "text-zinc-500"
              }`}>
                Pembayaran
              </span>
            </button>
          </div>

          <div className="w-full relative overflow-hidden">
            <AnimatePresence mode="popLayout">
              {bookingStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full p-4 sm:p-5 md:p-6 pb-24 lg:pb-6 bg-[#0f1013]/95 border border-hairline rounded-2xl flex flex-col shadow-2xl"
                >
                  {/* Step 1 Header */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4 pb-4 border-b border-hairline">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">Pilih PC Untuk Booking</h2>
                      <p className="text-xs md:text-sm text-zinc-400 mt-1">Cek sisa waktu pemain aktif dan ambil nomor antrean berikutnya</p>
                    </div>
                  </div>

                  {/* Interactive Dynamic Hint Bar */}
                  <AnimatePresence mode="wait">
                    {!selectedPc ? (
                      <motion.div
                        key="hint-step1-none"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-nvidia-green/10 border border-nvidia-green/30 text-nvidia-green text-xs font-semibold mb-5 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-nvidia-green"></span>
                          </span>
                          <span>Langkah 1: Klik salah satu meja PC di bawah untuk cek spesifikasi dan durasi</span>
                        </div>
                        <span className="text-[11px] opacity-75 font-mono hidden sm:inline">Pilih Meja PC ➔</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="hint-step1-selected"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold mb-5 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          <span><strong>{selectedPcObj?.name || selectedPc}</strong> terpilih. Klik tombol lanjut untuk atur paket billing</span>
                        </div>
                        <button
                          onClick={handleNextStep}
                          className="px-3.5 py-1.5 bg-nvidia-green text-black font-extrabold text-[11px] rounded-lg uppercase tracking-wider hover:bg-white transition flex items-center gap-1.5 shrink-0 shadow-[0_0_12px_rgba(118,185,0,0.4)] active:scale-95"
                        >
                          <span>Lanjut ke Paket</span>
                          <ArrowRight size={13} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Master-Detail 2-Column Layout */}
                  <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
                    {/* Kolom Kiri: Grid Unit PC (8 Kolom di desktop) */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
                      <div className="flex items-center justify-between mb-3 text-xs">
                        <span className="text-zinc-400 font-medium">Pilih salah satu unit di bawah:</span>
                        <span className="text-[11px] font-bold text-nvidia-green uppercase tracking-wider">{db?.pcs?.length || 0} Meja Tersedia</span>
                      </div>

                      {mounted && (
                        <motion.div
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="show"
                          viewport={{ once: true, margin: "-50px" }}
                          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-3.5"
                        >
                          {db?.pcs?.map((pc) => {
                            const isSelected = selectedPc === pc.id;
                            const allPcBookings = db?.bookings?.filter(b => b.pc_id === pc.id) || [];
                            const pcDirectBookings = allPcBookings.filter(b => !isScheduledBooking(b));
                            const pcScheduledBookings = allPcBookings.filter(b => isScheduledBooking(b));
                            const pcBookings = pcDirectBookings;
                            const firstBooking = pcDirectBookings[0] || pcScheduledBookings[0];
                            const isPending = firstBooking?.status === 'pending';

                            const firstPkg = db?.pakets?.find(p => p.id === firstBooking?.paket_id);
                            const firstPkgTitle = firstPkg?.name || (firstBooking?.paket_id?.startsWith('custom-') ? 'Kustom' : 'Paket');

                            const hasTimer = Boolean(pc.expected_empty_time);
                            const diff = pc.expected_empty_time ? new Date(pc.expected_empty_time).getTime() - now : 0;
                            const isExpired = hasTimer && diff <= 0;
                            const isWarning = hasTimer && diff > 0 && diff <= 10 * 60 * 1000;
                            const isNormalTimer = hasTimer && diff > 10 * 60 * 1000;

                            const mins = Math.max(0, Math.floor(diff / 60000));
                            const secs = Math.max(0, Math.floor((diff % 60000) / 1000));

                            return (
                              <motion.button
                                variants={itemVariants}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                key={pc.id}
                                onClick={() => handlePcClick(pc.id)}
                                className={`
                                  relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl transition-all border overflow-hidden group text-left min-h-[115px] sm:min-h-[120px]
                                  ${isSelected
                                    ? isExpired
                                      ? "bg-red-500/15 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)] ring-2 ring-red-500 scale-[1.01]"
                                      : isWarning
                                      ? "bg-amber-500/15 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-2 ring-amber-500 scale-[1.01]"
                                      : "bg-nvidia-green/15 border-nvidia-green text-white shadow-[0_0_25px_rgba(118,185,0,0.35)] ring-2 ring-nvidia-green scale-[1.01]"
                                    : isExpired
                                    ? "bg-red-500/5 border-red-500/40 text-white hover:border-red-400"
                                    : isWarning
                                    ? "bg-amber-500/5 border-amber-500/40 text-white hover:border-amber-400"
                                    : "bg-[#121316] border-hairline text-white hover:border-zinc-500 hover:bg-[#16171b]"
                                  }
                                `}
                              >
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-6 h-6 rounded-bl-xl rounded-tr-lg bg-nvidia-green text-black flex items-center justify-center shadow-md z-10"
                                    title="PC Terpilih"
                                  >
                                    <Check size={12} className="stroke-[3]" />
                                  </motion.div>
                                )}
                                {/* Bagian Atas: Header PC & Badge Status */}
                                <div className="flex items-center justify-between w-full gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Monitor
                                      size={16}
                                      className={
                                        isExpired 
                                          ? "text-red-400 shrink-0" 
                                          : isWarning 
                                          ? "text-amber-400 shrink-0" 
                                          : isSelected 
                                          ? "text-nvidia-green shrink-0" 
                                          : "text-zinc-300 shrink-0 group-hover:text-white"
                                      }
                                    />
                                    <span className={`text-xs sm:text-sm font-black tracking-tight uppercase whitespace-nowrap ${
                                      isExpired ? "text-red-400" : isWarning ? "text-amber-400" : isSelected ? "text-nvidia-green" : "text-white"
                                    }`}>
                                      {pc.name}
                                    </span>
                                  </div>

                                  <span className={`text-[11px] sm:text-xs px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wide shrink-0 ${
                                    pcBookings.length > 0
                                      ? "bg-nvidia-green/20 text-nvidia-green border border-nvidia-green/30"
                                      : isExpired
                                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                      : isWarning
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : hasTimer
                                      ? "bg-white/10 text-white border border-white/20"
                                      : "bg-white/5 text-zinc-300 border border-white/10"
                                  }`}>
                                    {pcBookings.length > 0 ? `${pcBookings.length} Antre` : isExpired ? "Habis" : isWarning ? "Bersiap" : hasTimer ? "Dipakai" : "Bebas"}
                                  </span>
                                </div>

                                {/* Bagian Tengah: Status Antrean & Sesi */}
                                <div className="my-1.5 min-w-0">
                                  {pcBookings.length > 0 ? (
                                    <div className="flex items-center gap-1.5 text-zinc-100 text-xs font-bold truncate">
                                      <Users size={14} className="text-nvidia-green shrink-0" />
                                      <span className="truncate">
                                        {isPending
                                          ? `Tunggu OP: ${firstBooking.player_name}`
                                          : `Antre 1: ${firstBooking.player_name}`}
                                      </span>
                                    </div>
                                  ) : isExpired ? (
                                    <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold whitespace-nowrap">
                                      <Flame size={14} className="shrink-0" />
                                      <span>Sesi Waktu Habis</span>
                                    </div>
                                  ) : isWarning ? (
                                    <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold whitespace-nowrap">
                                      <Clock size={14} className="animate-spin shrink-0" />
                                      <span>Sesi Bersiap Selesai</span>
                                    </div>
                                  ) : hasTimer ? (
                                    <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-semibold whitespace-nowrap">
                                      <Clock size={14} className="text-nvidia-green shrink-0" />
                                      <span>Sedang Dimainkan</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-bold whitespace-nowrap">
                                      <CheckCircle2 size={14} className="shrink-0" />
                                      <span>Siap Booking</span>
                                    </div>
                                  )}
                                </div>

                                {/* Bagian Bawah: Posisi Antrean & Indikator Aksi */}
                                <div className="flex items-center justify-between text-xs pt-2.5 border-t border-hairline/60 w-full">
                                  {pcBookings.length > 0 ? (
                                    <span className="text-nvidia-green text-xs font-bold tracking-tight whitespace-nowrap">
                                      Ambil Antrean {pcBookings.length + 1}
                                    </span>
                                  ) : isExpired ? (
                                    <span className="text-red-300 text-xs uppercase font-bold tracking-tight">
                                      Sesi Selesai
                                    </span>
                                  ) : isWarning ? (
                                    <span suppressHydrationWarning className="text-amber-300 tabular-nums font-bold font-mono text-xs">
                                      Sisa {mins}:{secs.toString().padStart(2, '0')}
                                    </span>
                                  ) : isNormalTimer ? (
                                    <span suppressHydrationWarning className="text-zinc-300 tabular-nums text-xs font-medium">
                                      Sisa <strong className="text-nvidia-green font-bold">~{mins}m</strong>
                                    </span>
                                  ) : (
                                    <span className="text-zinc-300 text-xs font-medium">
                                      Antrean 1 Tersedia
                                    </span>
                                  )}

                                  {isSelected ? (
                                    <span className="text-xs font-bold text-nvidia-green uppercase tracking-tight flex items-center gap-1 shrink-0">
                                      <Check size={13} /> Terpilih
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors uppercase shrink-0">
                                      Pilih Unit
                                    </span>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      )}
                    </div>

                    {/* Kolom Kanan: Command Deck Sticky (4 Kolom di desktop) */}
                    <div className="lg:col-span-5 xl:col-span-4 mt-6 lg:mt-0 lg:sticky lg:top-24">
                      {selectedPcObj ? (
                        <div className="p-5 sm:p-6 rounded-2xl bg-[#121316] border border-hairline/80 shadow-2xl relative overflow-hidden flex flex-col gap-4">
                          <div className="absolute -top-10 -right-10 w-44 h-44 bg-nvidia-green/10 blur-[60px] pointer-events-none rounded-full" />

                          {/* Header Command Deck */}
                          <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-hairline/60 relative z-10">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-nvidia-green"></span>
                                </span>
                                <span className="text-[10px] font-bold text-nvidia-green uppercase tracking-widest">COMMAND DECK</span>
                              </div>
                              <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                                {selectedPcObj.name}
                              </h3>
                            </div>

                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border shrink-0 ${
                              selectedPcBookings.length > 0
                                ? "bg-nvidia-green/20 text-nvidia-green border border-nvidia-green/30"
                                : selectedPcExpired
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : selectedPcWarning
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : selectedPcHasTimer
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-nvidia-green/15 text-nvidia-green border-nvidia-green/30"
                            }`}>
                              {selectedPcBookings.length > 0
                                ? `${selectedPcBookings.length} Antrean`
                                : selectedPcExpired
                                ? "Sesi Selesai"
                                : selectedPcWarning
                                ? "Sesi Bersiap"
                                : selectedPcHasTimer
                                ? "Sedang Dimainkan"
                                : "Tersedia Untuk Booking"}
                            </span>
                          </div>

                          {/* Status Realtime Bar */}
                          <div className="p-3 rounded-xl bg-black/40 border border-hairline/60 flex items-center justify-between text-xs relative z-10">
                            <div className="flex items-center gap-2 min-w-0">
                              {selectedPcBookings.length > 0 ? (
                                <>
                                  <Users size={14} className="text-nvidia-green shrink-0" />
                                  <span className="text-zinc-300 font-medium truncate">
                                    {selectedPcFirstBooking?.status === 'pending'
                                      ? `Tunggu OP: ${selectedPcFirstBooking.player_name}`
                                      : `Antre 1: ${selectedPcFirstBooking?.player_name}`}
                                  </span>
                                </>
                              ) : selectedPcExpired ? (
                                <>
                                  <Flame size={14} className="text-red-400 shrink-0" />
                                  <span className="text-zinc-300 font-medium whitespace-nowrap">Sesi Bermain Selesai</span>
                                </>
                              ) : selectedPcHasTimer ? (
                                <>
                                  <Clock size={14} className="text-amber-400 animate-spin shrink-0" />
                                  <span className="text-zinc-300 font-medium whitespace-nowrap">Sedang Dimainkan</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                  <span className="text-zinc-300 font-medium whitespace-nowrap">Siap Booking Online</span>
                                </>
                              )}
                            </div>
                            <span suppressHydrationWarning className="text-white font-bold tabular-nums shrink-0 ml-2">
                              {selectedPcBookings.length > 0
                                ? `${selectedPcBookings.length} Pemain Antre`
                                : selectedPcExpired
                                ? "Selesai"
                                : selectedPcHasTimer
                                ? `~${selectedPcMins}m Lagi`
                                : "Belum Ada Antrean"}
                            </span>
                          </div>

                          {/* Info Booking Terjadwal jika ada */}
                          {selectedPcScheduledBookings.length > 0 && (
                            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/15 flex items-center justify-between text-xs relative z-10">
                              <div className="flex items-center gap-2 text-zinc-300">
                                <Clock size={14} className="text-zinc-400 shrink-0" />
                                <span className="font-semibold">Ada Booking Terjadwal:</span>
                              </div>
                              <span className="font-mono text-white font-bold">
                                {selectedPcScheduledBookings.map(sb => getBookingScheduleLabel(sb) || "Jam Tertentu").join(", ")}
                              </span>
                            </div>
                          )}

                          {/* Showcase Hardware */}
                          <div className="space-y-2 relative z-10">
                            <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center justify-between">
                              <span>Spesifikasi Hardware</span>
                              <span className="text-[9px] text-nvidia-green font-bold uppercase">Spek Terpasang</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-xs">
                              <div className="p-2.5 rounded-lg bg-[#16181d] border border-white/10 flex items-center gap-2.5 hover:border-white/25 transition shadow-sm">
                                <div className="w-7 h-7 rounded-md bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                                  <Monitor size={14} className="text-zinc-300" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Monitor Layar</div>
                                  <div className="text-white font-extrabold text-xs leading-snug break-words mt-0.5">
                                    {selectedPcObj.specs?.monitor || "GIGABYTE 240Hz Fast IPS Esports"}
                                  </div>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg bg-[#16181d] border border-emerald-500/30 flex items-center gap-2.5 hover:border-emerald-400/60 transition shadow-sm">
                                <div className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shrink-0">
                                  <Gamepad2 size={14} className="text-emerald-300" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider">Kartu Grafis VGA</div>
                                  <div className="text-white font-extrabold text-xs leading-snug break-words mt-0.5">
                                    {selectedPcObj.specs?.gpu || "AMD Radeon Vega Series"}
                                  </div>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg bg-[#16181d] border border-amber-500/30 flex items-center gap-2.5 hover:border-amber-400/60 transition shadow-sm">
                                <div className="w-7 h-7 rounded-md bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
                                  <Cpu size={14} className="text-amber-300" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">Processor & RAM</div>
                                  <div className="text-white font-extrabold text-xs leading-snug break-words mt-0.5">
                                    {selectedPcObj.specs?.cpu || "AMD Ryzen Series"} {selectedPcObj.specs?.ram ? `• ${selectedPcObj.specs.ram}` : ""}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action CTA */}
                          <div className="pt-2 border-t border-hairline/60 relative z-10 space-y-2">
                            <motion.div
                              animate={{ y: [0, -2, 0] }}
                              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                              className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-nvidia-green bg-nvidia-green/10 py-1 px-2.5 rounded-md border border-nvidia-green/20"
                            >
                              <Sparkles size={11} className="text-nvidia-green shrink-0 animate-spin" />
                              <span>Unit siap. Klik tombol di bawah untuk lanjut</span>
                              <ArrowRight size={11} className="shrink-0" />
                            </motion.div>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleNextStep}
                              className="w-full h-10 px-4 rounded-lg bg-nvidia-green hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(118,185,0,0.3)] active:scale-[0.99]"
                            >
                              <span>
                                {selectedPcBookings.length > 0
                                  ? `Lanjut Booking Antrean ke-${selectedPcBookings.length + 1}`
                                  : "Lanjut Pilih Paket dan Booking"}
                              </span>
                              <ArrowRight size={14} />
                            </motion.button>
                            <div className="text-center text-[11px] text-zinc-300 font-medium">
                              Nomor antrean dan konfirmasi OP diproses otomatis
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 rounded-2xl bg-[#121316]/70 border border-hairline/60 shadow-xl flex flex-col items-center justify-center text-center min-h-[320px] relative overflow-hidden">
                          <motion.div 
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ repeat: Infinity, duration: 2.5 }}
                            className="w-12 h-12 rounded-2xl bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center mb-3 text-nvidia-green shadow-[0_0_15px_rgba(118,185,0,0.2)]"
                          >
                            <Monitor size={22} />
                          </motion.div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                            Pilih Meja PC
                          </h4>
                          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed mb-4">
                            Klik salah satu unit PC di sebelah kiri untuk melihat status antrean, spesifikasi hardware monitor 240Hz, dan mengambil nomor giliran.
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-nvidia-green uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-nvidia-green/10 border border-nvidia-green/30 animate-pulse">
                            <span>👈 Klik PC di Sebelah Kiri</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile Fixed Bottom Action Bar for Step 1 */}
                  <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f1013]/95 border-t border-hairline px-4 py-3 backdrop-blur-xl flex items-center justify-between gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] text-zinc-300 font-semibold uppercase tracking-wider">Unit Terpilih:</span>
                      <span className="text-sm font-black text-white truncate flex items-center gap-1.5">
                        {selectedPcObj ? (
                          <>
                            <span className="text-nvidia-green">{selectedPcObj.name}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-nvidia-green animate-ping"></span>
                          </>
                        ) : (
                          "Pilih salah satu PC"
                        )}
                      </span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      animate={selectedPc ? { scale: [1, 1.03, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                      onClick={handleNextStep}
                      disabled={!selectedPc}
                      className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                        selectedPc
                          ? "bg-nvidia-green text-black hover:bg-white shadow-[0_0_20px_rgba(118,185,0,0.5)] ring-1 ring-white/50"
                          : "bg-surface-soft text-zinc-600 cursor-not-allowed border border-hairline"
                      }`}
                    >
                      <span>
                        {selectedPcBookings.length > 0
                          ? `Antrean #${selectedPcBookings.length + 1}`
                          : "Lanjut Booking"}
                      </span>
                      <ArrowRight size={14} className={selectedPc ? "animate-pulse" : ""} />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {bookingStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="w-full p-4 sm:p-6 md:p-8 pb-28 lg:pb-8 bg-[#0f1013]/95 border border-hairline rounded-2xl flex flex-col shadow-2xl backdrop-blur-xl"
                >
                  {/* Step 2 Header & Navigation */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-hairline">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <button
                        onClick={() => {
                          setFormError(null);
                          setBookingStep(1);
                          setTimeout(() => {
                            const elem = document.getElementById("booking");
                            if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 60);
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#16171b] hover:bg-[#1f2127] border border-hairline rounded-xl text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition shrink-0 shadow-sm"
                      >
                        <ChevronLeft size={16} />
                        <span>Pilih PC Lain</span>
                      </button>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                          Konfirmasi Booking & Paket Billing
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                          <span className="text-zinc-400">Unit PC:</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-nvidia-green/10 border border-nvidia-green/30 text-nvidia-green font-black uppercase">
                            {selectedPcObj?.name || selectedPc}
                          </span>
                          {selectedPcBookings.length > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                              Antrean ke-{selectedPcBookings.length + 1}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                              Siap Pakai
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive 3-Step Guided Checklist Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
                    {/* Step 2.1: Nickname */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      playerName.trim()
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-sm"
                        : "bg-amber-500/10 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/20"
                    }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          playerName.trim() ? "bg-emerald-500 text-black" : "bg-amber-500 text-black"
                        }`}>
                          {playerName.trim() ? <Check size={12} className="stroke-[3]" /> : "1"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold uppercase tracking-wide">1. Nickname</div>
                          <div className="text-xs text-zinc-200 truncate font-medium">
                            {playerName.trim() ? playerName : "Ketik nama lu"}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] sm:text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full shrink-0 ${
                        playerName.trim() ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300 animate-pulse"
                      }`}>
                        {playerName.trim() ? "Lengkap" : "Wajib"}
                      </span>
                    </div>

                    {/* Step 2.2: Paket */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      selectedPaket
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-sm"
                        : "bg-amber-500/10 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/20"
                    }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          selectedPaket ? "bg-emerald-500 text-black" : "bg-amber-500 text-black"
                        }`}>
                          {selectedPaket ? <Check size={12} className="stroke-[3]" /> : "2"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold uppercase tracking-wide">2. Paket Billing</div>
                          <div className="text-xs text-zinc-200 truncate font-medium">
                            {selectedPaketObj ? selectedPaketObj.name : "Pilih paket"}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] sm:text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full shrink-0 ${
                        selectedPaket ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300 animate-pulse"
                      }`}>
                        {selectedPaket ? "Terpilih" : "Wajib"}
                      </span>
                    </div>

                    {/* Step 2.3: Waktu Sesi */}
                    <div className="p-3 rounded-xl border bg-white/[0.04] border-white/15 text-zinc-200 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shrink-0">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold uppercase tracking-wide">3. Waktu Mulai</div>
                          <div className="text-xs text-zinc-300 truncate font-medium">
                            {selectedPaketObj?.fixed_start_time
                              ? `Sesi ${selectedPaketObj.fixed_start_time} WIB`
                              : bookingTimingMode === 'scheduled'
                              ? `Jam ${customScheduleTime} WIB`
                              : "Langsung Main"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15 shrink-0">
                        {selectedPaketObj?.fixed_start_time ? "Khusus" : bookingTimingMode === 'scheduled' ? "Jadwal" : "Sekarang"}
                      </span>
                    </div>
                  </div>

                  {/* Inline Error Message */}
                  {formError && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2.5 mb-6">
                      <AlertTriangle size={16} className="shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Master-Detail 2-Column Grid */}
                  <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
                    {/* Left Column: Form & Package Selection */}
                    <div className="lg:col-span-7 xl:col-span-7 space-y-3.5">
                      
                      {/* Nickname Pemain (Single Row) */}
                      <div className={`p-3.5 sm:p-4 rounded-xl bg-[#121316] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isShakingNickname ? "border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.25)] ring-1 ring-red-500" : "border-hairline"
                      }`}>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className={`w-5 h-5 rounded-full font-black text-[11px] flex items-center justify-center shrink-0 ${
                            playerName.trim() ? "bg-emerald-500 text-black" : "bg-nvidia-green text-black"
                          }`}>
                            {playerName.trim() ? <Check size={11} className="stroke-[3]" /> : "1"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <label htmlFor="nickname-input" className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider block cursor-pointer">
                                Nickname Pemain
                              </label>
                              {memberSession ? (
                                <span className="text-[10px] sm:text-[11px] font-bold text-nvidia-green bg-nvidia-green/10 border border-nvidia-green/30 px-2 py-0.5 rounded uppercase tracking-wider">
                                  Akun Member
                                </span>
                              ) : (
                                <Link 
                                  href="/member" 
                                  className="text-xs text-zinc-400 hover:text-nvidia-green hover:underline transition font-semibold"
                                >
                                  Masuk Akun
                                </Link>
                              )}
                            </div>
                            <span className="text-xs text-zinc-200 font-medium">
                              {memberSession ? "Terkunci sesuai akun member lu" : "Nama ini bakal dipanggil OP pas giliran main lu tiba"}
                            </span>
                          </div>
                        </div>

                        <motion.div 
                          animate={isShakingNickname ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                          transition={{ duration: 0.4 }}
                          className="relative flex-1 sm:max-w-xs md:max-w-sm"
                        >
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                          <input
                            ref={nicknameInputRef}
                            id="nickname-input"
                            type="text"
                            value={playerName}
                            readOnly={Boolean(memberSession)}
                            onChange={e => {
                              if (!memberSession) {
                                setPlayerName(e.target.value);
                                if (formError) setFormError(null);
                              }
                            }}
                            placeholder="Ketik nickname main lu..."
                            className={`w-full border pl-9 pr-8 py-2 rounded-lg text-xs sm:text-sm font-semibold outline-none transition placeholder:text-zinc-400 ${
                              isShakingNickname
                                ? "bg-red-500/10 border-red-500 text-white ring-2 ring-red-500/50"
                                : memberSession 
                                ? "bg-black/80 border-nvidia-green/40 text-nvidia-green cursor-not-allowed" 
                                : "bg-black/50 border-hairline text-white focus:border-nvidia-green focus:ring-1 focus:ring-nvidia-green"
                            }`}
                          />
                          {playerName.trim().length > 0 && (
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nvidia-green">
                              <Check size={14} />
                            </span>
                          )}
                        </motion.div>
                      </div>

                      {/* Pilihan Paket Billing */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-[#121316] border border-hairline space-y-3">
                        {/* Filter Tabs and Search Bar in Single Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          {/* Segmented Switcher */}
                          <div className="flex items-center gap-1 p-1 bg-black/50 border border-hairline rounded-lg overflow-x-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => setBookingPaketTab('jam')}
                              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap ${
                                bookingPaketTab === 'jam'
                                  ? "bg-nvidia-green text-black shadow-[0_0_10px_rgba(118,185,0,0.3)]"
                                  : "text-zinc-300 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Clock size={13} className="shrink-0" />
                              <span>Jam Reguler</span>
                              {searchPaketQuery && (
                                <span className={`text-[9px] px-1 py-0.2 rounded-full font-bold ${bookingPaketTab === 'jam' ? 'bg-black text-nvidia-green' : 'bg-zinc-800 text-zinc-200'}`}>
                                  {filteredJamPakets.length}
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setBookingPaketTab('nominal')}
                              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap ${
                                bookingPaketTab === 'nominal'
                                  ? "bg-nvidia-green text-black shadow-[0_0_10px_rgba(118,185,0,0.3)]"
                                  : "text-zinc-300 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Banknote size={13} className="shrink-0" />
                              <span>Uang Pas</span>
                              {searchPaketQuery && (
                                <span className={`text-[9px] px-1 py-0.2 rounded-full font-bold ${bookingPaketTab === 'nominal' ? 'bg-black text-nvidia-green' : 'bg-zinc-800 text-zinc-200'}`}>
                                  {filteredHargaPakets.length}
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setBookingPaketTab('spesial')}
                              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap ${
                                bookingPaketTab === 'spesial'
                                  ? "bg-nvidia-green text-black shadow-[0_0_10px_rgba(118,185,0,0.3)]"
                                  : "text-zinc-300 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Sparkles size={13} className="shrink-0" />
                              <span>Spesial & Malam</span>
                              {searchPaketQuery && (
                                <span className={`text-[9px] px-1 py-0.2 rounded-full font-bold ${bookingPaketTab === 'spesial' ? 'bg-black text-nvidia-green' : 'bg-zinc-800 text-zinc-200'}`}>
                                  {filteredSpesialPakets.length}
                                </span>
                              )}
                            </button>
                          </div>

                          {/* Quick Search / Type Input */}
                          <div className="relative flex-1 sm:max-w-[210px] md:max-w-[240px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                            <input
                              type="text"
                              value={searchPaket}
                              onChange={(e) => setSearchPaket(e.target.value)}
                              placeholder="Cari atau ketik durasi..."
                              className="w-full bg-black/50 border border-hairline text-white pl-8 pr-7 py-1.5 rounded-lg text-xs font-semibold focus:border-nvidia-green focus:ring-1 focus:ring-nvidia-green outline-none transition placeholder:text-zinc-400"
                            />
                            {searchPaket && (
                              <button
                                type="button"
                                onClick={() => setSearchPaket("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Tab Content: Paket Jam */}
                        {bookingPaketTab === 'jam' && (
                          filteredJamPakets.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-0.5">
                              {filteredJamPakets.map((pkg) => {
                                const isSelected = selectedPaket === pkg.id;
                                const vibe = getPaketVibeInfo(pkg);
                                return (
                                  <button
                                    key={pkg.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPaket(pkg.id);
                                      if (formError) setFormError(null);
                                    }}
                                    className={`p-3.5 sm:p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden flex flex-col justify-between group ${
                                      isSelected
                                        ? "bg-nvidia-green/15 border-nvidia-green text-white shadow-[0_0_16px_rgba(118,185,0,0.25)] ring-1 ring-nvidia-green"
                                        : "bg-[#14161b] border-zinc-700/60 text-zinc-200 hover:border-zinc-400 hover:bg-[#1a1c23] hover:text-white shadow-sm"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-black text-white tracking-tight">
                                            {vibe.title}
                                          </span>
                                          {vibe.badge && (
                                            <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wide ${vibe.badgeColor}`}>
                                              {vibe.badge}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-zinc-200 font-medium mt-1 leading-snug group-hover:text-white transition-colors">
                                          {vibe.description}
                                        </p>
                                      </div>
                                      {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-nvidia-green flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                          <Check size={12} className="text-black font-bold" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="pt-2.5 border-t border-hairline/60 flex items-center justify-between gap-2 mt-auto">
                                      <span className="text-xs text-zinc-200 font-semibold flex items-center gap-1.5">
                                        <Clock size={13} className="text-nvidia-green" />
                                        <span>{vibe.detailTime}</span>
                                      </span>
                                      <span className="text-base font-extrabold text-nvidia-green tabular-nums">
                                        Rp {pkg.price.toLocaleString("id-ID")}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 rounded-lg bg-black/40 border border-hairline text-center space-y-2">
                              <p className="text-xs text-zinc-400">
                                Tidak ada paket jam yang cocok dengan kata kunci &quot;{searchPaket}&quot;.
                              </p>
                              {(filteredHargaPakets.length > 0 || filteredSpesialPakets.length > 0) && (
                                <div className="flex justify-center gap-2 pt-1">
                                  {filteredHargaPakets.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setBookingPaketTab('nominal')}
                                      className="px-2.5 py-1 bg-[#16171b] hover:bg-[#202228] border border-hairline text-xs font-bold text-white rounded-md transition"
                                    >
                                      Lihat di Uang Pas
                                    </button>
                                  )}
                                  {filteredSpesialPakets.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setBookingPaketTab('spesial')}
                                      className="px-2.5 py-1 bg-[#16171b] hover:bg-[#202228] border border-hairline text-xs font-bold text-white rounded-md transition"
                                    >
                                      Lihat di Spesial & Malam
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        )}

                        {/* Tab Content: Uang Pas & Custom */}
                        {bookingPaketTab === 'nominal' && (
                          <div className="space-y-2.5 pt-0.5">
                            {filteredHargaPakets.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {filteredHargaPakets.map((pkg) => {
                                  const isSelected = selectedPaket === pkg.id;
                                  const vibe = getPaketVibeInfo(pkg);
                                  return (
                                    <button
                                      key={pkg.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedPaket(pkg.id);
                                        setCustomNominalInput("");
                                        if (formError) setFormError(null);
                                      }}
                                      className={`p-3.5 sm:p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden flex flex-col justify-between group ${
                                        isSelected
                                          ? "bg-nvidia-green/15 border-nvidia-green text-white shadow-[0_0_16px_rgba(118,185,0,0.25)] ring-1 ring-nvidia-green"
                                          : "bg-[#14161b] border-zinc-700/60 text-zinc-200 hover:border-zinc-400 hover:bg-[#1a1c23] hover:text-white shadow-sm"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-black text-white tracking-tight">
                                              {vibe.title}
                                            </span>
                                            {vibe.badge && (
                                              <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wide ${vibe.badgeColor}`}>
                                                {vibe.badge}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-zinc-200 font-medium mt-1 leading-snug group-hover:text-white transition-colors">
                                            {vibe.description}
                                          </p>
                                        </div>
                                        {isSelected && (
                                          <div className="w-5 h-5 rounded-full bg-nvidia-green flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                            <Check size={12} className="text-black font-bold" />
                                          </div>
                                        )}
                                      </div>

                                      <div className="pt-2.5 border-t border-hairline/60 flex items-center justify-between gap-2 mt-auto">
                                        <span className="text-xs text-zinc-200 font-semibold flex items-center gap-1.5">
                                          <Clock size={13} className="text-nvidia-green" />
                                          <span>{vibe.detailTime}</span>
                                        </span>
                                        <span className="text-base font-extrabold text-nvidia-green tabular-nums">
                                          Rp {pkg.price.toLocaleString("id-ID")}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-4 rounded-lg bg-black/40 border border-hairline text-center space-y-2">
                                <p className="text-xs text-zinc-400">
                                  Tidak ada paket uang pas yang cocok dengan kata kunci &quot;{searchPaket}&quot;.
                                </p>
                                {(filteredJamPakets.length > 0 || filteredSpesialPakets.length > 0) && (
                                  <div className="flex justify-center gap-2 pt-1">
                                    {filteredJamPakets.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setBookingPaketTab('jam')}
                                        className="px-2.5 py-1 bg-[#16171b] hover:bg-[#202228] border border-hairline text-xs font-bold text-white rounded-md transition"
                                      >
                                        Lihat di Jam Reguler
                                      </button>
                                    )}
                                    {filteredSpesialPakets.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setBookingPaketTab('spesial')}
                                        className="px-2.5 py-1 bg-[#16171b] hover:bg-[#202228] border border-hairline text-xs font-bold text-white rounded-md transition"
                                      >
                                        Lihat di Spesial & Malam
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Custom Nominal Box */}
                            <div className="p-3 rounded-lg bg-black/40 border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div>
                                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                                  Punya Uang Pas Sendiri?
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                  Ketik nominal rupiah, durasi dihitung otomatis, minimal Rp 3.000.
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-400">Rp</span>
                                <input
                                  type="number"
                                  placeholder="15000"
                                  value={customNominalInput}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomNominalInput(val);
                                    const num = parseInt(val);
                                    if (num >= 3000) {
                                      setSelectedPaket(`custom-${num}`);
                                      if (formError) setFormError(null);
                                    } else if (!val) {
                                      if (selectedPaket?.startsWith("custom-")) setSelectedPaket(null);
                                    }
                                  }}
                                  className="w-full sm:w-32 bg-black/60 border border-hairline text-white px-3 py-1.5 rounded-lg text-xs font-bold focus:border-nvidia-green outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tab Content: Paket Spesial & Malam */}
                        {bookingPaketTab === 'spesial' && (
                          filteredSpesialPakets.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                              {filteredSpesialPakets.map((pkg) => {
                                const isSelected = selectedPaket === pkg.id;
                                const vibe = getPaketVibeInfo(pkg);
                                return (
                                  <button
                                    key={pkg.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPaket(pkg.id);
                                      if (formError) setFormError(null);
                                    }}
                                    className={`p-3.5 sm:p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden flex flex-col justify-between group ${
                                      isSelected
                                        ? "bg-nvidia-green/15 border-nvidia-green text-white shadow-[0_0_16px_rgba(118,185,0,0.25)] ring-1 ring-nvidia-green"
                                        : "bg-[#14161b] border-zinc-700/60 text-zinc-200 hover:border-zinc-400 hover:bg-[#1a1c23] hover:text-white shadow-sm"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-black text-white tracking-tight">
                                            {vibe.title}
                                          </span>
                                          {vibe.badge && (
                                            <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wide ${vibe.badgeColor}`}>
                                              {vibe.badge}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-zinc-200 font-medium mt-1 leading-snug group-hover:text-white transition-colors">
                                          {vibe.description}
                                        </p>
                                      </div>
                                      {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-nvidia-green flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                          <Check size={12} className="text-black font-bold" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="pt-2.5 border-t border-hairline/60 flex items-center justify-between gap-2 mt-auto">
                                      <span className="text-xs text-zinc-200 font-semibold flex items-center gap-1.5">
                                        <Clock size={13} className="text-zinc-400" />
                                        <span>{vibe.detailTime}</span>
                                      </span>
                                      <span className="text-base font-extrabold text-nvidia-green tabular-nums">
                                        Rp {pkg.price.toLocaleString("id-ID")}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 rounded-lg bg-black/40 border border-hairline text-center space-y-2">
                              <p className="text-xs text-zinc-400">
                                Tidak ada paket spesial yang cocok dengan kata kunci &quot;{searchPaket}&quot;.
                              </p>
                              {(filteredJamPakets.length > 0 || filteredHargaPakets.length > 0) && (
                                <div className="flex justify-center gap-2 pt-1">
                                  {filteredJamPakets.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setBookingPaketTab('jam')}
                                      className="px-2.5 py-1 bg-[#16171b] hover:bg-[#202228] border border-hairline text-xs font-bold text-white rounded-md transition"
                                    >
                                      Lihat di Jam Reguler
                                    </button>
                                  )}
                                  {filteredHargaPakets.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setBookingPaketTab('nominal')}
                                      className="px-2.5 py-1 bg-[#16171b] hover:bg-[#202228] border border-hairline text-xs font-bold text-white rounded-md transition"
                                    >
                                      Lihat di Uang Pas
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>

                      {/* 3. Waktu Mulai Main / Pilihan Jadwal */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-[#121316] border border-hairline space-y-3">
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-nvidia-green text-black font-black text-[11px] flex items-center justify-center shrink-0">
                              3
                            </div>
                            <div>
                              <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider block">
                                Waktu Mulai Main
                              </span>
                              <span className="text-xs text-zinc-300 font-medium">
                                {selectedPaketObj?.fixed_start_time
                                  ? "Paket ini berjadwal khusus, otomatis di jam tersebut"
                                  : "Pilih langsung antre atau booking untuk jam tertentu"}
                              </span>
                            </div>
                          </div>
                          {selectedPaketObj?.fixed_start_time && (
                            <span className="text-[10px] sm:text-[11px] font-bold text-white bg-white/10 border border-white/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Jadwal Khusus
                            </span>
                          )}
                        </div>

                        {selectedPaketObj?.fixed_start_time ? (
                          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/15 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-zinc-200 font-medium">
                              <Clock size={16} className="text-zinc-400 shrink-0" />
                              <span>Sesi ini berjalan pukul <strong>{selectedPaketObj.fixed_start_time} - {selectedPaketObj.fixed_end_time} WIB</strong></span>
                            </div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Terkunci</span>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2.5">
                              <button
                                type="button"
                                onClick={() => setBookingTimingMode('now')}
                                className={`p-3 sm:p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5 ${
                                  bookingTimingMode === 'now'
                                    ? 'bg-nvidia-green/15 border-nvidia-green text-white ring-1 ring-nvidia-green'
                                    : 'bg-[#14161b] border-zinc-700/60 text-zinc-300 hover:border-zinc-400 hover:bg-[#1a1c23] hover:text-white'
                                }`}
                              >
                                <div className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center shrink-0">
                                  {bookingTimingMode === 'now' && <span className="w-2 h-2 rounded-full bg-nvidia-green" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-sm font-bold text-white">Main Sekarang</div>
                                  <div className="text-xs text-zinc-200 mt-0.5 font-medium">Langsung masuk antrean</div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setBookingTimingMode('scheduled')}
                                className={`p-3 sm:p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5 ${
                                  bookingTimingMode === 'scheduled'
                                    ? 'bg-white/10 border-white text-white ring-1 ring-white/40'
                                    : 'bg-[#14161b] border-zinc-700/60 text-zinc-300 hover:border-zinc-400 hover:bg-[#1a1c23] hover:text-white'
                                }`}
                              >
                                <div className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center shrink-0">
                                  {bookingTimingMode === 'scheduled' && <span className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-sm font-bold text-white">Booking Jam Tertentu</div>
                                  <div className="text-xs text-zinc-200 mt-0.5 font-medium">Pilih jam kedatangan</div>
                                </div>
                              </button>
                            </div>

                            {bookingTimingMode === 'scheduled' && (
                              <div className="p-3.5 rounded-xl bg-black/40 border border-white/20 space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
                                    <Clock size={14} className="text-zinc-400" />
                                    Tentukan Jam Mulai Main WIB:
                                  </span>
                                  <span className="text-xs font-mono text-white font-bold bg-white/10 px-2.5 py-0.5 rounded border border-white/20">
                                    {customScheduleTime} WIB
                                  </span>
                                </div>

                                {/* Quick Time Preset Chips */}
                                <div className="space-y-1.5">
                                  <span className="text-xs text-zinc-200 font-semibold block">Pilihan Jam Cepat:</span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {timePresets.map((preset) => {
                                      const isPresetActive = customScheduleTime === preset.value;
                                      return (
                                        <button
                                          key={preset.label}
                                          type="button"
                                          onClick={() => setCustomScheduleTime(preset.value)}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200 flex items-center gap-1 hover:scale-105 active:scale-95 ${
                                            isPresetActive
                                              ? "bg-white text-black shadow-sm"
                                              : "bg-[#16181d] border border-white/10 text-zinc-200 hover:text-white hover:bg-white/10 hover:border-white/30"
                                          }`}
                                        >
                                          <span>{preset.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1.5 border-t border-white/5">
                                  <label className="text-xs text-zinc-200 font-semibold">Atur Jam Manual:</label>
                                  <input
                                    type="time"
                                    value={customScheduleTime}
                                    onChange={e => setCustomScheduleTime(e.target.value)}
                                    className="bg-[#14161b] border border-hairline text-white px-3 py-1.5 rounded-xl text-sm font-mono font-bold focus:border-nvidia-green outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Tiket Pemesanan & Pembayaran */}
                    <div className="lg:col-span-5 xl:col-span-5 mt-3.5 lg:mt-0 lg:sticky lg:top-24">
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#121316] border border-hairline/80 shadow-2xl relative overflow-hidden flex flex-col gap-3.5">
                        <div className="absolute -top-10 -right-10 w-44 h-44 bg-nvidia-green/10 blur-[60px] pointer-events-none rounded-full" />

                        {/* Header Summary - Desktop Only */}
                        <div className="hidden lg:flex items-start justify-between gap-3 pb-3 border-b border-hairline/60 relative z-10">
                          <div>
                            <span className="text-[10px] font-black text-nvidia-green uppercase tracking-widest block mb-0.5">
                              TIKET BOOKING PC
                            </span>
                            <h3 className="text-xl font-black text-white tracking-tight uppercase">
                              {selectedPcObj?.name || selectedPc}
                            </h3>
                          </div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-nvidia-green/20 text-nvidia-green border-nvidia-green/30 shrink-0">
                            Step 2 dari 2
                          </span>
                        </div>

                        {/* Ticket Rows - Desktop Only (On mobile it unnecessarily lengthens the page) */}
                        <div className="hidden lg:block space-y-1.5 text-xs relative z-10">
                          <div className="p-2.5 rounded-lg bg-[#14161b] border border-zinc-700/60 flex justify-between items-center">
                            <span className="text-zinc-300 font-semibold">Pemain:</span>
                            <strong className="text-white font-bold">
                              {playerName.trim() || "Belum diisi"}
                            </strong>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#14161b] border border-zinc-700/60 flex justify-between items-center gap-2">
                            <span className="text-zinc-300 font-semibold shrink-0">Paket Billing:</span>
                            <strong className="text-white font-bold text-right break-words">
                              {selectedPaketVibe ? (selectedPaketVibe.badge ? `${selectedPaketVibe.title} — ${selectedPaketVibe.badge}` : selectedPaketVibe.title) : (selectedPaketObj?.name || "Belum dipilih")}
                            </strong>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#14161b] border border-zinc-700/60 flex justify-between items-center">
                            <span className="text-zinc-300 font-semibold">Durasi Main:</span>
                            <strong className="text-white font-bold">
                              {selectedPaketDuration}
                            </strong>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#14161b] border border-zinc-700/60 flex justify-between items-center">
                            <span className="text-zinc-300 font-semibold">Tipe Sesi:</span>
                            <strong className={`font-bold ${selectedPaketObj?.fixed_start_time || bookingTimingMode === 'scheduled' ? 'text-white' : 'text-nvidia-green'}`}>
                              {selectedPaketObj?.fixed_start_time
                                ? `Jadwal ${selectedPaketObj.fixed_start_time} - ${selectedPaketObj.fixed_end_time} WIB`
                                : bookingTimingMode === 'scheduled'
                                ? `Jadwal Jam ${customScheduleTime} WIB`
                                : 'Main Sekarang'}
                            </strong>
                          </div>
                        </div>

                        {/* Metode Pembayaran Section */}
                        <div className="space-y-2 relative z-10 pt-0 lg:pt-2 border-t-0 lg:border-t border-hairline/60">
                          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
                            METODE PEMBAYARAN
                          </span>

                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentMethod('kasir');
                                setSsFile(null);
                                if (formError) setFormError(null);
                              }}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between ${
                                paymentMethod === 'kasir'
                                  ? 'bg-nvidia-green/15 border-nvidia-green text-white shadow-[0_0_12px_rgba(118,185,0,0.2)] ring-1 ring-nvidia-green'
                                  : 'bg-[#14161b] border-zinc-700/60 text-zinc-300 hover:border-zinc-400 hover:bg-[#1a1c23] hover:text-white shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-1.5">
                                <Banknote size={18} className={paymentMethod === 'kasir' ? 'text-nvidia-green' : 'text-zinc-300'} />
                                {paymentMethod === 'kasir' && (
                                  <div className="w-4 h-4 rounded-full bg-nvidia-green flex items-center justify-center">
                                    <Check size={10} className="text-black font-bold" />
                                  </div>
                                )}
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight block">
                                Tunai ke OP
                              </span>
                              <span className="text-xs text-zinc-200 mt-0.5 leading-normal block font-medium">
                                Bayar di meja OP
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPaymentMethod('qris');
                                if (formError) setFormError(null);
                              }}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between ${
                                paymentMethod === 'qris'
                                  ? 'bg-nvidia-green/15 border-nvidia-green text-white shadow-[0_0_12px_rgba(118,185,0,0.2)] ring-1 ring-nvidia-green'
                                  : 'bg-[#14161b] border-zinc-700/60 text-zinc-300 hover:border-zinc-400 hover:bg-[#1a1c23] hover:text-white shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-1.5">
                                <QrCode size={18} className={paymentMethod === 'qris' ? 'text-nvidia-green' : 'text-zinc-300'} />
                                {paymentMethod === 'qris' && (
                                  <div className="w-4 h-4 rounded-full bg-nvidia-green flex items-center justify-center">
                                    <Check size={10} className="text-black font-bold" />
                                  </div>
                                )}
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight block">
                                QRIS DANA
                              </span>
                              <span className="text-xs text-zinc-200 mt-0.5 leading-normal block font-medium">
                                Scan barcode instan
                              </span>
                            </button>
                          </div>

                          {/* QRIS Info Card */}
                          {paymentMethod === 'qris' && (
                            <div className="p-3 rounded-xl bg-black/60 border border-hairline space-y-2 text-xs">
                              <div className="flex items-center gap-2">
                                <QrCode size={15} className="text-nvidia-green shrink-0" />
                                <span className="text-xs font-bold text-zinc-100 uppercase">
                                  Pembayaran Otomatis
                                </span>
                              </div>
                              <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                                Barcode QRIS bakal muncul otomatis setelah lu klik Konfirmasi. Scan langsung pakai DANA, GoPay, OVO, atau mobile banking apa aja.
                              </p>
                              {danaPaymentStatus === 'waiting' && danaBookingId && (
                                <button
                                  type="button"
                                  onClick={() => setShowQrModal(true)}
                                  className="w-full mt-1.5 py-2 rounded-lg bg-nvidia-green/10 border border-nvidia-green/30 text-nvidia-green text-xs font-bold uppercase hover:bg-nvidia-green/20 transition cursor-pointer"
                                >
                                  Buka Barcode QRIS
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Total Price Box - Desktop Only */}
                        <div className="hidden lg:flex p-3.5 rounded-xl bg-[#14161b] border border-zinc-700/60 items-center justify-between relative z-10 shadow-sm">
                          <div>
                            <div className="text-xs uppercase font-bold text-zinc-200 tracking-wider">Total Tagihan</div>
                            <div className="text-xs text-zinc-300 font-medium">Tanpa biaya admin</div>
                          </div>
                          <div className="text-lg sm:text-xl font-black text-nvidia-green tabular-nums">
                            Rp {(selectedPaketObj?.price || 0).toLocaleString("id-ID")}
                          </div>
                        </div>

                        {/* Action CTA - Desktop Only */}
                        <div className="hidden lg:block pt-2 border-t border-hairline/60 relative z-10 space-y-2">
                          {playerName.trim() && selectedPaket && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 py-1.5 px-3 rounded-lg border border-emerald-500/20"
                            >
                              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                              <span>Semua data lengkap. Siap ambil antrean</span>
                            </motion.div>
                          )}
                          <motion.button
                            whileHover={!loading ? { scale: 1.02 } : {}}
                            whileTap={!loading ? { scale: 0.98 } : {}}
                            disabled={loading}
                            onClick={handlePayment}
                            className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99] ${
                              loading
                                ? "bg-surface-soft text-zinc-500 cursor-not-allowed border border-hairline shadow-none"
                                : !playerName.trim() || !selectedPaket
                                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10 shadow-sm"
                                : "bg-nvidia-green hover:bg-white text-black shadow-[0_0_25px_rgba(118,185,0,0.4)] ring-2 ring-nvidia-green/50 animate-pulse"
                            }`}
                          >
                            {loading ? (
                              <span>Memproses Booking...</span>
                            ) : !playerName.trim() ? (
                              <span>1. Ketik Nickname Dulu</span>
                            ) : !selectedPaket ? (
                              <span>2. Pilih Paket Billing Dulu</span>
                            ) : (
                              <>
                                <span>Konfirmasi & Ambil Antrean</span>
                                <ArrowRight size={15} />
                              </>
                            )}
                          </motion.button>
                          <div className="text-center text-xs text-zinc-300 font-medium">
                            Antrean otomatis masuk dan langsung muncul di layar OP
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Fixed Bottom Action Bar for Step 2 */}
                  <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f1013]/95 border-t border-hairline px-4 py-3 backdrop-blur-xl flex items-center justify-between gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-300 font-semibold uppercase tracking-wider">Total:</span>
                        <span className="text-xs text-zinc-200 font-bold truncate">
                          {selectedPaketVibe ? (selectedPaketVibe.badge ? `${selectedPaketVibe.title} — ${selectedPaketVibe.badge}` : selectedPaketVibe.title) : 'Pilih paket'}
                        </span>
                      </div>
                      <span className="text-base font-black text-nvidia-green tabular-nums">
                        Rp {(selectedPaketObj?.price || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <motion.button
                      whileTap={!loading ? { scale: 0.95 } : {}}
                      disabled={loading}
                      onClick={handlePayment}
                      className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                        loading
                          ? "bg-surface-soft text-zinc-600 cursor-not-allowed border border-hairline"
                          : !playerName.trim() || !selectedPaket
                          ? "bg-zinc-800 text-zinc-300 border border-white/10"
                          : "bg-nvidia-green text-black hover:bg-white shadow-[0_0_20px_rgba(118,185,0,0.4)] ring-1 ring-white/50"
                      }`}
                    >
                      <span>
                        {loading
                          ? "Memproses..."
                          : !playerName.trim()
                          ? "Isi Nama"
                          : !selectedPaket
                          ? "Pilih Paket"
                          : "Konfirmasi"}
                      </span>
                      <ArrowRight size={14} className={playerName.trim() && selectedPaket ? "animate-pulse" : ""} />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* ── 3D COVERFLOW PC SPECS ── */}
      <motion.section
        id="showcase"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="relative z-20 py-12 md:py-16 flex flex-col justify-center border-t border-hairline overflow-hidden bg-gradient-to-b from-surface-dark to-black"
      >
        <div className="max-w-[1280px] w-full mx-auto relative z-10">
          <motion.div variants={itemVariants} className="text-center mb-8 px-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white uppercase tracking-tight">SPESIFIKASI PC GC NET</h2>
            <p className="text-white/60 tracking-tight text-xs sm:text-sm mt-1 max-w-lg mx-auto">Performa stabil untuk kebutuhan gaming harian. Geser untuk melihat spesifikasi detail setiap unit PC.</p>
          </motion.div>

          {mounted && (
            <PCCarousel 
              pcs={db.pcs || []} 
              onSelectPc={(pcId) => {
                handlePcClick(pcId);
                setBookingStep(1);
                setTimeout(() => {
                  const elem = document.getElementById("booking");
                  if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 60);
              }}
            />
          )}

          {/* Efek Game Premium (Jiwa Gamer) */}
          <motion.div
            variants={itemVariants}
            className="mt-8 px-4 flex flex-wrap justify-center gap-4 md:gap-8 opacity-90"
          >
            <GameIcons isMobile={isMobile} />
          </motion.div>
        </div>

        {/* Background glow ampas */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-nvidia-green/10 blur-[80px] pointer-events-none" />
      </motion.section>

      {/* ── Terms & Conditions Modal ── */}
      <AnimatePresence>
        {showTcModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            {/* Backdrop Blur */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer" onClick={() => setShowTcModal(false)} />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, y: 20, rotateX: 10 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.9, y: 20, rotateX: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-2xl nvidia-card bg-black/80 border-nvidia-green/30 shadow-[0_0_50px_rgba(118,185,0,0.15)] overflow-hidden"
              style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
            >
              {/* Corner Accents */}
              <div className="absolute -top-3 -right-3 w-10 h-10 border-t-2 border-r-2 border-nvidia-green/50" />
              <div className="absolute -bottom-3 -left-3 w-10 h-10 border-b-2 border-l-2 border-nvidia-green/50" />

              {/* Inner Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-nvidia-green/10 blur-[80px] rounded-full pointer-events-none" />

              <div className="relative z-10 p-6 md:p-8 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center border-b border-hairline pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-nvidia-green tracking-tight uppercase tracking-widest flex items-center gap-3">
                    <span className="w-2 h-6 bg-nvidia-green shadow-[0_0_10px_rgba(118,185,0,0.8)] animate-pulse" />
                    Peraturan GC Net
                  </h2>
                  <button
                    onClick={() => setShowTcModal(false)}
                    className="text-white/50 hover:text-white transition-colors p-2"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar tracking-tight text-sm text-white/70 space-y-4">
                  <div className="p-4 bg-white/[0.03] border border-hairline rounded-[2px] group hover:bg-nvidia-green/10 transition-colors">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Clock size={20} className="text-nvidia-green shrink-0" /> Ketepatan Waktu</h3>
                    <p>Batas toleransi kedatangan adalah 5 menit. Jika lewat, durasi billing otomatis berjalan atau unit PC dialihkan ke antrean berikutnya.</p>
                  </div>
                  <div className="p-4 bg-white/[0.03] border border-hairline rounded-[2px] group hover:bg-nvidia-green/10 transition-colors">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Crown size={20} className="text-nvidia-green shrink-0" /> Prioritas Antrean</h3>
                    <p>Booking online digunakan untuk mengantre PC. Pelanggan yang datang langsung tetap dilayani jika unit kosong. Pastikan sudah tiba di lokasi sebelum giliran main tiba.</p>
                  </div>
                  <div className="p-4 bg-white/[0.03] border border-hairline rounded-[2px] group hover:bg-nvidia-green/10 transition-colors">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2"><UtensilsCrossed size={20} className="text-nvidia-green shrink-0" /> Makanan & Minuman</h3>
                    <p>Dilarang membawa makanan atau minuman dari luar yang berisiko mengotori meja dan perangkat PC. Snack dan minuman dingin tersedia di meja kasir.</p>
                  </div>
                  <div className="p-4 bg-white/[0.03] border border-hairline rounded-[2px] group hover:bg-nvidia-green/10 transition-colors">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Ban size={20} className="text-nvidia-green shrink-0" /> Area Bebas Asap</h3>
                    <p>Seluruh ruangan PC ber-AC bebas asap rokok dan vape. Silakan gunakan area luar yang sudah disediakan.</p>
                  </div>
                  <div className="p-4 bg-white/[0.03] border border-hairline rounded-[2px] group hover:bg-nvidia-green/10 transition-colors">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Banknote size={20} className="text-nvidia-green shrink-0" /> Kebijakan Refund</h3>
                    <p>Paket booking atau durasi billing yang sudah berjalan tidak dapat dibatalkan atau di-refund. Pastikan pilihan PC dan paket billing sudah sesuai sebelum bayar.</p>
                  </div>
                  <div className="p-4 bg-white/[0.03] border border-hairline rounded-[2px] group hover:bg-nvidia-green/10 transition-colors">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2"><AlertTriangle size={20} className="text-nvidia-green shrink-0" /> Fair Play & Keamanan</h3>
                    <p>Dilarang menggunakan cheat, software berbahaya, atau membuka situs terlarang. Pelanggaran akan menyebabkan sesi dihentikan seketika.</p>
                  </div>
                  <div className="p-4 bg-white/[0.03] border border-hairline rounded-[2px] group hover:bg-nvidia-green/10 transition-colors">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Sparkles size={20} className="text-nvidia-green shrink-0" /> Kebersihan Meja</h3>
                    <p>Harap menjaga kebersihan area meja dan membuang sampah pada tempatnya setelah selesai bermain.</p>
                  </div>
                  <div className="p-4 bg-white/[0.03] border border-hairline rounded-[2px] group hover:bg-nvidia-green/10 transition-colors">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Monitor size={20} className="text-nvidia-green shrink-0" /> Instalasi Game</h3>
                    <p>Dilarang menginstal software tanpa izin. Jika membutuhkan update atau request game baru, hubungi operator yang bertugas.</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-hairline flex justify-end">
                  <button
                    onClick={() => setShowTcModal(false)}
                    className="px-8 py-3 bg-nvidia-green text-black font-bold tracking-tight text-sm uppercase tracking-wider rounded-lg hover:bg-[#88d600] shadow-[0_0_20px_rgba(118,185,0,0.3)] transition-all"
                  >
                    Saya Mengerti
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Polished Queue Warning Modal ── */}
      <AnimatePresence>
        {showQueueWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setShowQueueWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-[360px] bg-[#121316] border border-amber-500/30 rounded-xl p-4 sm:p-5 shadow-[0_0_40px_rgba(245,158,11,0.12)] space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertCircle size={22} className="text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-0.5">
                    PERINGATAN ANTREAN
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                    PC SEDANG RAMAI
                  </h3>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-xs text-zinc-200 leading-relaxed">
                Saat ini sudah ada <strong className="text-white font-bold">{db?.bookings?.filter(b => b.pc_id === selectedPc).length} pemain</strong> yang mengantre di PC ini.
                Jika lu memilih main sekarang, giliran lu akan masuk antrean berikutnya. Atau lu juga bisa memilih booking untuk jam tertentu di langkah berikutnya.
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQueueWarning(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition"
                >
                  Pilih PC Lain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    ensureSensiblePaketSelection();
                    setShowQueueWarning(false);
                    setBookingStep(2);
                    setTimeout(() => {
                      const elem = document.getElementById("booking");
                      if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 60);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition shadow-sm"
                >
                  Tetap Lanjut Antre
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Polished Success Confirmation Modal ── */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-[370px] bg-[#121316] border border-white/15 rounded-xl p-4 sm:p-5 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-nvidia-green/15 blur-[60px] pointer-events-none rounded-full" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-nvidia-green/10 blur-[60px] pointer-events-none rounded-full" />

              {/* Header */}
              <div className="relative z-10 flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-nvidia-green/15 border border-nvidia-green/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(118,185,0,0.2)]">
                    <CheckCircle2 size={24} className="text-nvidia-green stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-nvidia-green uppercase tracking-widest block mb-0.5">
                      TIKET TERKONFIRMASI
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                      BOOKING BERHASIL
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 flex items-center justify-center transition shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Ticket Code Box */}
              {latestBookingCode && (
                <div className="relative z-10 p-3.5 mb-4 rounded-xl bg-black/60 border border-nvidia-green/30 flex items-center justify-between shadow-[0_0_20px_rgba(118,185,0,0.08)]">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">
                      KODE TIKET ANTREAN
                    </span>
                    <span className="text-lg sm:text-xl font-black text-nvidia-green font-mono tracking-widest">
                      {latestBookingCode}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-nvidia-green/15 text-nvidia-green border border-nvidia-green/30 tracking-wider">
                    VALID
                  </span>
                </div>
              )}

              {/* Structured Booking Details */}
              {lastBookingReceipt && (
                <div className="relative z-10 p-3.5 mb-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-medium">Pemain:</span>
                    <span className="font-extrabold text-white uppercase">{lastBookingReceipt.playerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-medium">Unit Target PC:</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-nvidia-green text-black font-black text-xs uppercase tracking-wide">
                      <Monitor size={11} className="stroke-[2.5]" />
                      {lastBookingReceipt.pcName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-medium">Paket Billing:</span>
                    <span className="font-semibold text-zinc-200">{lastBookingReceipt.paketName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-medium">Tarif:</span>
                    <span className="font-extrabold text-nvidia-green tabular-nums">
                      Rp {lastBookingReceipt.price.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-medium">Sesi Main:</span>
                    <span className="font-semibold text-white">{lastBookingReceipt.scheduleText}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                    <span className="text-zinc-400 font-medium">Metode Bayar:</span>
                    <span className="font-bold text-zinc-300 uppercase">{lastBookingReceipt.paymentMethod}</span>
                  </div>
                </div>
              )}

              <p className="relative z-10 text-xs text-zinc-300 leading-relaxed mb-5">
                Antrean lu otomatis masuk ke sistem live. Tunjukkan kode tiket di atas ke operator kasir saat giliran main tiba.
              </p>

              {/* Action Buttons */}
              <div className="relative z-10 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    const elem = document.getElementById("antrean");
                    if (elem) elem.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-nvidia-green hover:bg-[#88d600] text-black text-xs font-black uppercase tracking-wider transition shadow-[0_0_20px_rgba(118,185,0,0.3)] flex items-center justify-center gap-1.5"
                >
                  <span>Pantau Antrean</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="nvidia-card p-8 w-full max-w-sm relative flex flex-col items-center border-nvidia-green/50 shadow-[0_0_40px_rgba(118,185,0,0.15)]"
            >
              <div className="nvidia-corner bg-nvidia-green"></div>
              <h2 className="text-xl font-bold tracking-tight text-white mb-2 uppercase tracking-widest text-center">MEMPROSES BOOKING</h2>
              <p className="text-xs text-zinc-300 font-medium mb-4 uppercase tracking-wider text-center">Tunggu sebentar...</p>
              <div className="w-12 h-12 border-4 border-nvidia-green/20 border-t-nvidia-green rounded-full animate-spin"></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
