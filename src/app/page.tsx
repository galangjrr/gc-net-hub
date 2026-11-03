"use client";

import { motion, AnimatePresence, Variants } from "motion/react";
import { Monitor, ArrowRight, CheckCircle2, Sparkles, Clock, User, Crown, UtensilsCrossed, Ban, Banknote, AlertTriangle, Check, X, Hourglass, Flame } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { DatabaseSchema, PC, Paket } from "@/lib/db";
import { pcWaitMinutes, billingStale } from "@/lib/booking-rules";
import { supabase } from "@/lib/supabase";
import { memberFetch } from "@/lib/member-fetch";
import PCCarousel from "@/components/pc-carousel";
import GameIcons from "@/components/game-icons";
import PriceList from "@/components/price-list";
import DurationCalc from "@/components/duration-calc";

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

export default function Home() {
  const router = useRouter();
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [activeSection, setActiveSection] = useState("home");
  // pingPong removed — replaced by CSS .animate-game-ping class
  const [isMobile, setIsMobile] = useState(false);
  const [showTcModal, setShowTcModal] = useState(false);
  const [antreanSearch, setAntreanSearch] = useState("");
  const [antreanCategoryTab, setAntreanCategoryTab] = useState<'all' | 'now' | 'scheduled'>('all');
  const triggeredExpiredPcIds = useRef<Set<string>>(new Set());

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

  const loadData = async () => {
    const res = await fetch("/api/data");
    const data = await res.json();
    setDb(data);
  };

  useEffect(() => {
    setMounted(true);
    loadData();
    // pcs changes arrive via realtime; this poll catches bookings and is paused while the tab is hidden
    const interval = setInterval(() => { if (!document.hidden) loadData(); }, 30000);

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
        fetchMemberProfile(session.access_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setMemberSession(session?.user || null);
      if (session?.user) {
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
        const antreanEl = document.getElementById("antrean");
        const showcaseEl = document.getElementById("showcase");

        const scrollY = window.scrollY;
        const innerHeight = window.innerHeight;
        const scrollHeight = document.documentElement.scrollHeight;

        // Mentok bawah dengan toleransi 200px
        const isAtBottom = Math.ceil(scrollY + innerHeight) >= scrollHeight - 200;

        if (isAtBottom || (showcaseEl && showcaseEl.getBoundingClientRect().top < innerHeight * 0.8)) {
          setActiveSection("showcase");
        } else if (antreanEl && antreanEl.getBoundingClientRect().top < innerHeight * 0.5) {
          setActiveSection("antrean");
        } else if ((document.getElementById("harga")?.getBoundingClientRect().top ?? Infinity) < innerHeight * 0.5) {
          setActiveSection("harga");
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
      subscription.unsubscribe();
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


  const totalPcs = db?.pcs?.length || 0;
  const bookedPcsCount = db?.pcs?.filter(pc => (pc.status === 'occupied' || Boolean(pc.expected_empty_time)) || db?.bookings?.some(b => b.pc_id === pc.id)).length || 0;

  // ── Memoized computed data (avoid recompute on every polling render) ──

  const scrollToSection = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToAntrean = scrollToSection("antrean");
  const scrollToShowcase = scrollToSection("showcase");

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

  if (!db) return <div suppressHydrationWarning className="min-h-screen bg-surface-dark p-8 tracking-tight text-white/50">INITIALIZING SYSTEM...</div>;


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
            { id: "harga", label: "HARGA", fn: scrollToSection("harga") },
            { id: "antrean", label: "STATUS ANTREAN", fn: scrollToAntrean },
            { id: "booking", label: "BOOKING", href: "/booking" },
            { id: "showcase", label: "PC SHOWCASE", fn: scrollToShowcase }
          ].map((item: { id: string; label: string; fn?: (e: React.MouseEvent<HTMLAnchorElement>) => void; href?: string }) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={item.href ?? `#${item.id}`}
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
                    {myActiveBooking.status === "active" ? "Lagi Main" : "Lunas, Antre"}
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
                    <Link
                      href={`/booking/${myActiveBooking.id}`}
                      className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider transition"
                    >
                      Lihat Status →
                    </Link>
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
                  <Link
                    href="/booking"
                    className="px-2.5 py-1 rounded-md bg-nvidia-green text-black text-[10px] font-black uppercase tracking-wider hover:bg-white transition shadow-[0_0_10px_rgba(118,185,0,0.25)]"
                  >
                    Booking & Main
                  </Link>
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
                <span>Bayar online QRIS, GoPay, atau ShopeePay, langsung dapet nomor antrean.</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                <div className="w-4 h-4 rounded-full bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center shrink-0">
                  <Check className="text-nvidia-green" size={10} />
                </div>
                <span>Bayar di kasir juga bisa, nomor antrean keluar pas OP terima uang.</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                <div className="w-4 h-4 rounded-full bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center shrink-0">
                  <Check className="text-nvidia-green" size={10} />
                </div>
                <span>Yang bayar duluan dilayani duluan. Belum bayar, booking hangus sendiri.</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 items-center">
              <Link
                href="/booking"
                className="nvidia-button group gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg shadow-[0_0_20px_rgba(118,185,0,0.25)] transition active:scale-[0.98]"
              >
                <span>Booking Sekarang</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>

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

      {/* ── Daftar Harga ── */}
      <section id="harga" aria-labelledby="harga-title" className="relative z-20 py-8 md:py-14 border-b border-hairline bg-surface-dark/50 scroll-mt-16">
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6">
          <div className="text-center mb-6 md:mb-8">
            <h2 id="harga-title" className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight uppercase mb-2">DAFTAR HARGA PAKET BILLING</h2>
            <p className="text-xs sm:text-sm text-zinc-300 tracking-tight max-w-lg mx-auto">Pilih paket yang paling pas buat lu, klik buat langsung booking.</p>
          </div>
          <div className="flex flex-col gap-8">
            <DurationCalc pakets={db.pakets || []} />
            <PriceList pakets={db.pakets || []} isMobile={isMobile} />
          </div>
        </div>
      </section>

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

                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider shrink-0 ${b.payment_status === 'paid' ? 'bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                        {b.payment_method === 'online' ? 'LUNAS ONLINE' : 'LUNAS TUNAI'}
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
              waits={Object.fromEntries((db.pcs || []).map((pc) => [pc.id, pcWaitMinutes(pc, db.bookings || [], db.pakets || [], now)]))}
              stale={billingStale(db.settings?.pc_synced_at, now)}
              onSelectPc={(pcId) => router.push(`/booking?pc=${encodeURIComponent(pcId)}`)}
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


    </div>
  );
}
