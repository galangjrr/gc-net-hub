"use client";

import { useState, useEffect, useRef } from "react";
import { Database, CheckCircle2, Clock, XCircle, Image as ImageIcon, Plus, Search, Monitor, Sparkles, RotateCw, Pencil, Check, Trash2, Hourglass, User, Play, X, Volume2, VolumeX, Banknote, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import useSound from "use-sound";
import type { DatabaseSchema, Booking, PC, Paket } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import PinGuard from "@/components/PinGuard";

export default function DataBookingPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const prevPendingCount = useRef<number>(0);
  const triggeredExpiredPcIds = useRef<Set<string>>(new Set());

  // 10-second buzzer alarm via use-sound
  const [playAlarm, { stop: stopAlarm }] = useSound('/sounds/timer-alarm-10s.wav', {
    volume: 0.85,
    onend: () => setIsAlarmPlaying(false)
  });

  const triggerAlarm = () => {
    try {
      playAlarm();
      setIsAlarmPlaying(true);
    } catch (_) {}
  };

  const handleStopAlarm = () => {
    stopAlarm();
    setIsAlarmPlaying(false);
  };

  const [showManual, setShowManual] = useState(false);
  const [manualData, setManualData] = useState({ playerName: "", pcId: "", searchPc: "" });
  const [showPcList, setShowPcList] = useState(false);
  const [buktiImage, setBuktiImage] = useState<string | null>(null);
  const [searchPaket, setSearchPaket] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPaket, setSelectedPaket] = useState<string | null>(null);

  const playerInputRef = useRef<HTMLInputElement | null>(null);
  const pcInputRef = useRef<HTMLInputElement | null>(null);
  const paketInputRef = useRef<HTMLInputElement | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  // Custom Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    description: string;
    confirmLabel: string;
    confirmVariant?: 'primary' | 'danger';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "Konfirmasi",
    confirmVariant: "primary",
    onConfirm: () => {}
  });

  const closeConfirm = () => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  // Auto focus Nama Pemain whenever manual modal opens
  useEffect(() => {
    if (showManual) {
      setTimeout(() => {
        playerInputRef.current?.focus();
      }, 50);
    }
  }, [showManual]);

  // Global Keyboard Shortcuts (F2 = Buka Tambah Booking, Enter = Konfirmasi Modal, Escape = Tutup Modal)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (confirmState.isOpen) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const action = confirmState.onConfirm;
          closeConfirm();
          action();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          closeConfirm();
          return;
        }
      }

      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInputActive = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

      if (e.key === 'F2' || (!isInputActive && !showManual && !confirmState.isOpen && (e.key === 'n' || e.key === 'N'))) {
        e.preventDefault();
        setEditBookingId(null);
        setManualData({ playerName: "", pcId: "", searchPc: "" });
        setSearchPaket("");
        setSelectedPaket(null);
        setShowManual(true);
      }
      if (e.key === 'Escape') {
        if (showManual) {
          setShowManual(false);
          setEditBookingId(null);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [confirmState, showManual]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchPaket);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchPaket]);

  const loadData = async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDb(data);

        // Sound effect on new pending booking
        const pendingCount = data?.bookings?.filter((b: Booking) => b.status === "pending").length || 0;
        if (pendingCount > prevPendingCount.current) {
          try {
            const audio = new Audio("/sounds/new-booking.mp3");
            audio.play().catch(() => {});
          } catch (_) {}
        }
        prevPendingCount.current = pendingCount;
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);

    // Fast 1-second ticker to check countdown expiry and trigger 10s buzzer alarm
    const timerTicker = setInterval(() => {
      if (!db?.pcs) return;
      const now = Date.now();
      
      db.pcs.forEach((pc: PC) => {
        if (pc?.expected_empty_time) {
          const expTime = new Date(pc.expected_empty_time).getTime();
          // If expired within the last 20 seconds and haven't triggered yet
          if (expTime <= now && now - expTime < 20000 && !triggeredExpiredPcIds.current.has(pc.id)) {
            triggeredExpiredPcIds.current.add(pc.id);
            triggerAlarm();
          }
        }
      });
    }, 1000);

    const channel = supabase
      .channel('public:gc-booking-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pcs' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      clearInterval(timerTicker);
    };
  }, [db]);

  const executeAction = async (id: string, action: 'approve' | 'reject' | 'complete', reason = '') => {
    setLoadingId(id);
    const prevDb = db;

    // Optimistic UI Update: 0ms latency update in React memory
    if (action === 'complete' || action === 'reject') {
      setDb(prev => {
        if (!prev) return prev;
        const targetBooking = prev.bookings.find(b => b.id === id);
        return {
          ...prev,
          bookings: prev.bookings.filter(b => b.id !== id),
          pcs: prev.pcs.map(p => {
            if (targetBooking && p.id === targetBooking.pc_id) {
              return { ...p, expected_empty_time: undefined, status: 'available' };
            }
            return p;
          })
        };
      });
    } else if (action === 'approve') {
      setDb(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          bookings: prev.bookings.map(b => b.id === id ? { ...b, status: 'active' } : b)
        };
      });
    }

    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason })
      });
      if (!res.ok) throw new Error("Gagal memproses aksi");
      // Background silent re-sync
      loadData();
    } catch (err) {
      setDb(prevDb);
      alert("Gagal memproses aksi. Perubahan dikembalikan.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleAction = (id: string, action: 'approve' | 'reject' | 'complete', playerName?: string, pcName?: string) => {
    if (action === 'complete') {
      setConfirmState({
        isOpen: true,
        title: "Pemain Masuk Main",
        subtitle: (pcName || "Unit PC").toUpperCase(),
        description: `Pemain ${playerName || 'pelanggan'} sudah di ${pcName || 'PC'}? Tandai booking selesai dan pemain mulai main.`,
        confirmLabel: "Tandai Masuk",
        confirmVariant: "primary",
        onConfirm: () => executeAction(id, 'complete')
      });
    } else if (action === 'approve') {
      setConfirmState({
        isOpen: true,
        title: "Verifikasi Booking PC",
        subtitle: (pcName || "Unit PC").toUpperCase(),
        description: `Verifikasi pembayaran dan masukkan pemain ${playerName || ''} ke daftar booking terkonfirmasi.`,
        confirmLabel: "Konfirmasi",
        confirmVariant: "primary",
        onConfirm: () => executeAction(id, 'approve')
      });
    } else if (action === 'reject') {
      const res = prompt("Alasan pembatalan booking:");
      if (res === null) return;
      executeAction(id, 'reject', res || "Dibatalkan Kasir");
    }
  };

  const handleEditClick = (b: Booking) => {
    setEditBookingId(b.id);
    const pcName = db?.pcs?.find(p => p.id === b.pc_id)?.name || "";
    setManualData({ playerName: b.player_name, pcId: b.pc_id, searchPc: pcName });
    setSelectedPaket(b.paket_id);
    setShowManual(true);
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: "Hapus Booking PC",
      subtitle: "Batalkan Booking",
      description: `Hapus data booking pemain ${name} dari daftar antrean.`,
      confirmLabel: "Hapus",
      confirmVariant: "danger",
      onConfirm: async () => {
        const prevDb = db;
        // Optimistic delete: remove instantly from UI
        setDb(prev => prev ? ({
          ...prev,
          bookings: prev.bookings.filter(b => b.id !== id)
        }) : prev);

        setLoadingId(id);
        try {
          const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Gagal menghapus antrean");
          loadData();
        } catch (err: any) {
          setDb(prevDb);
          alert(err?.message || "Gagal menghapus antrean");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  const handleManualSubmit = async () => {
    let finalPcId = manualData.pcId;
    if (!finalPcId && manualData.searchPc) {
      const matched = db?.pcs?.find(p => p.name.toLowerCase() === manualData.searchPc.toLowerCase());
      if (matched) finalPcId = matched.id;
    }

    if (!finalPcId || !selectedPaket) return alert("Lengkapi data PC dan Paket!");
    
    // Auto-generate name if left empty
    let finalPlayerName = manualData.playerName.trim();
    if (!finalPlayerName) {
      const nextNum = (db?.settings?.user_counter || 80) + 1;
      finalPlayerName = `User ${nextNum}`;
    }

    let finalPaketId = selectedPaket;
    
    if (selectedPaket.startsWith("custom-")) {
      const priceNum = parseInt(selectedPaket.replace("custom-", ""));
      const mins = (priceNum / 1000) * 15;
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      let timeStr = "";
      if (hours > 0) timeStr += `${hours} Jam `;
      if (remMins > 0) timeStr += `${remMins} Menit`;

      const newPaketRes = await fetch("/api/pakets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Personal ${timeStr.trim()}`, price: priceNum, is_custom: true })
      });
      const createdPaket = await newPaketRes.json();
      finalPaketId = createdPaket.id;
    }

    // Optimistic UI for manual booking: show in table instantly
    if (!editBookingId) {
      const tempId = `GC-TEMP-${Date.now().toString().slice(-4)}`;
      const newBooking: Booking = {
        id: tempId,
        pc_id: finalPcId,
        paket_id: finalPaketId,
        player_name: finalPlayerName,
        status: 'active',
        created_at: new Date().toISOString()
      };
      setDb(prev => prev ? ({ ...prev, bookings: [newBooking, ...prev.bookings] }) : prev);
    }

    setShowManual(false);
    setEditBookingId(null);
    setManualData({ playerName: "", pcId: "", searchPc: "" });
    setSearchPaket("");
    setSelectedPaket(null);

    setLoadingId("manual-loading");
    try {
      if (editBookingId) {
        await fetch(`/api/bookings/${editBookingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: 'edit_booking',
            pc_id: finalPcId,
            player_name: finalPlayerName,
            paket_id: finalPaketId
          })
        });
      } else {
        await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pc_id: finalPcId,
            paket_id: finalPaketId,
            player_name: finalPlayerName,
            is_admin_manual: true
          })
        });
      }
      await loadData();
    } catch (err) {
      alert("Gagal menyimpan antrean.");
      await loadData();
    } finally {
      setLoadingId(null);
    }
  };

  const showBukti = async (bookingId: string, directSs?: string) => {
    if (directSs) {
      setBuktiImage(directSs);
      return;
    }
    setLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ss_bukti) {
          setBuktiImage(data.ss_bukti);
        } else {
          alert("Pemain tidak melampirkan screenshot bukti transfer.");
        }
      } else {
        alert("Bukti pembayaran tidak ditemukan.");
      }
    } catch (_) {
      alert("Gagal memuat bukti pembayaran.");
    } finally {
      setLoadingId(null);
    }
  };

  if (!db) return <div className="p-8 tracking-tight text-white/50 uppercase text-xs animate-pulse">MEMUAT DATA ANTREAN...</div>;

  const allBookings = db.bookings || [];
  const pendingCount = allBookings.filter(b => b.status === "pending").length;
  const activeCount = allBookings.filter(b => b.status === "active").length;

  const filteredBookings = allBookings.filter(b => {
    if (filterTab === 'pending' && b.status !== 'pending') return false;
    if (filterTab === 'active' && b.status !== 'active') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.player_name.toLowerCase().includes(q);
      const matchPc = b.pc_id.toLowerCase().includes(q) || (db.pcs.find(p => p.id === b.pc_id)?.name.toLowerCase().includes(q));
      return matchName || matchPc;
    }
    return true;
  });

  return (
    <PinGuard>
      <div className="min-h-screen bg-surface-dark p-4 md:p-8 xl:p-10 pt-16 md:pt-8 text-white space-y-6 pb-32">
        <div className="w-full max-w-6xl 2xl:max-w-[1360px] mx-auto space-y-6">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-4 xl:pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-nvidia-green/10 border border-nvidia-green/30 rounded-xl text-nvidia-green shrink-0">
                <Database size={32} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl 2xl:text-4xl font-bold uppercase tracking-tight text-white">
                    Data Booking PC
                  </h1>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-nvidia-green"></span>
                  </span>
                </div>
                <p className="text-xs xl:text-sm text-white/50 tracking-tight mt-1">
                  Verifikasi pembayaran QRIS, catat booking PC, dan pantau giliran main
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAlarmPlaying && (
                <button
                  onClick={handleStopAlarm}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition animate-bounce shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                >
                  <VolumeX size={16} />
                  Matikan Alarm 10 Detik
                </button>
              )}
              <button
                onClick={loadData}
                className="p-2.5 bg-surface hover:bg-white/10 border border-hairline rounded-lg text-white/70 hover:text-white transition"
                title="Segarkan Data"
              >
                <RotateCw size={18} />
              </button>
            </div>
          </div>

          {/* Action Toolbar: Tambah Booking + Filter Tabs + Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 xl:gap-3">
              <button
                onClick={() => {
                  setEditBookingId(null);
                  setManualData({ playerName: "", pcId: "", searchPc: "" });
                  setSearchPaket("");
                  setSelectedPaket(null);
                  setShowManual(true);
                }}
                className="flex items-center gap-2 px-4 xl:px-5 py-2.5 bg-nvidia-green text-black hover:bg-[#88d600] font-bold text-xs xl:text-sm uppercase tracking-wider rounded-xl transition shadow-[0_0_20px_rgba(118,185,0,0.25)] shrink-0 active:scale-95"
              >
                <Plus size={16} className="stroke-[2.5]" />
                <span>Tambah Booking</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-black/20 text-black/80 rounded border border-black/20">F2</kbd>
              </button>

              <div className="bg-surface border border-hairline/80 p-1 xl:p-1.5 rounded-xl flex items-center gap-1 xl:gap-2 overflow-x-auto shrink-0 shadow-inner">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3.5 xl:px-4 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-semibold tracking-wide transition flex items-center gap-2 shrink-0 ${
                    filterTab === 'all'
                      ? "bg-white/10 text-white border border-white/15 shadow-sm"
                      : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span>Semua Antrean</span>
                  <span className={`px-1.5 xl:px-2 py-0.2 rounded-md tabular-nums font-bold text-[10px] xl:text-xs ${
                    filterTab === 'all' ? "bg-white/20 text-white" : "bg-white/5 text-white/40"
                  }`}>
                    {allBookings.length}
                  </span>
                </button>
                <button
                  onClick={() => setFilterTab('pending')}
                  className={`px-3.5 xl:px-4 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-semibold tracking-wide transition flex items-center gap-2 shrink-0 ${
                    filterTab === 'pending'
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                      : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full bg-amber-400 ${pendingCount > 0 ? "animate-pulse" : ""}`}></span>
                  <span>Menunggu Verifikasi</span>
                  <span className={`px-1.5 xl:px-2 py-0.2 rounded-md tabular-nums font-bold text-[10px] xl:text-xs ${
                    filterTab === 'pending' ? "bg-amber-400/20 text-amber-300" : "bg-white/5 text-white/40"
                  }`}>
                    {pendingCount}
                  </span>
                </button>
                <button
                  onClick={() => setFilterTab('active')}
                  className={`px-3.5 xl:px-4 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-semibold tracking-wide transition flex items-center gap-2 shrink-0 ${
                    filterTab === 'active'
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                      : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Terkonfirmasi</span>
                  <span className={`px-1.5 xl:px-2 py-0.2 rounded-md tabular-nums font-bold text-[10px] xl:text-xs ${
                    filterTab === 'active' ? "bg-emerald-400/20 text-emerald-300" : "bg-white/5 text-white/40"
                  }`}>
                    {activeCount}
                  </span>
                </button>
              </div>
            </div>

            <div className="relative w-full sm:w-64 xl:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari pemain atau PC..."
                className="w-full bg-surface border border-hairline p-2.5 xl:p-3 pl-9 xl:pl-10 rounded-lg text-xs xl:text-sm text-white placeholder:text-white/40 focus:border-nvidia-green outline-none"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            </div>
          </div>

          {/* Desktop Card-Rows View */}
          <div className="hidden lg:block overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[980px] text-left text-xs whitespace-nowrap border-separate border-spacing-y-3">
              <thead>
                <tr className="text-white/40 text-[11px] xl:text-xs uppercase tracking-wider font-bold">
                  <th className="pb-1 pl-6 pr-4 font-bold text-white/60 w-[24%]">Target PC & Status</th>
                  <th className="pb-1 px-4 font-bold text-white/60 w-[18%]">Paket / Tarif</th>
                  <th className="pb-1 px-4 font-bold text-white/60 w-[18%]">Pemain</th>
                  <th className="pb-1 px-4 font-bold text-white/60 w-[15%]">Status</th>
                  <th className="pb-1 px-4 font-bold text-white/60 w-[11%]">Waktu Booking</th>
                  <th className="pb-1 pr-6 pl-4 text-right font-bold text-white/60 w-[14%]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const pc = db.pcs.find(p => p.id === b.pc_id);
                  const pkg = db.pakets.find(p => p.id === b.paket_id);
                  const resolvedPrice = pkg?.price || (b.paket_id?.startsWith('custom-') ? parseInt(b.paket_id.replace('custom-', '')) : 0);
                  const isPending = b.status === "pending";
                  const now = Date.now();
                  const diff = pc?.expected_empty_time ? new Date(pc.expected_empty_time).getTime() - now : 0;
                  const isExpired = !isPending && pc?.expected_empty_time && diff <= 0;
                  const isWarning = !isPending && pc?.expected_empty_time && diff > 0 && diff <= 10 * 60 * 1000;
                  const mins = Math.max(0, Math.floor(diff / 60000));

                  const pkgTitle = pkg?.name || (b.paket_id?.startsWith('custom-') ? 'Kustom' : 'Tarif Langsung');

                  // Hitung antrean untuk PC ini berdasarkan urutan waktu booking (FIFO)
                  const pcBookings = allBookings
                    .filter(item => item.pc_id === b.pc_id)
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                  const queueIndex = pcBookings.findIndex(item => item.id === b.id);
                  const isLayered = queueIndex > 0;
                  const prevPlayerName = isLayered ? pcBookings[queueIndex - 1]?.player_name : null;

                  const cardBorderClass = isExpired
                    ? "border-red-500/50 group-hover:border-red-500/80"
                    : isWarning
                    ? "border-amber-500/40 group-hover:border-amber-500/70"
                    : isPending
                    ? "border-amber-500/30 group-hover:border-amber-500/50"
                    : "border-white/5 group-hover:border-white/20";

                  return (
                    <motion.tr
                      key={b.id}
                      animate={isExpired ? {
                        backgroundColor: ["rgba(239, 68, 68, 0.08)", "rgba(239, 68, 68, 0.22)", "rgba(239, 68, 68, 0.08)"],
                      } : {}}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className={`transition-all shadow-md group ${
                        isExpired 
                          ? "bg-[#1d1214]" 
                          : isWarning 
                          ? "bg-[#1c1712] hover:bg-[#231b14]" 
                          : isPending
                          ? "bg-[#14151a] hover:bg-[#181a21]"
                          : "bg-[#111215] hover:bg-[#16171d]"
                      }`}
                    >
                      {/* 1. TARGET PC & STATUS */}
                      <td className={`py-4 xl:py-5 pl-6 pr-4 rounded-l-2xl border-y border-l transition ${cardBorderClass}`}>
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <Monitor size={16} className="text-nvidia-green shrink-0" />
                            <span className="font-bold text-sm xl:text-base text-white tracking-wide">
                              {(pc?.name || b.pc_id).toUpperCase()}
                            </span>
                          </div>
                          {isLayered ? (
                            <span className="text-xs font-semibold text-cyan-400/90 inline-flex items-center gap-1.5">
                              <Clock size={12} className="shrink-0 text-cyan-400" />
                              Nunggu {prevPlayerName}
                            </span>
                          ) : pc?.expected_empty_time ? (
                            <span className={`text-xs inline-flex items-center gap-1.5 tabular-nums ${
                              isExpired 
                                ? "text-red-400 font-semibold" 
                                : isWarning 
                                ? "text-amber-400 font-semibold" 
                                : "text-zinc-400"
                            }`}>
                              <Hourglass size={12} className={isExpired ? "animate-spin text-red-400" : isWarning ? "text-amber-400" : "text-zinc-400"} />
                              {isExpired 
                                ? "Waktu Bermain Habis" 
                                : `Sisa ${mins} menit`}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-400/90 inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              Booked
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. PAKET & TARIF */}
                      <td className={`py-4 xl:py-5 px-4 border-y transition ${cardBorderClass}`}>
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-xs xl:text-sm tracking-tight">
                            {pkgTitle}
                          </span>
                          <span className="text-xs xl:text-sm text-zinc-300 font-bold tabular-nums mt-0.5">
                            Rp {resolvedPrice.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </td>

                      {/* 3. PEMAIN */}
                      <td className={`py-4 xl:py-5 px-4 border-y transition ${cardBorderClass}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 xl:w-7 xl:h-7 rounded-lg bg-surface-soft border border-hairline/60 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {b.player_name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-xs xl:text-sm leading-tight">{b.player_name}</span>
                            <span className="text-[10px] font-mono font-bold text-nvidia-green/80 tracking-wider">
                              {b.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. STATUS */}
                      <td className={`py-4 xl:py-5 px-4 border-y transition ${cardBorderClass}`}>
                        <div className="flex flex-col gap-1 items-start">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
                              <Clock size={12} className="animate-spin" /> Verifikasi
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold tracking-wide animate-pulse">
                              <Hourglass size={12} /> Habis
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-bold tracking-wide">
                              <CheckCircle2 size={12} /> Terkonfirmasi
                            </span>
                          )}
                          <span className="text-xs text-zinc-400 pl-0.5 font-medium">
                            {b.ss_bukti ? 'QRIS DANA' : 'Kasir Tunai'}
                          </span>
                        </div>
                      </td>

                      {/* 5. WAKTU */}
                      <td className={`py-4 xl:py-5 px-4 border-y transition font-bold text-zinc-200 text-xs xl:text-sm tabular-nums ${cardBorderClass}`}>
                        {new Date(b.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} <span className="text-zinc-400 text-xs font-normal">WIB</span>
                      </td>

                      {/* 6. AKSI */}
                      <td className={`py-4 xl:py-5 pr-6 pl-4 text-right rounded-r-2xl border-y border-r transition ${cardBorderClass}`}>
                        <div className="flex items-center justify-end gap-2">
                          {isPending ? (
                            <>
                              {b.ss_bukti ? (
                                <button
                                  onClick={() => showBukti(b.id, b.ss_bukti)}
                                  className="px-2.5 xl:px-3 py-1.5 xl:py-2 bg-surface-soft hover:bg-white/10 border border-hairline/60 text-white/80 hover:text-white rounded-lg text-xs xl:text-sm font-semibold transition flex items-center gap-1.5"
                                >
                                  <ImageIcon size={14} /> Bukti
                                </button>
                              ) : (
                                <span className="px-2.5 xl:px-3 py-1.5 xl:py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] xl:text-xs font-medium rounded-lg inline-flex items-center gap-1.5">
                                  <Banknote size={13} /> Tagih Tunai
                                </span>
                              )}
                              <button
                                disabled={loadingId === b.id}
                                onClick={() => handleAction(b.id, 'approve')}
                                className="px-3.5 xl:px-4 py-1.5 xl:py-2 bg-nvidia-green hover:bg-[#88d600] text-black font-bold text-xs xl:text-sm rounded-lg transition shadow-sm flex items-center gap-1.5"
                              >
                                <Check size={14} /> Konfirmasi
                              </button>
                              <button
                                disabled={loadingId === b.id}
                                onClick={() => handleAction(b.id, 'reject')}
                                className="px-2.5 xl:px-3 py-1.5 xl:py-2 bg-error/10 hover:bg-error/20 text-error border border-error/30 rounded-lg text-xs xl:text-sm font-semibold transition"
                              >
                                Batal
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditClick(b)}
                                className="p-2 xl:p-2.5 bg-surface-soft hover:bg-white/10 text-white/60 hover:text-white border border-hairline/60 rounded-lg transition"
                                title="Ubah Data Booking"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                disabled={loadingId === b.id}
                                onClick={() => handleDelete(b.id, b.player_name)}
                                className="p-2 xl:p-2.5 bg-surface-soft hover:bg-error/20 text-white/60 hover:text-error border border-hairline/60 rounded-lg transition"
                                title="Hapus Antrean"
                              >
                                <Trash2 size={14} />
                              </button>

                              {isLayered ? (
                                <button
                                  disabled
                                  className="px-3.5 xl:px-4 py-2 xl:py-2.5 font-bold text-xs xl:text-sm rounded-lg bg-surface-soft/90 text-white/40 border border-hairline/60 cursor-not-allowed flex items-center gap-1.5 shrink-0 transition"
                                  title={`Nunggu ${prevPlayerName} mulai main`}
                                >
                                  <Lock size={13} className="shrink-0 text-white/40" />
                                  Lapis ke {queueIndex + 1}
                                </button>
                              ) : (
                                <button
                                  disabled={loadingId === b.id}
                                  onClick={() => handleAction(b.id, 'complete', b.player_name, pc?.name)}
                                  className={`px-4 xl:px-5 py-2 xl:py-2.5 font-bold text-xs xl:text-sm rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                                    isExpired
                                      ? "bg-nvidia-green hover:bg-[#88d600] text-black shadow-[0_0_15px_rgba(118,185,0,0.5)] animate-pulse"
                                      : "bg-nvidia-green hover:bg-[#88d600] text-black shadow-sm"
                                  }`}
                                >
                                  <Play size={13} className="fill-black" /> Mulai Main
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}

                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-white/30 text-xs uppercase tracking-widest font-bold bg-[#111215] rounded-2xl border border-white/5">
                      Tidak ada data antrean dalam kategori ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Advanced Mobile Cards View */}
          <div className="lg:hidden grid grid-cols-1 gap-4">
            {filteredBookings.map((b) => {
              const pc = db.pcs.find(p => p.id === b.pc_id);
              const pkg = db.pakets.find(p => p.id === b.paket_id);
              const resolvedPrice = pkg?.price || (b.paket_id?.startsWith('custom-') ? parseInt(b.paket_id.replace('custom-', '')) : 0);
              const isPending = b.status === "pending";
              const now = Date.now();
              const diff = pc?.expected_empty_time ? new Date(pc.expected_empty_time).getTime() - now : 0;
              const isExpired = !isPending && pc?.expected_empty_time && diff <= 0;
              const isWarning = !isPending && pc?.expected_empty_time && diff > 0 && diff <= 10 * 60 * 1000;
              const mins = Math.max(0, Math.floor(diff / 60000));

              const pkgTitle = pkg?.name || (b.paket_id?.startsWith('custom-') ? 'Kustom' : 'Tarif Langsung');

              // Hitung antrean untuk PC ini berdasarkan urutan waktu booking (FIFO)
              const pcBookings = allBookings
                .filter(item => item.pc_id === b.pc_id)
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              const queueIndex = pcBookings.findIndex(item => item.id === b.id);
              const isLayered = queueIndex > 0;
              const prevPlayerName = isLayered ? pcBookings[queueIndex - 1]?.player_name : null;

              return (
                <div
                  key={b.id}
                  className={`bg-surface border p-4 rounded-xl shadow-lg relative overflow-hidden space-y-3 ${
                    isPending 
                      ? "border-amber-500/40" 
                      : isExpired 
                      ? "border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
                      : isWarning 
                      ? "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                      : "border-hairline"
                  }`}
                >
                  {/* Top Bar - High Visibility PC & Status */}
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-hairline/60">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-nvidia-green/15 border-2 border-nvidia-green/50 shadow-[0_0_12px_rgba(118,185,0,0.15)]">
                      <Monitor size={16} className="text-nvidia-green stroke-[2.5]" />
                      <span className="font-bold text-sm md:text-base text-white tracking-wider">
                        {(pc?.name || b.pc_id).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${b.ss_bukti ? 'bg-nvidia-green/15 text-nvidia-green border border-nvidia-green/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
                        {b.ss_bukti ? 'QRIS' : 'KASIR'}
                      </span>
                      {isPending ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock size={11} className="animate-spin" /> Verifikasi
                        </span>
                      ) : isExpired ? (
                        <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <Hourglass size={11} className="animate-spin" /> Selesai Main
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/90 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={11} /> Terkonfirmasi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Player & Highlighted Paket Box */}
                  <div className="grid grid-cols-2 gap-2.5 bg-surface-dark p-3.5 rounded-xl border border-hairline text-xs">
                    <div className="flex flex-col justify-center">
                      <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Pemain & Booking</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-surface border border-hairline flex items-center justify-center text-zinc-200 text-xs font-bold">
                          {b.player_name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm truncate">{b.player_name}</span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-nvidia-green border border-nvidia-green/30">
                              {b.id}
                            </span>
                          </div>
                          <span className="text-xs text-nvidia-green font-semibold">{pkgTitle}</span>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400 mt-1 tabular-nums">
                        {new Date(b.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>

                    <div className="flex flex-col justify-center text-right px-3 py-2 rounded-lg bg-surface border border-hairline/60">
                      <span className="text-xs text-zinc-300 font-bold uppercase tracking-wider flex items-center justify-end gap-1 mb-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-nvidia-green"></span>
                        {pkgTitle}
                      </span>
                      <span className="font-bold text-base text-nvidia-green tabular-nums">
                        Rp {resolvedPrice.toLocaleString("id-ID")}
                      </span>
                      {isLayered ? (
                        <span className="text-xs text-cyan-400 font-semibold flex items-center justify-end gap-1 mt-1">
                          <Clock size={10} className="shrink-0" />
                          Nunggu {prevPlayerName}
                        </span>
                      ) : pc?.expected_empty_time ? (
                        <span className={`text-xs flex items-center justify-end gap-1 mt-1 tabular-nums ${
                          isExpired 
                            ? "text-red-400 font-bold animate-pulse" 
                            : isWarning 
                            ? "text-amber-400 animate-pulse" 
                            : "text-amber-400"
                        }`}>
                          <Hourglass size={10} className={isExpired ? "animate-spin" : ""} />
                          {isExpired 
                            ? `Habis, giliran ${b.player_name} paket ${pkgTitle}` 
                            : isWarning
                            ? `Sisa ${mins}m, siapkan ${b.player_name}`
                            : `Sisa ${mins}m, ${b.player_name}`}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-400 font-semibold block mt-1">
                          Booked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  {isPending ? (
                    <div className="flex gap-2 pt-1">
                      {b.ss_bukti ? (
                        <button
                          onClick={() => showBukti(b.id, b.ss_bukti)}
                          className="flex-1 py-2.5 bg-surface-dark border border-hairline text-white/70 hover:text-white rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-1"
                        >
                          <ImageIcon size={14} /> Bukti
                        </button>
                      ) : (
                        <div className="flex-1 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1">
                          <Banknote size={13} /> Bayar Tunai
                        </div>
                      )}
                      <button
                        disabled={loadingId === b.id}
                        onClick={() => handleAction(b.id, 'approve')}
                        className="flex-1 py-2.5 bg-nvidia-green text-black font-bold rounded-lg text-xs uppercase shadow-[0_0_15px_rgba(118,185,0,0.3)] flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} /> Konfirmasi
                      </button>
                      <button
                        disabled={loadingId === b.id}
                        onClick={() => handleAction(b.id, 'reject')}
                        className="p-2.5 bg-error/10 text-error border border-error/30 rounded-lg text-xs font-bold"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(b)}
                          className="flex-1 py-2 bg-surface-dark hover:bg-white/10 text-white/70 hover:text-white border border-hairline/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Pencil size={13} /> Ubah
                        </button>
                        <button
                          disabled={loadingId === b.id}
                          onClick={() => handleDelete(b.id, b.player_name)}
                          className="flex-1 py-2 bg-surface-dark hover:bg-error/20 text-white/60 hover:text-error border border-hairline/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Trash2 size={13} /> Hapus
                        </button>
                      </div>

                      {isLayered ? (
                        <button
                          disabled
                          className="w-full px-4 py-2.5 font-bold rounded-lg text-xs bg-surface-dark text-white/40 border border-hairline/60 cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <Lock size={12} className="shrink-0 text-white/40" />
                          Lapis ke {queueIndex + 1} • Nunggu {prevPlayerName}
                        </button>
                      ) : (
                        <button
                          disabled={loadingId === b.id}
                          onClick={() => handleAction(b.id, 'complete', b.player_name, pc?.name)}
                          className={`w-full px-4 py-2.5 font-bold rounded-lg text-xs uppercase transition flex items-center justify-center gap-1.5 ${
                            isExpired
                              ? "bg-nvidia-green hover:bg-[#88d600] text-black shadow-[0_0_15px_rgba(118,185,0,0.6)] animate-pulse"
                              : "bg-nvidia-green hover:bg-[#88d600] text-black shadow-sm"
                          }`}
                        >
                          <Play size={13} className="fill-black" /> Mulai Main
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredBookings.length === 0 && (
              <div className="p-8 text-center text-white/30 text-xs uppercase tracking-widest font-bold bg-surface border border-hairline rounded-xl">
                Tidak ada data antrean.
              </div>
            )}
          </div>

        </div>

        {/* Modal Manual Booking / Edit */}
        <AnimatePresence>
          {showManual && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-surface border border-hairline p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl space-y-4"
              >
                <h2 className="text-lg font-bold uppercase tracking-tight text-white flex items-center gap-2">
                  <Plus size={20} className="text-nvidia-green" />
                  {editBookingId ? "Ubah Data Booking" : "Booking Kasir Langsung"}
                </h2>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-white/50 uppercase">Nama Pemain</label>
                      <span className="text-[11px] text-white/50">Enter untuk auto-isi nama bawaan</span>
                    </div>
                    <input
                      ref={playerInputRef}
                      type="text"
                      value={manualData.playerName}
                      onChange={e => setManualData({...manualData, playerName: e.target.value})}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault();
                          if (!manualData.playerName.trim()) {
                            const nextNum = (db?.settings?.user_counter || 80) + 1;
                            setManualData(prev => ({ ...prev, playerName: `User ${nextNum}` }));
                          }
                          setTimeout(() => {
                            pcInputRef.current?.focus();
                          }, 10);
                        }
                      }}
                      placeholder={`Contoh User ${(db?.settings?.user_counter || 80) + 1} atau lewati langsung`}
                      className="w-full bg-surface-dark border border-hairline p-2.5 rounded text-sm text-white focus:border-nvidia-green outline-none"
                    />
                  </div>

                  <div className="relative">
                    <label className="text-[11px] font-bold text-white/50 uppercase block mb-1">Pilih PC</label>
                    <input
                      ref={pcInputRef}
                      type="text"
                      value={manualData.searchPc}
                      onChange={e => {
                        const val = e.target.value;
                        const cleanVal = val.toLowerCase().trim();
                        // Auto-match exact or single candidate
                        const matched = db?.pcs?.find(p => p.name.toLowerCase() === cleanVal || p.id.toLowerCase() === cleanVal);
                        if (matched) {
                          setManualData({ ...manualData, searchPc: matched.name, pcId: matched.id });
                        } else {
                          const partials = (db?.pcs || []).filter(p => p.name.toLowerCase().includes(cleanVal) || p.id.toLowerCase().includes(cleanVal));
                          setManualData({ ...manualData, searchPc: val, pcId: partials.length === 1 ? partials[0].id : "" });
                        }
                        setShowPcList(true);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault();
                          const cleanVal = manualData.searchPc.toLowerCase().trim();
                          const matches = (db?.pcs || []).filter(p => p.name.toLowerCase().includes(cleanVal) || p.id.toLowerCase().includes(cleanVal));
                          if (matches.length > 0) {
                            setManualData({ ...manualData, searchPc: matches[0].name, pcId: matches[0].id });
                          }
                          setShowPcList(false);
                          // Auto move focus to Paket input
                          setTimeout(() => {
                            paketInputRef.current?.focus();
                          }, 10);
                        }
                      }}
                      onFocus={() => setShowPcList(true)}
                      placeholder="Ketik nama PC contoh MOYA atau TOM"
                      className="w-full bg-surface-dark border border-hairline p-2.5 rounded text-sm text-white focus:border-nvidia-green outline-none"
                    />
                    {showPcList && (
                      <div className="absolute z-[150] left-0 right-0 top-full mt-1 bg-[#141416] border border-white/15 max-h-48 overflow-y-auto rounded-xl shadow-2xl divide-y divide-white/[0.08]">
                        {db?.pcs?.filter(p => p.name.toLowerCase().includes(manualData.searchPc.toLowerCase()) || p.id.toLowerCase().includes(manualData.searchPc.toLowerCase())).map(pc => {
                          const isOccupied = pc.status === "occupied" || (pc.expected_empty_time && new Date(pc.expected_empty_time).getTime() > Date.now());
                          const isSelected = manualData.pcId === pc.id || manualData.searchPc.toLowerCase() === pc.name.toLowerCase();
                          return (
                            <button
                              key={pc.id}
                              type="button"
                              onClick={() => {
                                setManualData({ ...manualData, pcId: pc.id, searchPc: pc.name });
                                setShowPcList(false);
                                paketInputRef.current?.focus();
                              }}
                              className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between transition hover:bg-white/[0.1] ${
                                isSelected ? "bg-nvidia-green/20 text-nvidia-green font-bold" : "text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{pc.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  isOccupied ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}>
                                  {isOccupied ? "Main" : "Kosong"}
                                </span>
                              </div>
                              <span className="text-[10px] text-white/50 uppercase font-semibold">Enter ↵</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-white/50 uppercase block mb-1">Pilihan Paket Main</label>
                    {(() => {
                      const query = searchPaket.toLowerCase().trim();
                      let customPkg = null;
                      let parsedPrice = parseInt(query.replace(/\D/g, '')) || 0;

                      const filtered = (db?.pakets || []).filter(p =>
                        !p.is_custom && (p.name.toLowerCase().includes(query) || p.price.toString().includes(query))
                      );

                      if (query && parsedPrice >= 3000 && !filtered.some(p => p.price === parsedPrice)) {
                        customPkg = {
                          id: `custom-${parsedPrice}`,
                          name: `Paket Kustom Rp ${parsedPrice.toLocaleString('id-ID')}`,
                          price: parsedPrice
                        };
                      }

                      const currentList = customPkg ? [customPkg, ...filtered] : filtered;

                      return (
                        <>
                          {/* Quick Chips Paket Populer */}
                          <div className="flex flex-wrap gap-2 mb-2.5">
                            {(db?.pakets || [])
                              .filter(p => ['paket-1', 'paket-2', 'paket-3', 'paket-7'].includes(p.id) || (!p.is_custom && ['1 Jam', '2 Jam', '3 Jam'].includes(p.name)))
                              .slice(0, 4)
                              .map(pkg => {
                                const isSelected = selectedPaket === pkg.id;
                                return (
                                  <button
                                    key={`quick-${pkg.id}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPaket(pkg.id);
                                      submitBtnRef.current?.focus();
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition shrink-0 ${
                                      isSelected
                                        ? "bg-nvidia-green text-black border-nvidia-green font-bold shadow-[0_0_12px_rgba(118,185,0,0.35)]"
                                        : "bg-surface-dark border-hairline text-white/70 hover:text-white hover:border-white/20"
                                    }`}
                                  >
                                    {pkg.name}
                                  </button>
                                );
                              })}
                          </div>

                          <input
                            ref={paketInputRef}
                            type="text"
                            value={searchPaket}
                            onChange={e => {
                              const val = e.target.value;
                              setSearchPaket(val);
                              const q = val.toLowerCase().trim();
                              const parsed = parseInt(q.replace(/\D/g, '')) || 0;
                              const matches = (db?.pakets || []).filter(p => !p.is_custom && (p.name.toLowerCase().includes(q) || p.price.toString().includes(q)));
                              
                              if (matches.length > 0) {
                                setSelectedPaket(matches[0].id); // Auto highlight paket teratas
                              } else if (parsed >= 3000) {
                                setSelectedPaket(`custom-${parsed}`);
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                const idx = currentList.findIndex(p => p.id === selectedPaket);
                                if (idx < currentList.length - 1) {
                                  setSelectedPaket(currentList[idx + 1].id);
                                }
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                const idx = currentList.findIndex(p => p.id === selectedPaket);
                                if (idx > 0) {
                                  setSelectedPaket(currentList[idx - 1].id);
                                }
                              } else if (e.key === "Enter" || e.key === "Tab") {
                                e.preventDefault();
                                // Select current highlighted or first item in list
                                if (!selectedPaket && currentList.length > 0) {
                                  setSelectedPaket(currentList[0].id);
                                }
                                setTimeout(() => {
                                  submitBtnRef.current?.focus();
                                }, 10);
                              }
                            }}
                            placeholder="Cari paket atau ketik nominal contoh 5000 atau Malam"
                            className="w-full bg-surface-dark border border-hairline p-2.5 rounded-lg text-sm text-white focus:border-nvidia-green outline-none mb-2"
                          />
                          <div className="max-h-56 overflow-y-auto space-y-2 p-1 custom-scrollbar">
                            {currentList.map(pkg => {
                              const isSelected = selectedPaket === pkg.id;
                              return (
                                <button
                                  key={pkg.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPaket(pkg.id);
                                    submitBtnRef.current?.focus();
                                  }}
                                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between border transition ${
                                    isSelected
                                      ? "bg-nvidia-green/20 border-nvidia-green text-nvidia-green font-bold shadow-[0_0_12px_rgba(118,185,0,0.2)] ring-1 ring-nvidia-green/40"
                                      : "bg-surface-dark border-hairline text-white/70 hover:text-white hover:border-white/20"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    {isSelected ? (
                                      <span className="w-2 h-2 rounded-full bg-nvidia-green shrink-0 shadow-[0_0_8px_rgba(118,185,0,0.8)]" />
                                    ) : (
                                      <span className="w-2 h-2 rounded-full bg-white/20 shrink-0" />
                                    )}
                                    <span className="font-semibold">{pkg.name}</span>
                                  </div>
                                  <span className="font-bold text-nvidia-green tabular-nums">Rp {pkg.price.toLocaleString("id-ID")}</span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => {
                      setShowManual(false);
                      setEditBookingId(null);
                    }}
                    className="flex-1 py-2.5 bg-surface-dark hover:bg-white/10 rounded text-xs font-bold uppercase text-white/60"
                  >
                    Batal
                  </button>
                  <button
                    ref={submitBtnRef}
                    onClick={handleManualSubmit}
                    disabled={loadingId === 'manual-loading'}
                    className="flex-1 py-2.5 bg-nvidia-green text-black font-bold rounded text-xs uppercase hover:bg-[#88d600] focus:ring-2 focus:ring-nvidia-green/50 focus:outline-none"
                  >
                    {loadingId === 'manual-loading' ? 'Menyimpan...' : (editBookingId ? 'Simpan' : 'Simpan & Main')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Confirm Modal Mengikuti Design System */}
        <AnimatePresence>
          {confirmState.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={closeConfirm}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-[#121316] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    {confirmState.subtitle && (
                      <span className="text-[10px] font-bold tracking-wider text-nvidia-green uppercase bg-nvidia-green/10 border border-nvidia-green/20 px-2 py-0.5 rounded-full">
                        {confirmState.subtitle}
                      </span>
                    )}
                    <h3 className="text-base font-bold text-white uppercase tracking-tight mt-1">
                      {confirmState.title}
                    </h3>
                  </div>
                  <button
                    onClick={closeConfirm}
                    className="text-white/40 hover:text-white p-1 rounded transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-xs text-white/70 leading-relaxed">
                  {confirmState.description}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-white/50">
                    Enter konfirmasi - Esc batal
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeConfirm}
                      className="px-4 py-2 bg-surface-dark border border-hairline hover:bg-white/10 rounded-lg text-xs font-bold uppercase text-white/60 transition"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      autoFocus
                      onClick={() => {
                        const action = confirmState.onConfirm;
                        closeConfirm();
                        action();
                      }}
                      className={`px-5 py-2 rounded-lg text-xs font-bold uppercase transition focus:ring-2 focus:outline-none ${
                        confirmState.confirmVariant === 'danger'
                          ? 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500/50'
                          : 'bg-nvidia-green hover:bg-[#88d600] text-black focus:ring-nvidia-green/50'
                      }`}
                    >
                      {confirmState.confirmLabel}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Bukti Transfer */}
        <AnimatePresence>
          {buktiImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4"
            >
              <div className="relative max-w-lg w-full flex flex-col items-center justify-center space-y-4">
                <button
                  onClick={() => setBuktiImage(null)}
                  className="self-end px-3 py-1.5 bg-surface border border-hairline text-white hover:text-error text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
                >
                  <X size={14} /> Tutup
                </button>
                <img
                  src={buktiImage}
                  alt="Bukti Transfer"
                  className="max-w-full max-h-[80vh] object-contain border border-nvidia-green/40 rounded-xl shadow-2xl"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PinGuard>
  );
}
