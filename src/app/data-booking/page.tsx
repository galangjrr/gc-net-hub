"use client";

import { useState, useEffect, useRef } from "react";
import { Database, CheckCircle2, Clock, XCircle, Image as ImageIcon, Plus, Search, Monitor, Sparkles, RotateCw, Pencil, Check, Trash2, Hourglass, User, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { DatabaseSchema, Booking, PC, Paket } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import PinGuard from "@/components/PinGuard";

export default function DataBookingPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const prevPendingCount = useRef<number>(0);

  const [showManual, setShowManual] = useState(false);
  const [manualData, setManualData] = useState({ playerName: "", pcId: "", searchPc: "" });
  const [showPcList, setShowPcList] = useState(false);
  const [buktiImage, setBuktiImage] = useState<string | null>(null);
  const [searchPaket, setSearchPaket] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPaket, setSelectedPaket] = useState<string | null>(null);

  const pcInputRef = useRef<HTMLInputElement | null>(null);
  const paketInputRef = useRef<HTMLInputElement | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  // Auto focus PC input whenever modal opens
  useEffect(() => {
    if (showManual) {
      setTimeout(() => {
        pcInputRef.current?.focus();
      }, 50);
    }
  }, [showManual]);

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
    };
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'complete') => {
    let reason = "";
    if (action === 'reject') {
      const res = prompt("Alasan Pembatalan (Salah Input, Pemain Batal, dll):");
      if (res === null) return;
      reason = res || "Dibatalkan Admin";
    } else if (action === 'complete') {
      if (!confirm("Pemain sudah tiba dan mulai bermain di bilik PC? (Selesaikan antrean web)")) return;
    } else if (action === 'approve') {
      if (!confirm("Verifikasi pembayaran & masukkan pemain ke dalam antrean terkonfirmasi?")) return;
    }

    setLoadingId(id);
    try {
      await fetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason })
      });
      await loadData();
    } catch (err) {
      alert("Gagal memproses aksi booking.");
    }
    setLoadingId(null);
  };

  const handleSetTimer = async (pcId: string, bookingId: string, minutes: number) => {
    setLoadingId(bookingId);
    try {
      if (minutes > 0) {
        const newEmptyTime = new Date(Date.now() + minutes * 60000).toISOString();
        await fetch("/api/pcs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: pcId,
            expected_empty_time: newEmptyTime,
            status: 'occupied'
          })
        });
      } else {
        await fetch("/api/pcs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: pcId,
            expected_empty_time: null,
            status: 'available'
          })
        });
      }
      await loadData();
    } catch (err) {
      alert("Gagal memperbarui timer PC.");
    }
    setLoadingId(null);
  };

  const handleCustomTimerSubmit = (pcId: string, bookingId: string, rawInput: string) => {
    const query = rawInput.toLowerCase().trim();
    if (!query) return;

    let val = 0;
    const timeStr = query.replace(/jam/g, 'j').replace(/menit/g, 'm').replace(/[^0-9jm]/g, '');
    if (timeStr.includes('j')) {
      const h = parseInt(timeStr.split('j')[0]) || 0;
      const m = parseInt(timeStr.split('j')[1]?.split('m')[0]) || 0;
      val = (h * 60) + m;
    } else if (timeStr.includes('m')) {
      val = parseInt(timeStr.split('m')[0]) || 0;
    } else {
      val = parseInt(timeStr) || 0;
    }

    handleSetTimer(pcId, bookingId, val);
  };

  const handleEditClick = (b: Booking) => {
    setEditBookingId(b.id);
    const pcName = db?.pcs?.find(p => p.id === b.pc_id)?.name || "";
    setManualData({ playerName: b.player_name, pcId: b.pc_id, searchPc: pcName });
    setSelectedPaket(b.paket_id);
    setShowManual(true);
  };

  const handleManualSubmit = async () => {
    let finalPcId = manualData.pcId;
    if (!finalPcId && manualData.searchPc) {
      const matched = db?.pcs?.find(p => p.name.toLowerCase() === manualData.searchPc.toLowerCase());
      if (matched) finalPcId = matched.id;
    }

    if (!finalPcId || !selectedPaket) return alert("Lengkapi data PC dan Paket!");
    
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

    setLoadingId("manual-loading");
    if (editBookingId) {
      await fetch(`/api/bookings/${editBookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'edit_paket',
          customName: db?.pakets?.find(p => p.id === finalPaketId)?.name,
          customPrice: db?.pakets?.find(p => p.id === finalPaketId)?.price
        })
      });
    } else {
      await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pc_id: finalPcId,
          paket_id: finalPaketId,
          player_name: manualData.playerName,
          is_admin_manual: true
        })
      });
    }

    setShowManual(false);
    setEditBookingId(null);
    setManualData({ playerName: "", pcId: "", searchPc: "" });
    setSearchPaket("");
    setSelectedPaket(null);
    await loadData();
    setLoadingId(null);
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
      <div className="min-h-screen bg-surface-dark p-4 md:p-8 pt-16 md:pt-8 text-white space-y-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          
          {/* Header & Quick Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-nvidia-green/10 border border-nvidia-green/30 rounded-xl text-nvidia-green">
                <Database size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">Data Antrean & Booking</h1>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-nvidia-green"></span>
                  </span>
                </div>
                <p className="text-xs text-white/50 uppercase tracking-wider mt-1">
                  Verifikasi pembayaran QRIS, approval bilik, & monitoring waktu realtime
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                className="p-2.5 bg-surface hover:bg-white/10 border border-hairline rounded-lg text-white/70 hover:text-white transition"
                title="Segarkan Data"
              >
                <RotateCw size={18} />
              </button>
              <button
                onClick={() => {
                  setEditBookingId(null);
                  setManualData({ playerName: "", pcId: "", searchPc: "" });
                  setSearchPaket("");
                  setSelectedPaket(null);
                  setShowManual(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-nvidia-green text-black hover:bg-[#88d600] font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-[0_0_20px_rgba(118,185,0,0.25)]"
              >
                <Plus size={16} />
                Tambah Booking Manual
              </button>
            </div>
          </div>

          {/* Stats Bar & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition border shrink-0 ${
                  filterTab === 'all'
                    ? "bg-nvidia-green text-black border-nvidia-green shadow-[0_0_15px_rgba(118,185,0,0.2)]"
                    : "bg-surface border-hairline text-white/60 hover:text-white"
                }`}
              >
                <span className="sm:hidden">Semua ({allBookings.length})</span>
                <span className="hidden sm:inline">Semua Antrean ({allBookings.length})</span>
              </button>
              <button
                onClick={() => setFilterTab('pending')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition border flex items-center gap-1.5 shrink-0 ${
                  filterTab === 'pending'
                    ? "bg-amber-500 text-black border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    : "bg-surface border-hairline text-amber-400 hover:text-white"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse"></span>
                <span className="sm:hidden">Verifikasi ({pendingCount})</span>
                <span className="hidden sm:inline">Menunggu Verifikasi ({pendingCount})</span>
              </button>
              <button
                onClick={() => setFilterTab('active')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition border flex items-center gap-1.5 shrink-0 ${
                  filterTab === 'active'
                    ? "bg-emerald-500 text-black border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-surface border-hairline text-emerald-400 hover:text-white"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <span className="sm:hidden">Antre ({activeCount})</span>
                <span className="hidden sm:inline">Antrean Terkonfirmasi ({activeCount})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari pemain atau PC..."
                className="w-full bg-surface border border-hairline p-2.5 pl-9 rounded-lg text-xs text-white placeholder:text-white/40 focus:border-nvidia-green outline-none"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-surface border border-hairline rounded-xl overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-surface-dark border-b border-hairline text-white/50 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-4 pl-6 w-28">Status</th>
                  <th className="p-4">Pemain</th>
                  <th className="p-4">Target PC & Countdown</th>
                  <th className="p-4">Paket / Tarif</th>
                  <th className="p-4">Waktu Booking</th>
                  <th className="p-4 pr-6 text-right">Aksi & Timer Bilik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredBookings.map((b) => {
                  const pc = db.pcs.find(p => p.id === b.pc_id);
                  const pkg = db.pakets.find(p => p.id === b.paket_id);
                  const resolvedPrice = pkg?.price || (b.paket_id?.startsWith('custom-') ? parseInt(b.paket_id.replace('custom-', '')) : 0);
                  const isPending = b.status === "pending";

                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 pl-6">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                            <Clock size={12} className="animate-spin" />
                            Menunggu Verifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 size={12} />
                            Antrean Terkonfirmasi
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-bold text-white text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-surface-dark border border-hairline flex items-center justify-center text-nvidia-green font-mono text-xs">
                            {b.player_name.slice(0, 1).toUpperCase()}
                          </div>
                          <span>{b.player_name}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-nvidia-green text-sm flex items-center gap-1.5">
                            <Monitor size={14} />
                            {pc?.name || b.pc_id}
                          </span>
                          {pc?.expected_empty_time ? (
                            <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1 mt-0.5">
                              <Hourglass size={12} />
                              Kosong: {new Date(pc.expected_empty_time).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-white/30 uppercase mt-0.5">Siap Main / Standby</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{pkg?.name || 'Paket Kustom'}</span>
                          <span className="font-mono text-nvidia-green font-bold text-[11px]">
                            Rp {resolvedPrice.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 font-mono text-white/50 text-[11px]">
                        {new Date(b.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => showBukti(b.id, b.ss_bukti)}
                                className="px-3 py-1.5 bg-surface-dark hover:bg-white/10 border border-hairline text-white/70 hover:text-white rounded text-[11px] font-bold uppercase transition flex items-center gap-1"
                              >
                                <ImageIcon size={14} /> Cek Bukti
                              </button>
                              <button
                                disabled={loadingId === b.id}
                                onClick={() => handleAction(b.id, 'approve')}
                                className="px-4 py-1.5 bg-nvidia-green hover:bg-[#88d600] text-black font-bold text-[11px] uppercase rounded transition shadow-[0_0_10px_rgba(118,185,0,0.3)] flex items-center gap-1.5"
                              >
                                <Check size={13} /> Konfirmasi
                              </button>
                              <button
                                disabled={loadingId === b.id}
                                onClick={() => handleAction(b.id, 'reject')}
                                className="px-3 py-1.5 bg-error/10 hover:bg-error text-error hover:text-white border border-error/30 rounded text-[11px] font-bold uppercase transition"
                              >
                                Batal
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Quick Timer Chips */}
                              <div className="flex items-center gap-1 bg-surface-dark p-1 rounded-lg border border-hairline">
                                <button
                                  onClick={() => handleSetTimer(b.pc_id, b.id, 60)}
                                  className="px-2 py-1 bg-surface hover:bg-nvidia-green hover:text-black rounded text-[10px] font-mono font-bold text-white/70 transition"
                                  title="Set 1 Jam"
                                >
                                  +1j
                                </button>
                                <button
                                  onClick={() => handleSetTimer(b.pc_id, b.id, 120)}
                                  className="px-2 py-1 bg-surface hover:bg-nvidia-green hover:text-black rounded text-[10px] font-mono font-bold text-white/70 transition"
                                  title="Set 2 Jam"
                                >
                                  +2j
                                </button>
                                
                                <input
                                  type="text"
                                  id={`timer-input-${b.id}`}
                                  placeholder="e.g. 1j 30m"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      const input = document.getElementById(`timer-input-${b.id}`) as HTMLInputElement;
                                      handleCustomTimerSubmit(b.pc_id, b.id, input.value);
                                      input.value = "";
                                    }
                                  }}
                                  className="w-20 bg-black/40 border border-hairline px-2 py-1 rounded text-[10px] text-white focus:border-nvidia-green outline-none"
                                />
                                <button
                                  onClick={() => {
                                    const input = document.getElementById(`timer-input-${b.id}`) as HTMLInputElement;
                                    handleCustomTimerSubmit(b.pc_id, b.id, input.value);
                                    input.value = "";
                                  }}
                                  className="px-2.5 py-1 bg-nvidia-green text-black font-bold text-[10px] uppercase rounded hover:bg-[#88d600] transition"
                                >
                                  SET
                                </button>
                              </div>

                              <button
                                onClick={() => handleEditClick(b)}
                                className="p-2 bg-surface-dark hover:bg-white/10 text-cyan-400 border border-cyan-500/30 rounded transition"
                                title="Edit Booking"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                disabled={loadingId === b.id}
                                onClick={() => handleAction(b.id, 'complete')}
                                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold border border-emerald-400/50 rounded text-[11px] uppercase transition flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                              >
                                <Play size={12} /> Mulai Main ke PC
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-white/30 text-xs uppercase tracking-widest font-bold">
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

              return (
                <div
                  key={b.id}
                  className={`bg-surface border p-4 rounded-xl shadow-lg relative overflow-hidden space-y-3 ${
                    isPending ? "border-amber-500/40" : "border-hairline"
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-dark border border-hairline flex items-center justify-center text-nvidia-green font-mono font-bold text-sm">
                        {b.player_name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{b.player_name}</h3>
                        <span className="text-[10px] text-white/40 font-mono">
                          {new Date(b.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                        </span>
                      </div>
                    </div>

                    {isPending ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock size={12} className="animate-spin" /> Verifikasi
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={12} /> Terkonfirmasi
                      </span>
                    )}
                  </div>

                  {/* Info Box */}
                  <div className="grid grid-cols-2 gap-2 bg-surface-dark p-3 rounded-lg border border-hairline text-xs">
                    <div>
                      <span className="text-[10px] text-white/40 uppercase block">Target PC</span>
                      <span className="text-nvidia-green font-bold text-sm flex items-center gap-1">
                        <Monitor size={14} /> {pc?.name || b.pc_id}
                      </span>
                      {pc?.expected_empty_time && (
                        <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 mt-0.5">
                          <Hourglass size={12} />
                          Kosong: {new Date(pc.expected_empty_time).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-white/40 uppercase block">Paket & Tarif</span>
                      <span className="text-white font-bold block">{pkg?.name || 'Paket Kustom'}</span>
                      <span className="text-nvidia-green font-mono font-bold text-[11px]">
                        Rp {resolvedPrice.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  {isPending ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => showBukti(b.id, b.ss_bukti)}
                        className="flex-1 py-2.5 bg-surface-dark border border-hairline text-white/70 hover:text-white rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-1"
                      >
                        <ImageIcon size={14} /> Bukti
                      </button>
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
                      {/* Quick Timers */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSetTimer(b.pc_id, b.id, 60)}
                          className="flex-1 py-1.5 bg-surface-dark hover:bg-nvidia-green hover:text-black border border-hairline rounded text-xs font-mono font-bold text-white/70 transition"
                        >
                          +1j
                        </button>
                        <button
                          onClick={() => handleSetTimer(b.pc_id, b.id, 120)}
                          className="flex-1 py-1.5 bg-surface-dark hover:bg-nvidia-green hover:text-black border border-hairline rounded text-xs font-mono font-bold text-white/70 transition"
                        >
                          +2j
                        </button>
                        <button
                          onClick={() => handleEditClick(b)}
                          className="px-3 py-1.5 bg-surface-dark text-cyan-400 border border-cyan-500/30 rounded text-xs font-bold"
                        >
                          Edit
                        </button>
                      </div>

                      {/* Custom Input & Complete Button */}
                      <div className="flex flex-col sm:flex-row items-stretch gap-2">
                        <div className="flex-1 flex items-stretch border border-hairline rounded-lg overflow-hidden bg-surface-dark">
                          <input
                            type="text"
                            id={`mobile-timer-input-${b.id}`}
                            placeholder="Set waktu: 1j 30m / 60"
                            className="flex-1 bg-transparent px-3 py-2 text-xs text-white focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById(`mobile-timer-input-${b.id}`) as HTMLInputElement;
                              handleCustomTimerSubmit(b.pc_id, b.id, input.value);
                              input.value = "";
                            }}
                            className="px-3 bg-nvidia-green text-black font-bold text-xs uppercase"
                          >
                            SET
                          </button>
                        </div>

                        <button
                          disabled={loadingId === b.id}
                          onClick={() => handleAction(b.id, 'complete')}
                          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold border border-emerald-400/50 rounded-lg text-xs uppercase transition flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        >
                          <Play size={12} /> Mulai Main
                        </button>
                      </div>
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
                className="bg-surface border border-hairline p-6 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl space-y-4"
              >
                <h2 className="text-lg font-bold uppercase tracking-tight text-white flex items-center gap-2">
                  <Plus size={20} className="text-nvidia-green" />
                  {editBookingId ? "Ubah Data Booking" : "Booking Kasir (Walk-in)"}
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-white/50 uppercase block mb-1">Nama Pemain</label>
                    <input
                      type="text"
                      value={manualData.playerName}
                      onChange={e => setManualData({...manualData, playerName: e.target.value})}
                      placeholder="e.g. Bang Jago (Opsional)"
                      className="w-full bg-surface-dark border border-hairline p-2.5 rounded text-sm text-white focus:border-nvidia-green outline-none"
                    />
                  </div>

                  <div className="relative">
                    <label className="text-[11px] font-bold text-white/50 uppercase block mb-1">Pilih Bilik PC</label>
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
                      placeholder="Ketik nama PC (e.g. MOYA / TOM / IYOO)"
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
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                  isOccupied ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}>
                                  {isOccupied ? "Main" : "Kosong"}
                                </span>
                              </div>
                              <span className="text-[10px] text-white/40 font-mono uppercase">Enter ↵</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-white/50 uppercase block mb-1">Pilih Paket Booking</label>
                    <input
                      ref={paketInputRef}
                      type="text"
                      value={searchPaket}
                      onChange={e => {
                        const val = e.target.value;
                        setSearchPaket(val);
                        const q = val.toLowerCase().trim();
                        const parsed = parseInt(q.replace(/\D/g, '')) || 0;
                        const exact = (db?.pakets || []).find(p => !p.is_custom && (p.name.toLowerCase() === q || p.price === parsed));
                        if (exact) {
                          setSelectedPaket(exact.id);
                        } else if (parsed >= 3000) {
                          setSelectedPaket(`custom-${parsed}`);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault();
                          const q = searchPaket.toLowerCase().trim();
                          const parsed = parseInt(q.replace(/\D/g, '')) || 0;
                          const filtered = (db?.pakets || []).filter(p => !p.is_custom && (p.name.toLowerCase().includes(q) || p.price.toString().includes(q)));
                          if (filtered.length > 0) {
                            setSelectedPaket(filtered[0].id);
                          } else if (parsed >= 3000) {
                            setSelectedPaket(`custom-${parsed}`);
                          }
                          // Auto move focus to submit button
                          setTimeout(() => {
                            submitBtnRef.current?.focus();
                          }, 10);
                        }
                      }}
                      placeholder="Cari paket atau ketik nominal (e.g. 5000 / Malam)"
                      className="w-full bg-surface-dark border border-hairline p-2.5 rounded text-sm text-white focus:border-nvidia-green outline-none mb-2"
                    />
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {(() => {
                        const query = debouncedSearch.toLowerCase();
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

                        const list = customPkg ? [customPkg, ...filtered] : filtered;
                        
                        // Auto select first match if current selected is invalid
                        if (list.length === 1 && selectedPaket !== list[0].id) {
                          setTimeout(() => setSelectedPaket(list[0].id), 0);
                        }

                        return list.map(pkg => {
                          const isSelected = selectedPaket === pkg.id;
                          return (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() => {
                                setSelectedPaket(pkg.id);
                                submitBtnRef.current?.focus();
                              }}
                              className={`w-full p-2.5 rounded-xl text-xs flex items-center justify-between border transition ${
                                isSelected
                                  ? "bg-nvidia-green/10 border-nvidia-green text-nvidia-green font-bold shadow-[0_0_10px_rgba(118,185,0,0.15)]"
                                  : "bg-surface-dark border-hairline text-white/70 hover:text-white hover:border-white/20"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-nvidia-green" />}
                                <span>{pkg.name}</span>
                              </div>
                              <span className="font-mono">Rp {pkg.price.toLocaleString("id-ID")}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>
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
