"use client";

import { motion, AnimatePresence, Variants } from "motion/react";
import { Monitor, ArrowRight, GameController, WarningCircle, CheckCircle, Crosshair, UploadSimple, CaretLeft, CaretRight, Sparkle, Clock, User, Package, Crown, Hamburger, CigaretteSlash, Money, Warning, Star, Check, X, HourglassMedium, Play } from "@phosphor-icons/react";
import Link from "next/link";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { DatabaseSchema, PC, Paket } from "@/lib/db";
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
  const carouselRef = useRef<HTMLDivElement>(null);

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

    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);



  const totalPcs = db?.pcs?.length || 0;
  const bookedPcsCount = db?.pcs?.filter(pc => db?.bookings?.some(b => b.pc_id === pc.id)).length || 0;

  const handlePcClick = (pcId: string) => {
    setSelectedPc(pcId);
    if (db?.pakets && db.pakets.length > 0) {
      setSelectedPaket(db.pakets[0].id);
    }
  };

  const handleNextStep = () => {
    const selectedPcBookings = db?.bookings?.filter(b => b.pc_id === selectedPc) || [];
    if (selectedPcBookings.length > 0) {
      setShowQueueWarning(true);
      return;
    }
    setBookingStep(2);
  };

  const handlePayment = async () => {
    if (!selectedPc || !selectedPaket || !playerName) {
      alert("Lengkapi data: Pilih PC, Paket, dan isi Nama Pemain!");
      return;
    }
    if (paymentMethod === 'qris' && !ssFile) {
      alert("Wajib upload bukti transfer DANA jika pilih QRIS!");
      return;
    }
    if (ssFile && !ssFile.type.startsWith('image/')) {
      alert("Bukti transfer wajib berupa file gambar (JPG/PNG/dll)!");
      return;
    }
    // Validasi ukuran file max 2MB
    if (ssFile && ssFile.size > 2 * 1024 * 1024) {
      alert("Ukuran file SS maksimal 2MB. Kompres dulu gambarnya ya boss!");
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

      const newPaketRes = await fetch("/api/pakets", {
        method: "POST",
        body: JSON.stringify({ name: `Personal ${timeStr.trim()}`, price, is_custom: true })
      });
      const createdPaket = await newPaketRes.json();
      finalPaketId = createdPaket.id;
    }

    const sendBooking = async (base64SS?: string) => {
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          body: JSON.stringify({
            pc_id: selectedPc,
            paket_id: finalPaketId,
            player_name: playerName,
            ss_bukti: base64SS
          })
        });
        const resData = await res.json();
        if (!res.ok) {
          alert(resData?.error || "Gagal membuat booking. Silakan coba lagi.");
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
        alert("Terjadi kesalahan jaringan saat mengirim booking.");
        setLoading(false);
      }
    };

    if (ssFile) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64SS = reader.result as string;
        await sendBooking(base64SS);
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

          {/* Ambient Glows */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 -left-[200px] w-[600px] h-[600px] bg-nvidia-green/30 rounded-full blur-[120px]"
          />

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
            <div className="md:hidden flex items-center justify-start mb-10 h-28 w-28 relative">
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
            <div className="flex items-center gap-3 mb-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] w-max px-4 py-1.5 rounded-full">
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

            <div className="text-white/60 text-base md:text-lg leading-relaxed mb-8 tracking-tight max-w-[45ch] space-y-2">
              <div className="flex items-center gap-2">
                <Check weight="bold" className="text-nvidia-green shrink-0" size={18} />
                <span>Kalo PC penuh, wajib booking buat antre.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check weight="bold" className="text-nvidia-green shrink-0" size={18} />
                <span>Datang langsung ke lokasi tetap prioritas utama.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check weight="bold" className="text-nvidia-green shrink-0" size={18} />
                <span>Admin Acc, pantau antrean, tunggu giliran!</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 items-start">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="#booking"
                onClick={scrollToBooking}
                className="nvidia-button gap-2 w-max"
              >
                Booking Sekarang! <ArrowRight weight="bold" />
              </motion.a>

              <button
                onClick={() => setShowTcModal(true)}
                className="relative inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-bold border-2 border-transparent hover:bg-transparent hover:text-white hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] tracking-tight text-sm uppercase tracking-widest transition-all rounded-[2px] w-max"
              >
                Syarat & Ketentuan Booking
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hidden md:flex flex-1 justify-end"
          >
            <div className="nvidia-card p-6 w-[320px] bg-black/60 backdrop-blur-md border-nvidia-green/30 relative">
              <div className="absolute top-0 right-0 w-2 h-2 bg-nvidia-green animate-pulse" />
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-nvidia-green" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-nvidia-green" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-nvidia-green" />

              <div className="flex items-center gap-3 mb-4 border-b border-hairline pb-4">
                <Crosshair size={24} className="text-nvidia-green animate-[spin_4s_linear_infinite]" />
                <h3 className="tracking-tight text-sm font-bold text-white tracking-widest uppercase">Status Warnet</h3>
              </div>

              <div className="space-y-4 tracking-tight text-[11px]">
                <div className="flex justify-between">
                  <span className="text-white/50">TOTAL PC</span>
                  <span className="text-nvidia-green font-bold">{totalPcs} Unit Ready</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">IN QUEUE</span>
                  <span className="text-warning font-bold">{bookedPcsCount} PC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">HARGA / JAM</span>
                  <span className="text-nvidia-green font-bold">Rp 4.000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50">KONEKSI</span>
                  <div className="w-24 h-1.5 bg-surface-soft rounded-full overflow-hidden self-center">
                    <motion.div
                      animate={{ width: ["30%", "70%", "45%", "85%"] }}
                      transition={{ duration: 5, repeat: Infinity, repeatType: "mirror" }}
                      className="h-full bg-nvidia-green"
                    />
                  </div>
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
                <CaretLeft size={24} weight="bold" />
              </button>
              <button
                onClick={() => setActiveCategory(prev => Math.min(prev + 1, 2))}
                disabled={activeCategory === 2}
                className={`absolute right-2 md:right-12 z-50 w-12 h-12 flex items-center justify-center rounded-[2px] border transition-all 
                  ${activeCategory === 2
                    ? "bg-black/20 border-white/10 text-white/20 cursor-not-allowed"
                    : `bg-black/50 ${CAROUSEL_THEMES[activeCategory].border30} ${CAROUSEL_THEMES[activeCategory].text} hover:bg-white/10`}`}
              >
                <CaretRight size={24} weight="bold" />
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
                                        {category.type === "spesial" ? <Star weight="fill" size={12} className="text-amber-400" /> : <CaretRight weight="bold" size={12} />}
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
            <div className="nvidia-card p-12 flex-1 flex flex-col items-center justify-center text-white/40 tracking-tight text-sm uppercase">
              &gt; BELUM ADA DATA ANTREAN DENGAN FILTER INI
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredBookings.map((b) => {
                const pc = db.pcs?.find((p: PC) => p.id === b.pc_id);
                const pkg = db.pakets?.find((p: Paket) => p.id === b.paket_id);
                const isPending = b.status === "pending";

                return (
                  <motion.div
                    key={b.id}
                    variants={itemVariants}
                    className="nvidia-card p-6 md:p-8 flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-nvidia-green/50 transition-all bg-black/60 backdrop-blur-md"
                  >
                    <div className="nvidia-corner"></div>

                    <div className="flex items-center justify-between pb-4 md:pb-6 border-b border-hairline">
                      <div className="flex items-center gap-3">
                        {isPending ? (
                          <Clock size={24} className="text-warning-bright animate-pulse" />
                        ) : (
                          <CheckCircle size={24} className="text-nvidia-green" weight="fill" />
                        )}
                        <span className="font-bold text-white text-base md:text-lg uppercase tracking-tight">{b.player_name}</span>
                      </div>
                      <span className="text-xs md:text-sm text-white/40 font-bold font-mono">
                        {new Date(b.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>

                    <div className="grid grid-cols-[auto_1fr] gap-4 text-xs md:text-sm bg-black/50 p-4 md:p-6 rounded-[2px] border border-white/5">
                      <div className="flex flex-col gap-1 pr-2">
                        <span className="text-[10px] md:text-xs text-white/40 uppercase font-bold">TARGET PC</span>
                        <span className="text-nvidia-green font-bold text-sm md:text-base uppercase">{pc?.name || b.pc_id}</span>
                      </div>
                      <div className="flex flex-col gap-1 text-right min-w-0">
                        <span className="text-[10px] md:text-xs text-white/40 uppercase font-bold">PAKET / TARIF</span>
                        <span className="text-white/90 font-bold text-sm md:text-base line-clamp-2 leading-tight">{pkg?.name || "Custom"}</span>
                        <span className="text-nvidia-green font-bold text-xs md:text-sm">RP {pkg?.price?.toLocaleString("id-ID")}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 md:pt-4">
                      <span className={`px-3 py-1.5 md:px-4 md:py-2 rounded-[2px] text-[10px] md:text-xs font-bold uppercase tracking-widest ${isPending
                        ? 'bg-warning/10 text-warning border border-warning/30'
                        : 'bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/30'
                        }`}>
                        {isPending ? 'MENUNGGU VERIFIKASI' : 'BOOKING AKTIF'}
                      </span>
                      <span className="text-white/30 text-xs md:text-sm font-mono">#{b.id.slice(-5)}</span>
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
        className="relative z-20 py-10 md:py-24 scroll-mt-16 md:min-h-[90vh] flex flex-col"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="max-w-[1800px] w-full mx-auto px-6 flex-1 flex flex-col">
          <div className="w-full relative overflow-hidden flex-1 flex flex-col">
            <AnimatePresence mode="popLayout">
              {bookingStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full flex-1 nvidia-card p-8 flex flex-col"
                >
                  <div className="nvidia-corner"></div>

                  {/* Step 1 Header */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-6 border-b border-hairline">
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight uppercase tracking-tight">Step 1: Pilih PC Untuk Main</h2>
                      <p className="text-sm text-white/60 mt-1 tracking-tight">Klik PC yang kamu main main, lihat spesisifkasi PC di bagian <a href="#showcase" onClick={(e) => { e.preventDefault(); document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-nvidia-green hover:text-nvidia-green/80 transition-colors cursor-pointer">PC Showcase</a></p>
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
                        const diff = pc.expected_empty_time ? new Date(pc.expected_empty_time).getTime() - now : 0;
                        const isTimerActive = diff > 0;
                        const mins = Math.floor(diff / 60000);
                        const secs = Math.floor((diff % 60000) / 1000);
                        const firstBooking = pcBookings[0];
                        const isPending = firstBooking?.status === 'pending';

                        return (
                          <motion.button
                            variants={itemVariants}
                            whileHover={{ scale: 1.03, borderColor: "#76b900" }}
                            whileTap={{ scale: 0.97 }}
                            key={pc.id}
                            onClick={() => handlePcClick(pc.id)}
                            className={`
                              relative flex flex-col items-start justify-between p-3 md:p-4 rounded-[2px] transition-all border border-hairline overflow-hidden group h-full
                              ${isSelected
                                ? "bg-nvidia-green/10 border-nvidia-green text-nvidia-green shadow-[inset_0_0_20px_rgba(118,185,0,0.2)]"
                                : "bg-surface-dark text-white hover:border-white/50"
                              }
                            `}
                          >
                            {!isSelected && (
                              <div className="absolute inset-0 bg-nvidia-green/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            )}

                            {/* Watermark Icon */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                              <Monitor size={80} weight="duotone" className={isSelected ? "text-nvidia-green" : "text-white"} />
                            </div>

                            <div className="flex justify-between w-full relative z-10 mb-2 items-start gap-2">
                              <span className="font-sans text-sm md:text-base font-black tracking-tighter uppercase leading-tight">
                                {pc.name}
                              </span>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <Monitor
                                  size={18}
                                  weight={isSelected ? "fill" : "regular"}
                                  className={`md:w-[20px] md:h-[20px] mb-1 ${isSelected ? "text-nvidia-green" : "text-white/30 group-hover:text-white/60"}`}
                                />
                                {pcBookings.length > 0 && (
                                  <span className={`text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-[2px] font-bold uppercase tracking-widest text-center leading-[1.2] max-w-[65px] md:max-w-none ${isPending ? 'bg-warning text-black' : 'bg-nvidia-green text-black'}`}>
                                    {isPending ? 'Menunggu Admin' : 'Booked'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {isTimerActive && (
                              <div className="w-full bg-warning/10 border border-warning/20 p-1.5 rounded-[2px] flex items-center justify-between mb-2 z-10">
                                <span className="text-[9px] text-warning font-bold uppercase tracking-widest">Sisa Waktu</span>
                                <span className="text-[11px] tracking-tight text-warning font-bold tracking-wider">
                                  {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
                                </span>
                              </div>
                            )}

                            <div className="flex-1 w-full relative z-10 flex flex-col gap-1.5 mt-2 justify-center">
                              {pcBookings.length > 0 ? (
                                <div className="flex flex-col w-full h-full gap-1.5 justify-center">
                                  {pcBookings.slice(0, 3).map((b, i) => {
                                    const paket = db?.pakets?.find(p => p.id === b.paket_id);
                                    const pName = paket?.name || "Custom";
                                    return (
                                      <div key={b.id} className="flex flex-col justify-center gap-1.5 w-full">
                                        <div className="flex items-start gap-2">
                                          <User size={14} weight="fill" className={`shrink-0 mt-0.5 ${isSelected ? 'text-nvidia-green' : 'text-white/50'}`} />
                                          <span className="text-[12px] uppercase font-bold text-white/90 line-clamp-2 leading-tight">{b.player_name || "Guest"}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <Package size={14} weight="fill" className={`shrink-0 mt-0.5 ${isSelected ? 'text-nvidia-green' : 'text-white/50'}`} />
                                          <span className="text-[12px] font-bold text-white/70 line-clamp-2 leading-tight">{pName}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {pcBookings.length > 3 && (
                                    <div className="text-[9px] text-white/50 font-bold text-center mt-1 uppercase tracking-widest border-t border-hairline pt-1.5 shrink-0">
                                      +{pcBookings.length - 3} Antrean Lainnya
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className={`text-sm md:text-base h-full tracking-tight font-bold uppercase flex items-center justify-center gap-2 transition-colors ${isSelected ? 'text-nvidia-green' : 'text-white/30'}`}>
                                  {isSelected ? <><CheckCircle size={20} weight="fill" /> DIPILIH</> : "READY TO BOOK"}
                                </div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}

                  <div className="mt-auto pt-6 border-t border-hairline flex justify-end">
                    <button
                      onClick={handleNextStep}
                      disabled={!selectedPc}
                      className={`px-8 py-3 tracking-tight font-bold uppercase tracking-widest text-sm rounded-[2px] transition-all ${selectedPc
                        ? "bg-nvidia-green text-black hover:bg-white hover:text-black shadow-[0_0_20px_rgba(118,185,0,0.3)]"
                        : "bg-surface-soft text-white/20 cursor-not-allowed border border-hairline"
                        }`}
                    >
                      {selectedPc ? (
                        <span className="flex items-center gap-2">
                          Lanjut ke Pembayaran <ArrowRight weight="bold" size={16} />
                        </span>
                      ) : (
                        "Pilih PC Dulu Bro"
                      )}
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
                  className="w-full max-w-2xl mx-auto flex-1 nvidia-card p-4 sm:p-8 flex flex-col"
                >
                  <div className="nvidia-corner"></div>

                  <div className="flex items-center gap-4 mb-6 border-b border-hairline pb-4">
                    <button
                      onClick={() => {
                        setBookingStep(1);
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-surface-dark border border-hairline rounded-[2px] text-white hover:border-nvidia-green hover:text-nvidia-green transition-colors shrink-0"
                    >
                      <CaretLeft size={20} weight="bold" />
                    </button>
                    <div>
                      <h3 className="text-xl font-bold text-white uppercase tracking-tight tracking-tight">Step 2: Identitas & Pembayaran</h3>
                      <p className="text-xs text-white/50 tracking-tight">PC Terpilih: <strong className="text-nvidia-green">{db?.pcs?.find(p => p.id === selectedPc)?.name || selectedPc}</strong></p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-6">
                    {/* Identitas */}
                    <div>
                      <label className="text-[11px] font-bold text-white mb-2 block uppercase tracking-widest tracking-tight">
                        Nama Panggilan Lu
                      </label>
                      <input
                        type="text"
                        value={playerName}
                        onChange={e => setPlayerName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('portal-paket')?.focus(); } }}
                        placeholder="e.g. Bang Jago"
                        className="w-full bg-surface-dark border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm focus:border-nvidia-green outline-none"
                      />
                    </div>

                    {/* Package Selection */}
                    <div className="flex flex-col h-[280px]">
                      <label className="text-[11px] font-bold text-white mb-2 block uppercase tracking-widest tracking-tight shrink-0">
                        Cari / Bikin Paket Booking
                      </label>
                      <input
                        id="portal-paket"
                        type="text"
                        value={searchPaket}
                        onChange={e => setSearchPaket(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('portal-paket')?.blur(); } }}
                        placeholder="e.g. 6000 atau Paket Malam"
                        className="w-full bg-black/40 border border-white/10 text-white p-3 rounded-t-xl tracking-tight text-sm focus:border-nvidia-green focus:bg-surface-dark outline-none transition-colors shrink-0 mb-2"
                      />
                      <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
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
                              <div className="p-4 text-center text-white/40 tracking-tight text-xs border border-dashed border-white/10 rounded-xl">
                                {(parsedPrice > 0 && parsedPrice < 3000)
                                  ? "Minimal booking Rp 3.000 boss"
                                  : "Paket nggak ketemu"}
                              </div>
                            );
                          }

                          return displayPkgs.map((pkg) => {
                            const isSelected = selectedPaket === pkg.id;
                            const isCustom = pkg.id.startsWith('custom-');
                            return (
                              <button
                                key={pkg.id}
                                onClick={() => setSelectedPaket(pkg.id)}
                                className={`
                                    relative group flex items-center justify-between px-4 py-3 rounded-xl tracking-tight transition-all duration-300 w-full overflow-hidden outline-none shrink-0
                                    ${isSelected
                                    ? "bg-nvidia-green/10 border border-nvidia-green/50 shadow-[0_0_15px_rgba(118,185,0,0.15)]"
                                    : isCustom ? "bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/50" : "bg-black/40 border border-white/5 hover:border-white/20 hover:bg-black/60"
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
                                  <span className={`text-xs md:text-sm font-bold tracking-tight uppercase ${isSelected ? "text-nvidia-green drop-shadow-[0_0_8px_rgba(118,185,0,0.8)]" : isCustom ? "text-blue-400" : "text-white/70 group-hover:text-white"} transition-all duration-300`}>
                                    {pkg.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 relative z-10">
                                  <span className={`text-[11px] md:text-xs font-bold ${isSelected ? "text-nvidia-green" : "text-white/40 group-hover:text-white/80"} transition-colors`}>
                                    RP {pkg.price.toLocaleString("id-ID")}
                                  </span>
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? "border-nvidia-green bg-nvidia-green/20" : "border-white/20 group-hover:border-white/40"}`}>
                                    {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="w-2 h-2 bg-nvidia-green rounded-full shadow-[0_0_8px_rgba(118,185,0,1)]" />}
                                  </div>
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* QRIS / Upload Bukti */}
                    <div className="bg-surface-soft p-4 border border-hairline rounded-[2px] text-center">
                      <div className="flex flex-col gap-2 mb-4">
                        <label className="text-[11px] font-bold text-white uppercase tracking-widest tracking-tight">Metode Pembayaran</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setPaymentMethod('kasir')}
                            className={`p-3 tracking-tight text-xs border transition-colors ${paymentMethod === 'kasir' ? 'bg-nvidia-green/10 border-nvidia-green text-nvidia-green' : 'bg-surface-dark border-hairline text-white/50 hover:border-white/30'}`}
                          >
                            BAYAR DI KASIR
                          </button>
                          <button
                            onClick={() => setPaymentMethod('qris')}
                            className={`p-3 tracking-tight text-xs border transition-colors ${paymentMethod === 'qris' ? 'bg-nvidia-green/10 border-nvidia-green text-nvidia-green' : 'bg-surface-dark border-hairline text-white/50 hover:border-white/30'}`}
                          >
                            QRIS (DANA)
                          </button>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {paymentMethod === 'kasir' && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                            <p className="text-xs text-white/50 tracking-tight italic">
                              *Booking masuk antrean. Siapkan uang pas di meja kasir. Info: prioritas mungkin didahului oleh user yang bayar via QRIS.
                            </p>
                          </motion.div>
                        )}

                        {paymentMethod === 'qris' && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col mb-4 overflow-hidden">
                            <button
                              onClick={() => setShowQrModal(true)}
                              className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 bg-surface-dark border border-nvidia-green/30 text-nvidia-green hover:bg-nvidia-green hover:text-black transition-all tracking-tight font-bold text-xs uppercase tracking-widest group rounded-[2px]"
                            >
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75 group-hover:bg-black"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-nvidia-green group-hover:bg-black"></span>
                              </span>
                              Tampilkan QRIS (DANA)
                            </button>
                            <label className="nvidia-button w-full flex justify-center items-center gap-2 cursor-pointer text-xs">
                              <UploadSimple weight="bold" size={16} />
                              {ssFile ? "Bukti Ter-Upload!" : "Upload Bukti Transfer"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    if (file.size > 2 * 1024 * 1024) {
                                      alert("File terlalu besar! Max 2MB ya boss.");
                                      e.target.value = "";
                                      return;
                                    }
                                    setSsFile(file);
                                  }
                                }}
                              />
                            </label>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Payment Action */}
                    <div className="border-t border-hairline pt-4 flex flex-col gap-3">
                      <motion.button
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handlePayment}
                        className={`w-full nvidia-button text-sm uppercase tracking-widest ${loading ? 'opacity-50' : ''}`}
                      >
                        {loading ? 'MEMPROSES...' : 'KIRIM BOOKING'}
                      </motion.button>

                      {/* Syarat & Ketentuan Button */}
                      <button
                        onClick={() => setShowTcModal(true)}
                        className="text-[10px] text-white/40 hover:text-nvidia-green tracking-tight uppercase tracking-widest underline underline-offset-4 transition-colors flex items-center justify-center gap-2 mt-1"
                      >
                        Baca Syarat & Ketentuan
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
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Clock size={20} weight="fill" className="text-purple-400 shrink-0" /> Dateng On-Time Yuk!</h3>
                    <p>Kalo kamu udah <em>booking</em>, usahain on-time ya! Kita kasih toleransi telat maksimal <strong>5 menit</strong>. Lewat dari itu, argometernya otomatis jalan atau PC-nya bakal kita oper ke <em>player</em> lain yang udah standby duluan. Hargain waktu sesama <em>gamers</em> yuk!</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Crown size={20} weight="fill" className="text-purple-400 shrink-0" /> Prioritas Walk-in & Antrean</h3>
                    <p>Booking web ini gunanya buat <strong>masuk ke dalam antrean</strong>. <em>Gamers</em> yang datang langsung (<em>walk-in</em>) ke warnet tetep dapet prioritas utama kalau ada PC kosong. Kalau kamu <em>booking</em> buat main setelah sesi orang lain, pastiin kamu udah <em>standby</em> di lokasi sebelum durasinya habis biar bisa langsung sambung main!</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Hamburger size={20} weight="fill" className="text-purple-400 shrink-0" /> Urusan Makanan dan Minuman</h3>
                    <p>Dilarang keras bawa <em>F&B</em> dari luar yang gampang tumpah, berminyak, apalagi berpotensi merusak <em>gear</em> warnet kita. Gak usah repot, <em>order</em> aja langsung di kantin GC Net! Variannya banyak, harga cincai, dan wadahnya dijamin aman buat nge-game.</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><CigaretteSlash size={20} weight="fill" className="text-purple-400 shrink-0" /> Area Bebas Asap</h3>
                    <p>Seluruh ruangan GC Net itu 100% bebas asap ya, <em>guys</em>. Buat kamu yang mau sebat atau nge-<em>vape</em>, silakan <em>melipir</em> ke area luar warnet. Biar tetep adem dan wangi buat semua <em>user</em>.</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Money size={20} weight="fill" className="text-purple-400 shrink-0" /> No Refund Ya</h3>
                    <p>Buat paket <em>booking</em> atau waktu <em>custom</em> yang udah sukses di-<em>checkout</em> dan aktif, otomatis <strong>gak bisa di-refund</strong> atau dibatalin. Jadi pastiin lagi semuanya udah pas sebelum bayar!</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Warning size={20} weight="fill" className="text-purple-400 shrink-0" /> Anti-Cheat & Fair Play</h3>
                    <p>Main bersih itu keren! Kalo sampai ketahuan pake <em>cheat</em>, aplikasi ilegal, atau <em>browsing</em> yang aneh-aneh, sanksinya auto <strong>diomelin</strong> sama abang-abangan GC Net. <em>Play fair, play safe!</em></p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Sparkle size={20} weight="fill" className="text-purple-400 shrink-0" /> Jaga Kebersihan Bareng</h3>
                    <p>Biar mainnya makin <em>pewe</em>, yuk sama-sama jaga kebersihan area dan <em>gear</em> yang kamu pake. Jangan lupa buang sisa sampahmu pada tempatnya ya!</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-[2px] group hover:bg-purple-500/10 transition-colors">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Monitor size={20} weight="fill" className="text-purple-400 shrink-0" /> Request Install Game?</h3>
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
                <WarningCircle size={32} weight="fill" className="text-warning shrink-0" />
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
                <CheckCircle size={32} weight="fill" className="text-nvidia-green shrink-0" />
                <h3 className="text-nvidia-green font-bold uppercase tracking-widest tracking-tight text-sm">BOOKING BERHASIL</h3>
              </div>
              <p className="text-white/70 tracking-tight text-xs mb-6 leading-relaxed">
                Data lu udah masuk ke meja admin. Silakan tunggu konfirmasi atau tanya admin yang lagi jaga buat mastiin ya bos. Gas main!
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-6 py-2 bg-nvidia-green text-black hover:bg-[#88d600] text-[10px] font-bold uppercase transition-colors"
                >
                  Okey
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
