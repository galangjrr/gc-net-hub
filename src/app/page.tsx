"use client";

import { motion, AnimatePresence, Variants } from "motion/react";
import { Monitor, ArrowRight, Gamepad2, AlertCircle, CheckCircle2, Crosshair, Upload, ChevronLeft, ChevronRight, Sparkles, Clock, User, Package, Crown, UtensilsCrossed, Ban, Banknote, AlertTriangle, Star, Check, X, Hourglass, Play, QrCode, Flame } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { DatabaseSchema, PC, Paket } from "@/lib/db";
import { supabase } from "@/lib/supabase";
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

export default function Home() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [selectedPc, setSelectedPc] = useState<string | null>(null);
  const [selectedPaket, setSelectedPaket] = useState<string | null>(null);
  const [searchPaket, setSearchPaket] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [ssFile, setSsFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'kasir'>('qris');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  // pingPong removed — replaced by CSS .animate-game-ping class
  const [isMobile, setIsMobile] = useState(false);
  const [activeCategory, setActiveCategory] = useState(1);
  const [showTcModal, setShowTcModal] = useState(false);
  const [showQueueWarning, setShowQueueWarning] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<1 | 2>(1);
  const [antreanSearch, setAntreanSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const triggeredExpiredPcIds = useRef<Set<string>>(new Set());

  const selectedPaketObj = useMemo(() => {
    if (!selectedPaket) return null;
    if (selectedPaket.startsWith("custom-")) {
      const price = parseInt(selectedPaket.replace("custom-", "")) || 0;
      const mins = Math.floor(price / 4000 * 60);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const timeStr = [h > 0 ? `${h}j` : '', m > 0 ? `${m}m` : ''].filter(Boolean).join(' ') || '0m';
      return { id: selectedPaket, name: `Paket Custom (± ${timeStr})`, price };
    }
    return db?.pakets?.find(p => p.id === selectedPaket) || null;
  }, [selectedPaket, db?.pakets]);

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



    // Throttled scroll handler (fires max every 100ms instead of every frame)
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

  const totalPcs = db?.pcs?.length || 0;
  const bookedPcsCount = db?.pcs?.filter(pc => (pc.status === 'occupied' || Boolean(pc.expected_empty_time)) || db?.bookings?.some(b => b.pc_id === pc.id)).length || 0;

  const handlePcClick = (pcId: string) => {
    setSelectedPc(pcId);
    if (db?.pakets && db.pakets.length > 0) {
      setSelectedPaket(db.pakets[0].id);
    }
  };

  const handleNextStep = () => {
    const selectedPcBookings = db?.bookings?.filter(b => b.pc_id === selectedPc) || [];
    const targetPc = db?.pcs?.find(p => p.id === selectedPc);
    const hasActiveTimer = targetPc?.expected_empty_time && new Date(targetPc.expected_empty_time).getTime() > Date.now();
    if (selectedPcBookings.length > 0 || hasActiveTimer) {
      setShowQueueWarning(true);
      return;
    }
    setBookingStep(2);
  };

  const handlePayment = async () => {
    setFormError(null);
    const trimmedName = playerName.trim();
    if (!selectedPc || !selectedPaket || !trimmedName) {
      setFormError("Lengkapi data: pilih PC, paket, dan isi nama panggilan lu");
      return;
    }
    if (paymentMethod === 'qris' && !ssFile) {
      setFormError("Wajib upload bukti transfer DANA jika memilih QRIS");
      return;
    }
    if (paymentMethod === 'qris' && ssFile && !ssFile.type.startsWith('image/')) {
      setFormError("Bukti transfer wajib berupa file gambar JPG atau PNG");
      return;
    }
    // Validasi ukuran file max 2MB
    if (paymentMethod === 'qris' && ssFile && ssFile.size > 2 * 1024 * 1024) {
      setFormError("Ukuran file bukti transfer maksimal 2MB");
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

      // Check if db.pakets already has this exact custom package
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

    const sendBooking = async (base64SS?: string) => {
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pc_id: selectedPc,
            paket_id: finalPaketId,
            player_name: trimmedName,
            ss_bukti: paymentMethod === 'qris' ? base64SS : undefined
          })
        });
        const resData = await res.json();
        if (!res.ok) {
          setFormError(resData?.error || "Gagal membuat booking. Silakan coba lagi.");
          setLoading(false);
          return;
        }
        setShowSuccessModal(true);
        setPlayerName("");
        setSsFile(null);
        setBookingStep(1);
        setLoading(false);
        loadData();
      } catch (err: any) {
        setFormError("Terjadi kesalahan jaringan saat mengirim booking");
        setLoading(false);
      }
    };

    if (paymentMethod === 'qris' && ssFile) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64SS = reader.result as string;
        await sendBooking(base64SS);
      };
      reader.onerror = () => {
        setFormError("Gagal membaca file gambar screenshot");
        setLoading(false);
      };
      reader.readAsDataURL(ssFile);
    } else {
      await sendBooking();
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

  const getSlangName = useCallback((price: number, originalName: string) => {
    if (price === 5000) return "Paket Goceng";
    if (price === 10000) return "Paket Ceban";
    if (price === 3000) return "Paket 3 Ribu";
    if (price === 9000) return "Paket 9 Ribu";
    if (price === 15000) return "Paket 15 Ribu";
    return originalName.replace(/rp\.?\s*/i, "Paket ");
  }, []);

  const formatDuration = useCallback((mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} Jam ${m} Menit`;
    if (h > 0) return `${h} Jam`;
    return `${m} Menit`;
  }, []);

  const filteredBookings = useMemo(() => {
    if (!db?.bookings) return [];
    return db.bookings.filter((b) => {
      const pc = db.pcs?.find((p) => p.id === b.pc_id);
      const playerName = b.player_name || "";
      const pcName = pc?.name || b.pc_id || "";
      const search = (antreanSearch || "").toLowerCase();
      return playerName.toLowerCase().includes(search) || pcName.toLowerCase().includes(search);
    });
  }, [db?.bookings, db?.pcs, antreanSearch]);

  const CAROUSEL_THEMES = useMemo(() => [
    {
      glow: "bg-cyan-500/10", border: "border-cyan-500", border30: "border-cyan-500/30",
      text: "text-cyan-500", bg: "bg-cyan-500",
      shadow: "shadow-[0_0_15px_rgba(6,182,212,0.2)]", shadowHover: "group-hover:shadow-[0_0_60px_rgba(6,182,212,0.3)]",
      hoverBorder: "hover:border-cyan-500/50", hoverBgGlow: "hover:bg-cyan-500/5",
    },
    {
      glow: "bg-[#76b900]/10", border: "border-[#76b900]", border30: "border-[#76b900]/30",
      text: "text-[#76b900]", bg: "bg-[#76b900]",
      shadow: "shadow-[0_0_15px_rgba(118,185,0,0.2)]", shadowHover: "group-hover:shadow-[0_0_60px_rgba(118,185,0,0.3)]",
      hoverBorder: "hover:border-[#76b900]/50", hoverBgGlow: "hover:bg-[#76b900]/5",
    },
    {
      glow: "bg-purple-500/10", border: "border-purple-500", border30: "border-purple-500/30",
      text: "text-purple-500", bg: "bg-purple-500",
      shadow: "shadow-[0_0_15px_rgba(168,85,247,0.2)]", shadowHover: "group-hover:shadow-[0_0_60px_rgba(168,85,247,0.3)]",
      hoverBorder: "hover:border-purple-500/50", hoverBgGlow: "hover:bg-purple-500/5",
    }
  ], []);

  const CAROUSEL_DATA = useMemo(() => [
    { id: "nominal", title: "Paket Nominal", items: hargaPakets, type: "harga" },
    { id: "reguler", title: "Paket Reguler", items: generatedJamPakets, type: "jam" },
    { id: "spesial", title: "Paket Spesial", items: spesialPakets, type: "spesial" }
  ], [hargaPakets, generatedJamPakets, spesialPakets]);

  if (!db) return <div className="min-h-screen bg-surface-dark p-8 tracking-tight text-white/50">INITIALIZING SYSTEM...</div>;

  const selectedPcObj = db.pcs?.find(p => p.id === selectedPc);

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
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-error transition-colors"
              >
                TUTUP
              </button>
              <div className="nvidia-corner bg-nvidia-green"></div>

              <h2 className="text-xl font-bold tracking-tight text-white mb-2 uppercase tracking-widest text-center">Scan QRIS</h2>
              <p className="text-[10px] tracking-tight text-white/50 mb-4 uppercase tracking-wider text-center">Pembayaran menggunakan DANA / QRIS</p>

              {selectedPaket && (
                <div className="w-full bg-black/40 border border-nvidia-green/30 rounded p-3 mb-6 flex flex-col items-center">
                  <span className="text-[10px] text-white/60 tracking-tight uppercase tracking-widest mb-1">Total Tagihan</span>
                  <span className="text-2xl font-bold text-nvidia-green tracking-tight drop-shadow-[0_0_8px_rgba(118,185,0,0.5)]">
                    RP {(selectedPaket.startsWith('custom-') ? parseInt(selectedPaket.replace('custom-', '')) : db?.pakets?.find(p => p.id === selectedPaket)?.price || 0).toLocaleString("id-ID")}
                  </span>
                </div>
              )}

              <div className="w-48 h-48 mx-auto flex items-center justify-center mb-6 rounded-[2px] overflow-hidden border border-nvidia-green bg-black p-2 shadow-[0_0_15px_rgba(118,185,0,0.3)]">
                <img src="/qris.png" alt="QRIS DANA" className="w-full h-full object-contain" />
              </div>

              <div className="w-full flex gap-3">
                <a
                  href="/qris.png"
                  download="QRIS_DANA.png"
                  className="flex-1 text-center bg-transparent border border-nvidia-green text-nvidia-green hover:bg-nvidia-green hover:text-black font-bold tracking-tight text-xs py-3 rounded-[2px] transition-colors uppercase tracking-widest"
                >
                  Download
                </a>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="flex-1 nvidia-button uppercase text-xs tracking-widest"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Immersive Gamer Hero Vibe Coder Edition ── */}
      <section className="relative min-h-[60vh] md:min-h-[70vh] w-full flex items-center border-b border-white/5 overflow-hidden">
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

        <div className="max-w-[1400px] w-full mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">

          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl flex-1 mt-10 md:mt-0"
          >
            {/* Mobile Hero Logo */}
            <div className="md:hidden flex items-center justify-start mb-8 h-24 w-24 relative">
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
            <div className="flex items-center gap-3 mb-6 bg-[#16171b] border border-hairline shadow-sm w-max px-4 py-1.5 rounded-full">
              <span className="flex items-center justify-center w-2 h-2">
                <span className="absolute inline-flex h-2 w-2 rounded-full bg-nvidia-green animate-ping opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-nvidia-green shadow-[0_0_10px_rgba(118,185,0,1)]"></span>
              </span>
              <span className="text-[11px] font-bold text-white uppercase tracking-widest tracking-tight">
                System Online • {totalPcs} Units Ready
              </span>
            </div>

            <motion.h1
              className="text-4xl md:text-7xl font-bold tracking-tighter leading-[0.95] text-white mb-6 uppercase tracking-tight drop-shadow-2xl"
            >
              BOOKING DULU.<br />
              <span className="whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-nvidia-green to-emerald-300 drop-shadow-[0_0_20px_rgba(118,185,0,0.3)]">
                BARU MASUK ANTREAN.
              </span>
            </motion.h1>

            {/* Mobile Compact Live PC Status */}
            <div className="md:hidden flex items-center justify-between p-3.5 rounded-xl bg-[#121316] border border-hairline mb-6 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <Monitor size={16} className="text-nvidia-green" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">Status PC</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
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
            <div className="bg-[#121316]/90 border border-hairline border-l-2 border-l-nvidia-green/80 p-4 rounded-xl mb-8 max-w-[480px] space-y-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-xs md:text-sm text-zinc-300">
                <div className="w-5 h-5 rounded-full bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center shrink-0">
                  <Check className="text-nvidia-green" size={12} />
                </div>
                <span>Saat PC penuh, wajib catat antrean booking.</span>
              </div>
              <div className="flex items-center gap-3 text-xs md:text-sm text-zinc-300">
                <div className="w-5 h-5 rounded-full bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center shrink-0">
                  <Check className="text-nvidia-green" size={12} />
                </div>
                <span>Pemain yang datang langsung ke meja kasir tetap prioritas.</span>
              </div>
              <div className="flex items-center gap-3 text-xs md:text-sm text-zinc-300">
                <div className="w-5 h-5 rounded-full bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center shrink-0">
                  <Check className="text-nvidia-green" size={12} />
                </div>
                <span>Kasir konfirmasi, pantau posisi antrean, giliran main tiba.</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3.5 items-center">
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="#booking"
                onClick={scrollToBooking}
                className="nvidia-button group gap-2.5 px-6 py-3 rounded-xl shadow-[0_0_25px_rgba(118,185,0,0.3)] transition"
              >
                <span>Booking Sekarang</span>
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </motion.a>

              <button
                onClick={() => setShowTcModal(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#16171b] hover:bg-[#1f2126] text-zinc-300 hover:text-white border border-hairline rounded-xl font-bold text-xs uppercase tracking-wider transition backdrop-blur-sm"
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
            <div className="p-6 w-[320px] bg-[#121316]/95 backdrop-blur-xl border border-hairline rounded-xl relative shadow-2xl">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-hairline">
                <div className="flex items-center gap-2.5">
                  <Monitor size={18} className="text-nvidia-green" />
                  <h3 className="text-xs font-bold text-white tracking-wider uppercase">Status Ketersediaan PC</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-nvidia-green/10 border border-nvidia-green/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-nvidia-green animate-pulse" />
                  <span className="text-[10px] font-bold text-nvidia-green uppercase tracking-wide">Live</span>
                </div>
              </div>

              <div className="space-y-4 text-xs">
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
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1.5 font-medium">
                    <span>Keterisian PC</span>
                    <span className="tabular-nums font-bold text-white">
                      {totalPcs > 0 ? Math.round((bookedPcsCount / totalPcs) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden border border-hairline">
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
        className="relative z-20 py-10 md:py-20 border-b border-hairline bg-surface-dark/50 scroll-mt-16 md:min-h-[90vh]"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="max-w-[1400px] w-full mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tighter uppercase tracking-tight mb-4">DAFTAR HARGA</h2>
            <p className="text-white/50 tracking-tight max-w-xl mx-auto">Pilih paket booking sesuai dengan kebutuhanmu. Tersedia paket regular dan paket spesial.</p>
          </div>

          <div className="flex flex-col gap-12">

            {/* Note Tambahan Informatif (Redesigned) */}
            <motion.div
              className="nvidia-card max-w-4xl mx-auto w-full p-[1px] relative overflow-hidden group mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              {/* Animated glowing border effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-nvidia-green/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -translate-x-full group-hover:translate-x-full" />

              <div className="bg-black/90 backdrop-blur-xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4 w-full">
                  <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
                    <div className="absolute inset-0 bg-nvidia-green/20 blur-[10px] rounded-full animate-pulse" />
                    <Clock size={24} className="text-nvidia-green relative z-10" />
                  </div>
                  <div>
                    <h4 className="tracking-tight font-bold text-nvidia-green tracking-widest uppercase mb-1">Custom Durasi Fleksibel</h4>
                    <p className="text-xs md:text-sm text-white/60 tracking-tight">Bisa nambah waktu semaumu! <strong className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">Rp 2.000 / 30 Menit</strong>.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 3D Hero Selection Carousel matched to pc-carousel.tsx */}
            <div ref={carouselRef} className="relative w-full max-w-[1200px] mx-auto h-[750px] md:h-[850px] flex items-center justify-center overflow-hidden" style={{ perspective: "1200px" }}>

              {/* Background Glow */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] ${CAROUSEL_THEMES[activeCategory].glow} blur-[120px] rounded-full pointer-events-none transition-colors duration-1000`} />

              {/* Navigation Buttons */}
              <button
                onClick={() => setActiveCategory(prev => Math.max(prev - 1, 0))}
                disabled={activeCategory === 0}
                className={`absolute left-2 md:left-12 z-50 w-12 h-12 flex items-center justify-center rounded-[2px] border transition-all 
                  ${activeCategory === 0
                    ? "bg-black/20 border-white/10 text-white/20 cursor-not-allowed"
                    : `bg-black/50 ${CAROUSEL_THEMES[activeCategory].border30} ${CAROUSEL_THEMES[activeCategory].text} hover:bg-white/10`}`}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => setActiveCategory(prev => Math.min(prev + 1, 2))}
                disabled={activeCategory === 2}
                className={`absolute right-2 md:right-12 z-50 w-12 h-12 flex items-center justify-center rounded-[2px] border transition-all 
                  ${activeCategory === 2
                    ? "bg-black/20 border-white/10 text-white/20 cursor-not-allowed"
                    : `bg-black/50 ${CAROUSEL_THEMES[activeCategory].border30} ${CAROUSEL_THEMES[activeCategory].text} hover:bg-white/10`}`}
              >
                <ChevronRight size={24} />
              </button>

              {/* Carousel Track */}
              <div className="relative w-full h-full flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
                <AnimatePresence initial={false}>
                  {CAROUSEL_DATA.map((category, index) => {
                    let offset = index - activeCategory;
                    const isActive = offset === 0;
                    const theme = CAROUSEL_THEMES[index];

                    const offsetX = isMobile ? 180 : 350;
                    const x = offset * offsetX;
                    const y = isActive ? 0 : Math.abs(offset) * 20;
                    const rotateY = offset * -45;
                    const rotateX = 0;
                    const rotateZ = 0;
                    const scale = isActive ? 1 : 0.8;
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
                          animate={isActive ? { y: [-8, 8, -8] } : { y: 0 }}
                          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                          className="w-full h-full flex items-center justify-center"
                        >
                          <div className={`relative w-[300px] md:w-[350px] ${!isActive ? "cursor-pointer" : ""}`}>

                            {/* Breathing Aura */}
                            {isActive && (
                              <motion.div
                                animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.05, 1] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className={`absolute inset-0 rounded-full blur-[60px] -z-10 ${theme.glow}`}
                              />
                            )}

                            {/* Main Card */}
                            <div className={`nvidia-card p-6 md:p-8 flex flex-col w-full h-fit bg-black/50 backdrop-blur-sm border ${theme.border30} ${theme.shadow} ${theme.shadowHover} transition-shadow duration-500`}>

                              <div className={`absolute -top-3 -right-3 w-10 h-10 border-t-2 border-r-2 ${theme.border} transition-colors`} />
                              <div className={`absolute -bottom-3 -left-3 w-10 h-10 border-b-2 border-l-2 ${theme.border} transition-colors`} />

                              <h3 className={`text-xl font-bold ${theme.text} uppercase tracking-tight mb-6 flex items-center gap-3 border-b ${theme.border30} pb-4`}>
                                <span className={`w-3 h-3 ${theme.bg} rounded-[2px] shadow-[0_0_10px_currentColor] animate-pulse`}></span>
                                {category.title}
                              </h3>

                              <div className="flex flex-col gap-3">
                                {category.items.map(p => (
                                  <div key={p.id} className={`group relative flex justify-between items-center p-3 border border-white/5 bg-black/40 ${theme.hoverBgGlow} ${theme.hoverBorder} transition-all rounded-[2px] overflow-hidden`}>
                                    <div className="relative z-10 flex items-center gap-2">
                                      <span className={`${theme.text}/50 group-hover:${theme.text} transition-colors flex items-center`}>
                                        {category.type === "spesial" ? <Star size={12} className="text-amber-400 fill-amber-400" /> : <ChevronRight size={12} />}
                                      </span>
                                      <div className="flex flex-col">
                                        <span className="tracking-tight text-white font-bold text-sm">
                                          {category.type === "harga" ? getSlangName(p.price, p.name) : p.name}
                                        </span>
                                        {category.type === "harga" && <span className="tracking-tight text-white/40 text-[10px] block leading-none mt-1">{formatDuration(p.duration_minutes || 0)}</span>}
                                        {category.type === "spesial" && <span className="tracking-tight text-white/50 text-[10px] mt-1 block leading-none">Mulai: {p.fixed_start_time} WIB</span>}
                                      </div>
                                    </div>
                                    <span className={`tracking-tight ${theme.text} font-bold text-sm relative z-10`}>Rp {p.price.toLocaleString('id-ID')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
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
        className="relative z-20 py-10 md:py-20 border-b border-hairline bg-surface-dark/50 scroll-mt-16 md:min-h-[90vh] flex flex-col"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="max-w-[1800px] w-full mx-auto px-6 flex-1 flex flex-col">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-6 border-b border-hairline">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-nvidia-green"></span>
                </span>
                <span className="text-xs font-bold text-nvidia-green uppercase tracking-widest">LIVE MONITORING</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight uppercase">STATUS BOOKING</h2>
              <p className="text-white/50 tracking-tight text-sm mt-2 max-w-xl">Pantau antrean secara real-time.</p>
            </div>

            {/* Search Bar */}
            <div className="flex w-full md:w-auto">
              <input
                type="text"
                placeholder="Cari nama pemain / PC..."
                value={antreanSearch}
                onChange={(e) => setAntreanSearch(e.target.value)}
                className="bg-black/60 border border-hairline px-3 py-2 text-xs text-white rounded-[2px] outline-none focus:border-nvidia-green w-full md:w-64"
              />
            </div>
          </div>

          {/* Cards Grid */}
          {filteredBookings.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#0f1013]/90 border border-hairline flex-1 flex flex-col items-center justify-center text-zinc-400 text-xs uppercase tracking-wider">
              Belum ada data antrean dengan filter ini
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {filteredBookings.map((b) => {
                const pc = db.pcs?.find((p: PC) => p.id === b.pc_id);
                const pkg = db.pakets?.find((p: Paket) => p.id === b.paket_id);
                const isPending = b.status === "pending";

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
                    className={`p-3.5 sm:p-4 rounded-xl flex flex-col justify-between gap-2.5 relative overflow-hidden group transition-all bg-[#0f1013]/95 border shadow-md ${
                      pcExpired
                        ? "border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                        : pcWarning
                        ? "border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                        : "border-hairline hover:border-zinc-500"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-hairline">
                      <div className="flex items-center gap-2 min-w-0">
                        {isPending ? (
                          <Clock size={16} className="text-amber-400 animate-pulse shrink-0" />
                        ) : pcExpired ? (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                        ) : (
                          <CheckCircle2 size={16} className="text-nvidia-green shrink-0" />
                        )}
                        <span className="font-bold text-white text-sm uppercase tracking-tight truncate">
                          {b.player_name}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-medium tabular-nums shrink-0">
                        {new Date(b.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#16171b] p-2.5 rounded-lg border border-hairline">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold">TARGET PC</span>
                        <span className="text-nvidia-green font-bold text-xs uppercase truncate">
                          {pcLabel}
                        </span>
                      </div>
                      <div className="flex flex-col text-right min-w-0">
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold">PAKET / TARIF</span>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className="text-white font-bold text-xs tabular-nums">
                            Rp {(pkg?.price || (b.paket_id?.startsWith('custom-') ? parseInt(b.paket_id.replace('custom-', '')) || 0 : 0)).toLocaleString("id-ID")}
                          </span>
                          <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${b.ss_bukti ? 'bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                            {b.ss_bukti ? 'QRIS' : 'KASIR'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Waitlist State Bar for this Player */}
                    {isPending ? (
                      <div className="w-full bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg flex items-center justify-between text-amber-400 text-xs">
                        <span className="text-[11px] font-bold uppercase flex items-center gap-1.5">
                          <Clock size={12} className="animate-spin" />
                          Menunggu Kasir
                        </span>
                        <span className="text-zinc-500 text-[10px] tabular-nums font-mono">#{b.id.slice(-5)}</span>
                      </div>
                    ) : pcExpired ? (
                      <div className="w-full bg-red-500/15 border border-red-500/40 p-2 rounded-lg flex flex-col gap-0.5 text-white">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-red-400 flex items-center gap-1.5">
                            <Flame size={13} className="text-red-400" />
                            Giliran {b.player_name} Main
                          </span>
                          <span className="text-[10px] font-bold uppercase text-red-300">Waktu Habis</span>
                        </div>
                        <span className="text-[10px] text-zinc-300 truncate">
                          {pcLabel} selesai dimainkan • Silakan masuk
                        </span>
                      </div>
                    ) : pcWarning ? (
                      <div className="w-full bg-amber-500/15 border border-amber-500/30 p-2 rounded-lg flex flex-col gap-0.5 text-white">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                            <Clock size={12} className="text-amber-400 animate-spin" />
                            {b.player_name} Bersiap
                          </span>
                          <span className="text-[11px] font-bold text-amber-300 tabular-nums">
                            {pcMins}:{pcSecs.toString().padStart(2, '0')}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-300 truncate">
                          Sisa waktu player kurang dari {pcMins} menit lagi
                        </span>
                      </div>
                    ) : pcHasTimer && pcMins > 0 ? (
                      <div className="w-full bg-white/[0.03] border border-hairline p-2 rounded-lg flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                          <Hourglass size={12} className="text-nvidia-green" />
                          Mengantre di {pcLabel}
                        </span>
                        <span className="text-[11px] font-bold text-nvidia-green tabular-nums">
                          Sekitar {pcMins}m Lagi
                        </span>
                      </div>
                    ) : (
                      <div className="w-full bg-nvidia-green/10 border border-nvidia-green/30 p-2 rounded-lg flex items-center justify-between text-nvidia-green text-xs">
                        <span className="text-[11px] font-bold uppercase flex items-center gap-1.5">
                          <CheckCircle2 size={13} />
                          {pcLabel} Standby
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Konfirmasi ke kasir
                        </span>
                      </div>
                    )}
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
        className="relative z-20 py-10 md:py-24 scroll-mt-16 md:min-h-[90vh] flex flex-col"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="max-w-[1800px] w-full mx-auto px-4 sm:px-6 flex-1 flex flex-col">
          {/* Stepper Header */}
          <div className="flex items-center justify-between max-w-sm mx-auto w-full mb-6 px-2">
            <button
              onClick={() => setBookingStep(1)}
              className="flex items-center gap-2 group transition-opacity"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                bookingStep === 1 
                  ? "bg-nvidia-green text-black shadow-[0_0_12px_rgba(118,185,0,0.5)]" 
                  : "bg-nvidia-green/20 text-nvidia-green border border-nvidia-green/40"
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

            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                bookingStep === 2 
                  ? "bg-nvidia-green text-black shadow-[0_0_12px_rgba(118,185,0,0.5)]" 
                  : "bg-[#16171b] text-zinc-500 border border-hairline"
              }`}>
                2
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                bookingStep === 2 ? "text-white" : "text-zinc-500"
              }`}>
                Pembayaran
              </span>
            </div>
          </div>

          <div className="w-full relative overflow-hidden flex-1 flex flex-col">
            <AnimatePresence mode="popLayout">
              {bookingStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full flex-1 p-4 sm:p-6 md:p-8 bg-[#0f1013]/95 border border-hairline rounded-2xl flex flex-col shadow-2xl"
                >
                  {/* Step 1 Header */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 pb-5 border-b border-hairline">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">Pilih PC Untuk Booking</h2>
                      <p className="text-xs md:text-sm text-zinc-400 mt-1">Cek sisa waktu pemain aktif dan ambil nomor antrean berikutnya</p>
                    </div>
                  </div>

                  {mounted && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: "-50px" }}
                      className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 auto-rows-[1fr] mb-6"
                    >
                      {db?.pcs?.map((pc) => {
                        const isSelected = selectedPc === pc.id;
                        const pcBookings = db?.bookings?.filter(b => b.pc_id === pc.id) || [];
                        const firstBooking = pcBookings[0];
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
                            whileHover={{ 
                              scale: 1.02, 
                              borderColor: isExpired ? "#ef4444" : isWarning ? "#f59e0b" : "#76b900" 
                            }}
                            whileTap={{ scale: 0.98 }}
                            key={pc.id}
                            onClick={() => handlePcClick(pc.id)}
                            className={`
                              relative flex flex-col items-start justify-between p-4 rounded-xl transition-all border overflow-hidden group h-full text-left
                              ${isSelected
                                ? isExpired
                                  ? "bg-red-500/15 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.25)] ring-1 ring-red-500"
                                  : isWarning
                                  ? "bg-amber-500/15 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500"
                                  : "bg-nvidia-green/10 border-nvidia-green text-white shadow-[0_0_20px_rgba(118,185,0,0.2)] ring-1 ring-nvidia-green"
                                : isExpired
                                ? "bg-red-500/5 border-red-500/40 text-white hover:border-red-400"
                                : isWarning
                                ? "bg-amber-500/5 border-amber-500/40 text-white hover:border-amber-400"
                                : "bg-[#121316] border-hairline text-white hover:border-zinc-500"
                              }
                            `}
                          >
                            {/* Header: PC Name & Status */}
                            <div className="flex justify-between w-full relative z-10 mb-2.5 items-start gap-2">
                              <div className="flex flex-col items-start text-left">
                                <span className={`text-base font-black tracking-tight uppercase leading-tight ${
                                  isExpired ? "text-red-400" : isWarning ? "text-amber-400" : isSelected ? "text-nvidia-green" : "text-white"
                                }`}>
                                  {pc.name}
                                </span>
                                {isExpired ? (
                                  <span className="text-[10px] font-bold text-red-400 uppercase mt-0.5 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" /> 
                                    {firstBooking ? `Giliran ${firstBooking.player_name}` : 'PC Bebas'}
                                  </span>
                                ) : isWarning ? (
                                  <span className="text-[10px] font-bold text-amber-400 uppercase mt-0.5 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" /> 
                                    {firstBooking ? `${firstBooking.player_name} Bersiap` : 'Hampir Selesai'}
                                  </span>
                                ) : hasTimer ? (
                                  <span className="text-[10px] font-medium text-zinc-400 uppercase mt-0.5">
                                    Sedang Dimainkan
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-400 uppercase mt-0.5">
                                    PC Bebas
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <Monitor
                                  size={18}
                                  className={
                                    isExpired 
                                      ? "text-red-400" 
                                      : isWarning 
                                      ? "text-amber-400" 
                                      : isSelected 
                                      ? "text-nvidia-green" 
                                      : "text-zinc-500 group-hover:text-zinc-300"
                                  }
                                />
                                {pcBookings.length > 0 ? (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide text-center ${
                                    isExpired 
                                      ? 'bg-red-500 text-white' 
                                      : isWarning 
                                      ? 'bg-amber-500 text-black' 
                                      : isPending 
                                      ? 'bg-amber-500 text-black' 
                                      : 'bg-nvidia-green text-black'
                                  }`}>
                                    {isExpired ? `Giliran ${firstBooking.player_name.slice(0, 6)}` : isPending ? 'Verifikasi' : `${pcBookings.length} Antrean`}
                                  </span>
                                ) : isExpired ? (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide bg-red-500/20 text-red-400 border border-red-500/40">
                                    Habis
                                  </span>
                                ) : isWarning ? (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                    Kurang 10M
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wide bg-white/5 text-zinc-400 border border-white/10">
                                    Bebas
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Timer Countdown Bar */}
                            {isExpired ? (
                              <div className="w-full bg-red-500/10 border border-red-500/30 p-2 rounded-lg flex items-center justify-between mb-2 z-10 text-red-300">
                                <span className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                                  <AlertTriangle size={12} className="text-red-400" /> Sisa Waktu
                                </span>
                                <span className="tabular-nums text-xs font-black text-red-400">
                                  00:00 Habis
                                </span>
                              </div>
                            ) : isWarning ? (
                              <div className="w-full bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg flex items-center justify-between mb-2 z-10 text-amber-300">
                                <span className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                                  <Clock size={12} className="text-amber-400" /> Sisa Waktu
                                </span>
                                <span className="tabular-nums text-xs font-black text-amber-300">
                                  {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
                                </span>
                              </div>
                            ) : isNormalTimer ? (
                              <div className="w-full bg-white/[0.04] border border-hairline p-2 rounded-lg flex items-center justify-between mb-2 z-10 text-zinc-300">
                                <span className="text-[10px] font-medium uppercase tracking-wide">Sisa Waktu</span>
                                <span className="tabular-nums text-xs font-bold text-nvidia-green">
                                  {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
                                </span>
                              </div>
                            ) : null}

                            {/* PC Queue & Action Hint */}
                            <div className="flex-1 w-full relative z-10 flex flex-col gap-1.5 mt-1 justify-center">
                              {pcBookings.length > 0 ? (
                                <div className="flex flex-col w-full h-full justify-center gap-1">
                                  <div className={`p-2 rounded-lg border text-xs ${
                                    isExpired 
                                      ? 'bg-red-500/10 border-red-500/20' 
                                      : isWarning 
                                      ? 'bg-amber-500/10 border-amber-500/20' 
                                      : 'bg-black/40 border-hairline'
                                  }`}>
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-[10px] font-bold text-nvidia-green">
                                        {isExpired ? "Giliran Main:" : isWarning ? "Siap Masuk:" : "Antrean 1:"}
                                      </span>
                                      <span className="text-[10px] font-medium text-zinc-400">
                                        {firstPkgTitle}
                                      </span>
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">
                                      {firstBooking.player_name}
                                    </div>
                                  </div>

                                  {pcBookings.length > 1 && (
                                    <div className="text-[10px] text-zinc-400 font-medium text-center uppercase tracking-wide border-t border-hairline pt-1 shrink-0">
                                      +{pcBookings.length - 1} Antrean Berikutnya
                                    </div>
                                  )}
                                </div>
                              ) : (hasTimer && !isExpired) ? (
                                <div className="flex flex-col items-center justify-center text-center gap-1 h-full py-1">
                                  <span className="text-xs font-semibold text-zinc-300">Sedang Dimainkan</span>
                                  <span className="text-[10px] text-nvidia-green font-bold uppercase tracking-wide bg-nvidia-green/10 border border-nvidia-green/20 px-2 py-0.5 rounded-full">
                                    Belum Ada Antrean
                                  </span>
                                </div>
                              ) : isExpired ? (
                                <div className="flex flex-col items-center justify-center text-center gap-1 h-full py-1">
                                  <span className="text-xs font-bold text-red-400">Waktu Habis • PC Bebas</span>
                                  <span className="text-[10px] text-zinc-400">Bisa langsung main ke kasir</span>
                                </div>
                              ) : (
                                <div className={`text-xs h-full font-bold flex flex-col items-center justify-center gap-1 transition-colors py-2 ${isSelected ? 'text-nvidia-green' : 'text-zinc-400'}`}>
                                  {isSelected ? (
                                    <span className="flex items-center gap-1.5 font-bold"><CheckCircle2 size={16} /> PC Dipilih</span>
                                  ) : (
                                    <>
                                      <span className="font-semibold text-white">PC Bebas Siap Main</span>
                                      <span className="text-[10px] text-zinc-400 font-normal">Langsung main ke kasir</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}

                  {/* Sticky Bottom Action Bar for Mobile & Desktop */}
                  <div className="sticky bottom-4 z-30 mt-auto pt-3 pb-3 px-4 rounded-xl bg-[#121316]/95 border border-hairline backdrop-blur-md flex items-center justify-between gap-3 shadow-2xl">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-400 font-medium">Unit Terpilih:</span>
                      <span className="text-sm font-bold text-white">
                        {selectedPc ? (db?.pcs?.find(p => p.id === selectedPc)?.name || selectedPc) : "Pilih salah satu PC"}
                      </span>
                    </div>
                    <button
                      onClick={handleNextStep}
                      disabled={!selectedPc}
                      className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
                        selectedPc
                          ? "bg-nvidia-green text-black hover:bg-white active:scale-95 shadow-[0_0_15px_rgba(118,185,0,0.3)]"
                          : "bg-surface-soft text-zinc-600 cursor-not-allowed border border-hairline"
                      }`}
                    >
                      <span>Lanjut Pembayaran</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {bookingStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="w-full max-w-2xl mx-auto flex-1 p-4 sm:p-6 md:p-8 bg-[#0f1013]/95 border border-hairline rounded-2xl flex flex-col shadow-2xl"
                >
                  <div className="flex items-center gap-3.5 mb-6 border-b border-hairline pb-4">
                    <button
                      onClick={() => {
                        setFormError(null);
                        setBookingStep(1);
                      }}
                      className="w-9 h-9 flex items-center justify-center bg-[#16171b] border border-hairline rounded-lg text-white hover:border-nvidia-green hover:text-nvidia-green transition-colors shrink-0"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">Step 2: Identitas dan Pembayaran</h3>
                      <p className="text-xs text-zinc-400">Unit PC: <strong className="text-nvidia-green">{db?.pcs?.find(p => p.id === selectedPc)?.name || selectedPc}</strong></p>
                    </div>
                  </div>

                  {/* Inline Error Message */}
                  {formError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2 mb-4">
                      <AlertTriangle size={15} className="shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between space-y-5">
                    {/* Identitas */}
                    <div>
                      <label className="text-xs font-bold text-zinc-300 mb-1.5 block uppercase tracking-wide">
                        Nama Panggilan Pemain
                      </label>
                      <input
                        type="text"
                        value={playerName}
                        onChange={e => {
                          setPlayerName(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('portal-paket')?.focus(); } }}
                        placeholder="Contoh: Bang Jago"
                        className="w-full bg-[#16171b] border border-hairline text-white p-3 rounded-lg text-sm focus:border-nvidia-green outline-none"
                      />
                    </div>

                    {/* Package Selection */}
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-zinc-300 mb-1.5 block uppercase tracking-wide shrink-0">
                        Pilih Paket Billing
                      </label>
                      <input
                        id="portal-paket"
                        type="text"
                        value={searchPaket}
                        onChange={e => setSearchPaket(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('portal-paket')?.blur(); } }}
                        placeholder="Cari nama paket atau ketik nominal..."
                        className="w-full bg-[#16171b] border border-hairline text-white p-3 rounded-lg text-sm focus:border-nvidia-green outline-none mb-2"
                      />
                      <div className="max-h-64 flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar">
                        {(() => {
                          const query = debouncedSearch.toLowerCase();
                          let customPkg = null;
                          let parsedPrice = 0;
                          let isTimeInput = false;

                          if (query) {
                            if (query.includes('jam') || query.includes('menit') || query.includes('m') || query.includes('j')) {
                              isTimeInput = true;
                              const timeStr = query.replace(/jam/g, 'j').replace(/menit/g, 'm').replace(/[^0-9jm]/g, '');
                              let totalMinutes = 0;
                              if (timeStr.includes('j')) {
                                const h = parseInt(timeStr.split('j')[0]) || 0;
                                const m = parseInt(timeStr.split('j')[1]?.split('m')[0]) || 0;
                                totalMinutes = (h * 60) + m;
                              } else if (timeStr.includes('m')) {
                                totalMinutes = parseInt(timeStr.split('m')[0]) || 0;
                              } else {
                                totalMinutes = parseInt(timeStr) || 0;
                              }
                              if (totalMinutes > 0) {
                                parsedPrice = Math.ceil(totalMinutes / 60 * 4000);
                              }
                            } else {
                              parsedPrice = parseInt(query.replace(/\D/g, '')) || 0;
                            }
                          }

                          const filtered = (db?.pakets || []).filter(p =>
                            !p.is_custom && (p.name.toLowerCase().includes(query) || p.price.toString().includes(query) || (parsedPrice > 0 && p.price === parsedPrice))
                          );

                          if (query && parsedPrice >= 3000) {
                            const hasExactMatch = (db?.pakets || []).some(p => !p.is_custom && p.price === parsedPrice);
                            if (!hasExactMatch) {
                              const totalMins = Math.floor(parsedPrice / 4000 * 60);
                              const h = Math.floor(totalMins / 60);
                              const m = totalMins % 60;
                              const timeStr = [h > 0 ? `${h}j` : '', m > 0 ? `${m}m` : ''].filter(Boolean).join(' ') || '0m';
                              customPkg = {
                                id: `custom-${parsedPrice}`,
                                name: `Paket Custom (± ${timeStr})`,
                                price: parsedPrice
                              };
                            }
                          }

                          const displayPkgs = customPkg ? [customPkg, ...filtered] : filtered;

                          if (displayPkgs.length === 0) {
                            return (
                              <div className="p-4 text-center text-zinc-400 text-xs border border-dashed border-hairline rounded-xl">
                                {(parsedPrice > 0 && parsedPrice < 3000)
                                  ? "Minimal booking Rp 3.000 boss"
                                  : "Paket tidak ditemukan"}
                              </div>
                            );
                          }

                          return displayPkgs.map((pkg) => {
                            const isSelected = selectedPaket === pkg.id;
                            const isCustom = pkg.id.startsWith('custom-');
                            return (
                              <button
                                key={pkg.id}
                                onClick={() => {
                                  setSelectedPaket(pkg.id);
                                  if (formError) setFormError(null);
                                }}
                                className={`
                                  relative group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 w-full overflow-hidden outline-none shrink-0 text-left
                                  ${isSelected
                                    ? "bg-nvidia-green/10 border border-nvidia-green/50 shadow-[0_0_15px_rgba(118,185,0,0.15)]"
                                    : isCustom ? "bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/50" : "bg-[#16171b] border border-hairline hover:border-zinc-500"
                                  }
                                `}
                              >
                                {isSelected && (
                                  <motion.div
                                    layoutId="paket-highlight"
                                    className="absolute inset-0 bg-nvidia-green/10 pointer-events-none"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                  />
                                )}
                                <div className="flex flex-col items-start relative z-10">
                                  <span className={`text-xs md:text-sm font-bold uppercase ${isSelected ? "text-nvidia-green" : isCustom ? "text-blue-400" : "text-white"} transition-colors`}>
                                    {pkg.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 relative z-10">
                                  <span className={`text-xs font-bold tabular-nums ${isSelected ? "text-nvidia-green" : "text-zinc-400"}`}>
                                    Rp {pkg.price.toLocaleString("id-ID")}
                                  </span>
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-nvidia-green bg-nvidia-green/20" : "border-zinc-600"}`}>
                                    {isSelected && <div className="w-2 h-2 bg-nvidia-green rounded-full shadow-[0_0_8px_rgba(118,185,0,1)]" />}
                                  </div>
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Metode Pembayaran */}
                    <div className="bg-[#121316] p-4 border border-hairline rounded-xl space-y-3">
                      <label className="text-xs font-bold text-zinc-300 block uppercase tracking-wide">
                        Metode Pembayaran
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('kasir');
                            setSsFile(null);
                            if (formError) setFormError(null);
                          }}
                          className={`p-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                            paymentMethod === 'kasir'
                              ? 'bg-nvidia-green/10 border-nvidia-green text-nvidia-green shadow-[0_0_10px_rgba(118,185,0,0.15)]'
                              : 'bg-[#16171b] border-hairline text-zinc-400 hover:border-zinc-500'
                          }`}
                        >
                          <span>Bayar di Kasir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('qris');
                            if (formError) setFormError(null);
                          }}
                          className={`p-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                            paymentMethod === 'qris'
                              ? 'bg-nvidia-green/10 border-nvidia-green text-nvidia-green shadow-[0_0_10px_rgba(118,185,0,0.15)]'
                              : 'bg-[#16171b] border-hairline text-zinc-400 hover:border-zinc-500'
                          }`}
                        >
                          <span>QRIS DANA</span>
                        </button>
                      </div>

                      {paymentMethod === 'kasir' && (
                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-hairline">
                          <p className="text-[11px] text-zinc-400">
                            Booking langsung tercatat di antrean. Siapkan uang pas di meja kasir sebelum giliran main tiba.
                          </p>
                        </div>
                      )}

                      {paymentMethod === 'qris' && (
                        <div className="space-y-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="w-full py-2.5 px-3 bg-[#16171b] border border-nvidia-green/30 text-nvidia-green hover:bg-nvidia-green hover:text-black rounded-lg text-xs font-bold uppercase tracking-wide transition flex items-center justify-center gap-2"
                          >
                            <QrCode size={16} />
                            <span>Tampilkan QRIS DANA</span>
                          </button>

                          <label className="w-full py-2.5 px-3 bg-[#16171b] border border-hairline hover:border-nvidia-green text-white rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition">
                            <Upload size={16} className="text-nvidia-green" />
                            <span className="truncate max-w-[220px]">
                              {ssFile ? ssFile.name : "Upload Bukti Transfer Gambar"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  if (file.size > 2 * 1024 * 1024) {
                                    setFormError("Ukuran file terlalu besar, maksimal 2MB");
                                    e.target.value = "";
                                    return;
                                  }
                                  setSsFile(file);
                                  if (formError) setFormError(null);
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Rangkuman Checkout Pembayaran */}
                    {selectedPaketObj && (
                      <div className="bg-[#16171b] border border-hairline rounded-xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between text-zinc-400">
                          <span>Unit PC:</span>
                          <strong className="text-white">{db?.pcs?.find(p => p.id === selectedPc)?.name || selectedPc}</strong>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Paket Pilihan:</span>
                          <strong className="text-white">{selectedPaketObj.name}</strong>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Metode Pembayaran:</span>
                          <strong className="text-white uppercase">{paymentMethod === 'kasir' ? 'Bayar di Kasir' : 'QRIS DANA'}</strong>
                        </div>
                        <div className="pt-2 border-t border-hairline flex justify-between items-center">
                          <span className="text-xs font-bold text-white uppercase tracking-wide">Total Tagihan:</span>
                          <span className="text-base font-black text-nvidia-green tabular-nums">
                            Rp {selectedPaketObj.price.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Payment Action */}
                    <div className="pt-2 flex flex-col gap-2.5">
                      <button
                        disabled={loading}
                        onClick={handlePayment}
                        className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                          loading 
                            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' 
                            : 'bg-nvidia-green text-black hover:bg-white active:scale-95 shadow-[0_0_20px_rgba(118,185,0,0.3)]'
                        }`}
                      >
                        {loading ? (
                          <span>Memproses Booking...</span>
                        ) : (
                          <>
                            <span>Kirim Booking Sekarang</span>
                            <ArrowRight size={15} />
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setShowTcModal(true)}
                        className="text-[11px] text-zinc-400 hover:text-nvidia-green transition-colors text-center underline underline-offset-4"
                      >
                        Baca Syarat dan Ketentuan Booking
                      </button>
                    </div>
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
        className="relative z-20 min-h-[100svh] py-32 flex flex-col justify-center border-t border-hairline overflow-hidden bg-gradient-to-b from-surface-dark to-black"
      >
        <div className="max-w-[1400px] w-full mx-auto relative z-10">
          <motion.div variants={itemVariants} className="text-center mb-16 px-6">
            <h2 className="text-3xl font-bold text-white uppercase tracking-tight tracking-tight">SPEK PC GC NET</h2>
            <p className="text-white/60 tracking-tight text-sm mt-2">PC NGEPAS BUAT BUDGET PELAJAR, TAPI PERFORMA BOLEH DIADU. GESER BUAT CEK SPEKNYA.</p>
          </motion.div>

          {mounted && <PCCarousel pcs={db.pcs || []} />}

          {/* Efek Game Premium (Jiwa Gamer) */}
          <motion.div
            variants={itemVariants}
            className="mt-20 px-6 flex flex-wrap justify-center gap-6 md:gap-10 opacity-90"
          >
            <GameIcons isMobile={isMobile} />
          </motion.div>
        </div>

        {/* Background glow ampas */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-nvidia-green/10 blur-[100px] pointer-events-none" />
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
              className="relative w-full max-w-2xl nvidia-card bg-black/80 border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden"
              style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
            >
              {/* Corner Accents */}
              <div className="absolute -top-3 -right-3 w-10 h-10 border-t-2 border-r-2 border-purple-500/50" />
              <div className="absolute -bottom-3 -left-3 w-10 h-10 border-b-2 border-l-2 border-purple-500/50" />

              {/* Inner Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

              <div className="relative z-10 p-6 md:p-8 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center border-b border-purple-500/20 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-purple-400 tracking-tight uppercase tracking-widest flex items-center gap-3">
                    <span className="w-2 h-6 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse" />
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
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Clock size={20} className="text-purple-400 shrink-0" /> Dateng On-Time Yuk!</h3>
                    <p>Kalo kamu udah <em>booking</em>, usahain on-time ya! Kita kasih toleransi telat maksimal <strong>5 menit</strong>. Lewat dari itu, argometernya otomatis jalan atau PC-nya bakal kita oper ke <em>player</em> lain yang udah standby duluan. Hargain waktu sesama <em>gamers</em> yuk!</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Crown size={20} className="text-purple-400 shrink-0" /> Prioritas Walk-in & Antrean</h3>
                    <p>Booking web ini gunanya buat <strong>masuk ke dalam antrean</strong>. <em>Gamers</em> yang datang langsung (<em>walk-in</em>) ke warnet tetep dapet prioritas utama kalau ada PC kosong. Kalau kamu <em>booking</em> buat main setelah sesi orang lain, pastiin kamu udah <em>standby</em> di lokasi sebelum durasinya habis biar bisa langsung sambung main!</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><UtensilsCrossed size={20} className="text-purple-400 shrink-0" /> Urusan Makanan dan Minuman</h3>
                    <p>Dilarang keras bawa <em>F&B</em> dari luar yang gampang tumpah, berminyak, apalagi berpotensi merusak <em>gear</em> warnet kita. Gak usah repot, <em>order</em> aja langsung di kantin GC Net! Variannya banyak, harga cincai, dan wadahnya dijamin aman buat nge-game.</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Ban size={20} className="text-purple-400 shrink-0" /> Area Bebas Asap</h3>
                    <p>Seluruh ruangan GC Net itu 100% bebas asap ya, <em>guys</em>. Buat kamu yang mau sebat atau nge-<em>vape</em>, silakan <em>melipir</em> ke area luar warnet. Biar tetep adem dan wangi buat semua <em>user</em>.</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Banknote size={20} className="text-purple-400 shrink-0" /> No Refund Ya</h3>
                    <p>Buat paket <em>booking</em> atau waktu <em>custom</em> yang udah sukses di-<em>checkout</em> dan aktif, otomatis <strong>gak bisa di-refund</strong> atau dibatalin. Jadi pastiin lagi semuanya udah pas sebelum bayar!</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><AlertTriangle size={20} className="text-purple-400 shrink-0" /> Anti-Cheat & Fair Play</h3>
                    <p>Main bersih itu keren! Kalo sampai ketahuan pake <em>cheat</em>, aplikasi ilegal, atau <em>browsing</em> yang aneh-aneh, sanksinya auto <strong>diomelin</strong> sama abang-abangan GC Net. <em>Play fair, play safe!</em></p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Sparkles size={20} className="text-purple-400 shrink-0" /> Jaga Kebersihan Bareng</h3>
                    <p>Biar mainnya makin <em>pewe</em>, yuk sama-sama jaga kebersihan area dan <em>gear</em> yang kamu pake. Jangan lupa buang sisa sampahmu pada tempatnya ya!</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Monitor size={20} className="text-purple-400 shrink-0" /> Request Install Game?</h3>
                    <p>Jangan sembarangan nge-<em>install</em> aplikasi pihak ketiga yang berisiko bikin sistem PC kita <em>ngambek</em>. Kalo butuh <em>request game</em> atau <em>software</em> tertentu, <em>bilang</em> aja sama Operator kita yang lagi <em>jaga</em>!</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-purple-500/20 flex justify-end">
                  <button
                    onClick={() => setShowTcModal(false)}
                    className="px-8 py-3 bg-purple-500 text-white font-bold tracking-tight text-sm uppercase tracking-wider rounded-[2px] hover:bg-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all"
                  >
                    Saya Mengerti
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Warning Modal */}
      <AnimatePresence>
        {showQueueWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface-dark border border-hairline p-6 max-w-sm w-full rounded-[2px]"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle size={32} className="text-warning shrink-0" />
                <h3 className="text-warning font-bold uppercase tracking-widest tracking-tight text-sm">PC SEDANG DALAM ANTREAN</h3>
              </div>
              <p className="text-white/70 tracking-tight text-xs mb-6 leading-relaxed">
                Udah ada <strong className="text-white">{db?.bookings?.filter(b => b.pc_id === selectedPc).length} orang</strong> yang antre di PC ini. Kalau lu tetep lanjut booking, lu bakal masuk antrean berikutnya dan mungkin harus nunggu agak lama. Yakin?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowQueueWarning(false)}
                  className="px-4 py-2 border border-hairline text-white/50 hover:text-white hover:bg-white/5 text-[10px] font-bold uppercase transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setShowQueueWarning(false);
                    setBookingStep(2);
                  }}
                  className="px-4 py-2 bg-warning text-black text-[10px] font-bold uppercase transition-transform hover:scale-105"
                >
                  Tetep Lanjut
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Booking Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface-dark border border-hairline p-6 max-w-sm w-full rounded-[2px]"
            >
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 size={32} className="text-nvidia-green shrink-0" />
                <h3 className="text-nvidia-green font-bold uppercase tracking-widest tracking-tight text-sm">BOOKING BERHASIL</h3>
              </div>
              <p className="text-white/70 tracking-tight text-xs mb-6 leading-relaxed">
                Data lu udah masuk ke meja admin. Silakan tunggu konfirmasi atau tanya admin yang lagi jaga buat mastiin ya bos. Gas main!
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    const elem = document.getElementById("antrean");
                    if (elem) elem.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-6 py-2 bg-nvidia-green text-black hover:bg-[#88d600] text-[10px] font-bold uppercase transition-colors"
                >
                  Lihat Status Antrean
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
              <p className="text-[10px] tracking-tight text-white/50 mb-4 uppercase tracking-wider text-center">Mohon tunggu sebentar...</p>
              <div className="w-12 h-12 border-4 border-nvidia-green/20 border-t-nvidia-green rounded-full animate-spin"></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
