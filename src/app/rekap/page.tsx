"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Banknote, Users, Coins, RotateCw, Receipt, Monitor, ShoppingCart, Upload, Calendar, AlertTriangle, Eye, X, Check, FileText, Search, XCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { DatabaseSchema, Booking } from "@/lib/db";
import PinGuard from "@/components/PinGuard";

export default function RekapKeuanganPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [pdfRevenue, setPdfRevenue] = useState<number>(0);
  const [filterPeriod, setFilterPeriod] = useState<"today" | "all" | "custom">("today");
  const [customDate, setCustomDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Selesai" | "Batal">("all");

  // Modal Upload PDF States
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfDate, setPdfDate] = useState<string>("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA");
    setPdfDate(today);
    setCustomDate(today);
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch("/api/data?includeLogs=true", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDb(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (db?.settings?.daily_pdf_revenue) {
      setPdfRevenue(db.settings.daily_pdf_revenue);
    }
  }, [db?.settings?.daily_pdf_revenue]);

  const handleUploadSubmit = async () => {
    if (!pdfFile) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("date", pdfDate);

    try {
      const res = await fetch("/api/upload-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (data.total > 0) {
        const todayIso = new Date().toLocaleDateString("en-CA");
        if (pdfDate === todayIso) {
          setPdfRevenue(data.total);
        }
        setShowPdfModal(false);
        setPdfFile(null);
        await loadData();
      } else {
        alert("Gagal menemukan total angka di berkas PDF");
      }
    } catch (_) {
      alert("Terjadi kesalahan saat memproses berkas PDF");
    } finally {
      setIsUploading(false);
    }
  };

  if (!db) return <div className="p-8 tracking-tight text-white/50 uppercase text-xs animate-pulse">Memuat data rekap...</div>;

  const todayIsoStr = new Date().toLocaleDateString("en-CA");

  // Helper to extract booking price reliably
  const getBookingPrice = (b: Booking) => {
    const pkg = db.pakets?.find(p => p.id === b.paket_id);
    if (pkg && pkg.price) return pkg.price;
    if (b.paket_id?.startsWith('custom-')) {
      return parseInt(b.paket_id.replace('custom-', '')) || 0;
    }
    if (b.paket_id?.startsWith('paket-custom-')) {
      const parsed = parseInt(b.paket_id.replace('paket-custom-', ''));
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  // Filter logs by period (khusus transaksi finansial: Selesai atau Batal)
  const allLogs = (db.logs || []).filter(l => l.status === 'Selesai' || l.status === 'Batal');
  const periodLogs = allLogs.filter(l => {
    const logDateStr = l.end_time 
      ? new Date(l.end_time).toLocaleDateString("en-CA") 
      : (l.start_time ? new Date(l.start_time).toLocaleDateString("en-CA") : "");
    if (filterPeriod === 'today') {
      return logDateStr === todayIsoStr;
    }
    if (filterPeriod === 'custom' && customDate) {
      return logDateStr === customDate;
    }
    return true;
  });

  // Financial calculations strictly from completed transactions
  const completedLogs = periodLogs.filter(l => l.status === 'Selesai');

  // Search and status filtering for table display
  const displayLogs = periodLogs.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (l.player_name || "").toLowerCase().includes(q) ||
        (l.pc_name || "").toLowerCase().includes(q) ||
        (l.paket_name || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // 1. Booking PC Logs
  const completedBookingLogs = completedLogs.filter(l => l.pc_name !== 'KASIR' && l.pc_name !== 'BILLING_SERVER');
  const bookingRevenue = completedBookingLogs.reduce((sum, l) => sum + (Number(l.price) || 0), 0);

  // 2. F&B Logs
  const completedFnbLogs = completedLogs.filter(l => l.pc_name === 'KASIR');
  const fnbRevenue = completedFnbLogs.reduce((sum, l) => sum + (Number(l.price) || 0), 0);

  // 3. PDF Logs
  const completedPdfLogs = completedLogs.filter(l => l.pc_name === 'BILLING_SERVER');
  const effectivePdfRevenue = completedPdfLogs.length > 0 
    ? completedPdfLogs.reduce((sum, l) => sum + (Number(l.price) || 0), 0)
    : (filterPeriod === 'today' ? pdfRevenue : 0);

  // Total Revenue
  const totalRevenue = fnbRevenue + bookingRevenue + effectivePdfRevenue;

  // Total Completed Transactions
  const totalTransactions = completedBookingLogs.length + completedFnbLogs.length;

  // Active / Ongoing Booking Pooling
  const activeBookings = (db.bookings || []).filter(b => b.status === 'active' || b.status === 'pending');
  const activePooling = activeBookings.reduce((sum, b) => sum + getBookingPrice(b), 0);

  // Check if database on selected pdf date exists
  const existingDateLogs = allLogs.filter(l => {
    if (l.status !== 'Selesai' || !l.end_time) return false;
    return new Date(l.end_time).toLocaleDateString("en-CA") === pdfDate;
  });
  const hasExistingDateData = existingDateLogs.length > 0;
  const existingDateTotal = existingDateLogs.reduce((sum, l) => sum + (Number(l.price) || 0), 0);

  return (
    <PinGuard>
      <div className="bg-surface-dark min-h-screen p-4 md:p-8 pt-16 md:pt-8 text-white">
        <div className="w-full max-w-6xl 2xl:max-w-[1360px] mx-auto space-y-5">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-hairline">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-nvidia-green/10 border border-nvidia-green/30 rounded-xl text-nvidia-green shrink-0">
                <TrendingUp size={28} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl 2xl:text-3xl font-bold uppercase tracking-tight">Rekap dan Pooling</h1>
                <p className="text-xs text-white/50 tracking-tight mt-0.5">
                  Analitik omzet kasir dan money pooling PC warnet
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter Tabs */}
              <div className="bg-surface border border-hairline/80 p-1 rounded-xl flex items-center gap-1 text-xs">
                <button
                  onClick={() => setFilterPeriod("today")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    filterPeriod === "today" ? "bg-white/10 text-white border border-white/15 shadow-sm font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => setFilterPeriod("all")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    filterPeriod === "all" ? "bg-white/10 text-white border border-white/15 shadow-sm font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  Semua Riwayat
                </button>
                <button
                  onClick={() => setFilterPeriod("custom")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                    filterPeriod === "custom" ? "bg-white/10 text-white border border-white/15 shadow-sm font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  <Calendar size={13} />
                  <span>{filterPeriod === "custom" && customDate ? customDate : "Pilih Tanggal"}</span>
                </button>
              </div>

              {filterPeriod === "custom" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-surface border border-hairline p-1.5 rounded-lg text-xs text-white focus:border-nvidia-green outline-none"
                />
              )}

              <button
                onClick={loadData}
                className="p-2 bg-surface hover:bg-white/10 border border-hairline rounded-lg text-white/70 hover:text-white transition"
                title="Segarkan Data"
              >
                <RotateCw size={16} />
              </button>

              {/* Tombol Buka Modal Upload PDF */}
              <button
                onClick={() => setShowPdfModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-nvidia-green text-black hover:bg-[#88d600] font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(118,185,0,0.2)] active:scale-95"
              >
                <Upload size={14} className="stroke-[2.5]" />
                <span>Unggah PDF Cyberindo</span>
              </button>
            </div>
          </div>

          {/* Compact KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            
            {/* Total Revenue Card */}
            <div className="p-4 xl:p-5 rounded-xl border border-nvidia-green/40 bg-surface shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-1">
                  <span>Total Pendapatan</span>
                  <Banknote size={16} className="text-nvidia-green" />
                </div>
                <p className="text-2xl xl:text-3xl font-extrabold text-nvidia-green tabular-nums">
                  <span className="text-lg font-bold mr-1">Rp</span>
                  {totalRevenue.toLocaleString("id-ID")}
                </p>
              </div>
              
              <div className="mt-3 pt-3 border-t border-hairline/80 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-300">
                <span className="inline-flex items-center gap-1">
                  <ShoppingCart size={12} className="text-cyan-400" /> F&B Rp {fnbRevenue.toLocaleString("id-ID")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Monitor size={12} className="text-nvidia-green" /> Rental PC Rp {bookingRevenue.toLocaleString("id-ID")}
                </span>
                {effectivePdfRevenue > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Receipt size={12} className="text-amber-400" /> PDF Rp {effectivePdfRevenue.toLocaleString("id-ID")}
                  </span>
                )}
              </div>
            </div>

            {/* Total Transactions Card */}
            <div className="p-4 xl:p-5 rounded-xl border border-hairline bg-surface shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-1">
                  <span>Transaksi Selesai</span>
                  <Users size={16} className="text-zinc-400" />
                </div>
                <p className="text-2xl xl:text-3xl font-extrabold text-white tabular-nums">
                  {totalTransactions} <span className="text-xs text-zinc-400 font-normal">transaksi</span>
                </p>
              </div>
              <p className="text-xs text-zinc-400 mt-3 pt-3 border-t border-hairline/80 truncate">
                Gabungan pesanan kasir F&B dan sewa PC
              </p>
            </div>

            {/* Money Pooling Card */}
            <div className="p-4 xl:p-5 rounded-xl bg-surface border border-hairline shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-1">
                  <span>Money Pooling Antrean</span>
                  <Coins size={16} className="text-nvidia-green" />
                </div>
                <p className="text-2xl xl:text-3xl font-extrabold text-white tabular-nums flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-nvidia-green"></span>
                  </span>
                  <span className="text-lg font-bold mr-1">Rp</span>
                  {activePooling.toLocaleString("id-ID")}
                </p>
              </div>
              <p className="text-xs text-zinc-400 mt-3 pt-3 border-t border-hairline/80 truncate">
                Uang tertahan di <span className="text-nvidia-green font-bold">{activeBookings.length} booking</span> antrean aktif
              </p>
            </div>

          </div>

          {/* Compact Money Pooling Breakdown */}
          {activeBookings.length > 0 && (
            <div className="bg-surface border border-hairline p-4 rounded-xl space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Coins size={15} className="text-nvidia-green" />
                  <span>Rincian Money Pooling Berjalan • {activeBookings.length} Antrean</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {activeBookings.map(b => {
                  const pc = db.pcs?.find(p => p.id === b.pc_id);
                  const pkg = db.pakets?.find(p => p.id === b.paket_id);
                  const price = getBookingPrice(b);
                  return (
                    <div key={b.id} className="p-2.5 bg-surface-dark border border-hairline/70 rounded-lg flex justify-between items-center text-xs">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-zinc-100 truncate">{b.player_name}</div>
                        <div className="text-xs text-nvidia-green font-medium truncate">{pc?.name || b.pc_id} • {pkg?.name || 'Paket'}</div>
                      </div>
                      <div className="font-bold text-zinc-100 text-right shrink-0 tabular-nums">
                        Rp {price.toLocaleString("id-ID")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Riwayat Transaksi Log Table */}
          <div className="bg-surface border border-hairline rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-hairline flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-nvidia-green shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Riwayat Transaksi • {filterPeriod === "today" ? "Hari Ini" : filterPeriod === "custom" ? customDate : "Semua Riwayat"}
                </h3>
                <span className="tabular-nums font-bold text-xs text-white/60 bg-white/5 px-2.5 py-0.5 rounded ml-1 shrink-0">
                  {displayLogs.length} Data
                </span>
              </div>

              {/* Filter Status dan Search Input */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-surface-dark border border-hairline/80 rounded-lg p-0.5 gap-0.5 text-xs">
                  {(["all", "Selesai", "Batal"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 rounded font-semibold text-[11px] transition ${
                        statusFilter === s
                          ? s === "Batal"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30 font-bold"
                            : "bg-white/10 text-white border border-white/15 font-bold"
                          : "text-white/50 hover:text-white"
                      }`}
                    >
                      {s === "all" ? "Semua Status" : s}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-60">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari pelanggan, PC, menu..."
                    className="w-full bg-surface-dark border border-hairline p-1.5 pl-7 pr-7 rounded-lg text-xs text-white placeholder:text-white/40 focus:border-nvidia-green outline-none"
                  />
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {displayLogs.length === 0 ? (
              <div className="py-12 text-center text-white/40 text-xs uppercase tracking-widest font-bold">
                Tidak ada data transaksi yang sesuai.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-surface-dark/90 border-b border-hairline/60 text-white/50 text-[10.5px] uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3 pl-5 pr-3">Waktu</th>
                      <th className="py-3 px-3">Pelanggan atau Pemain</th>
                      <th className="py-3 px-3">Tipe Unit</th>
                      <th className="py-3 px-3">Item atau Paket</th>
                      <th className="py-3 px-3">Nominal</th>
                      <th className="py-3 pr-5 pl-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {displayLogs.map((log) => {
                      const isSelesai = log.status === "Selesai";
                      return (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pl-5 pr-3 text-zinc-400 text-xs tabular-nums">
                            {filterPeriod === "today"
                              ? (log.end_time ? new Date(log.end_time).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) : (log.start_time ? new Date(log.start_time).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) : "-"))
                              : (log.end_time ? `${new Date(log.end_time).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} ${new Date(log.end_time).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}` : "-")}
                          </td>
                          <td className="py-3 px-3 font-bold text-zinc-100 text-xs">{log.player_name}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.pc_name === "KASIR" 
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                                : log.pc_name === "BILLING_SERVER"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/20"
                            }`}>
                              {log.pc_name}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-zinc-300 text-xs">
                            <div>{log.paket_name}</div>
                            {log.reason && <div className="text-[10px] text-red-400/80">{log.reason}</div>}
                          </td>
                          <td className="py-3 px-3 font-bold text-zinc-100 text-xs xl:text-sm tabular-nums">
                            Rp {Number(log.price).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 pr-5 pl-3 text-right">
                            {isSelesai ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                                <CheckCircle2 size={11} /> Selesai
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider">
                                <XCircle size={11} /> Batal
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Modal Unggah PDF Billing */}
        <AnimatePresence>
          {showPdfModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={() => setShowPdfModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#121316] border border-white/10 rounded-2xl p-5 md:p-6 max-w-md w-full shadow-2xl space-y-4"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-nvidia-green/10 border border-nvidia-green/30 text-nvidia-green rounded-lg">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                        Unggah Laporan PDF Cyberindo
                      </h3>
                      <p className="text-[11px] text-white/50">
                        Pilih tanggal database dan masukkan berkas laporan
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPdfModal(false)}
                    className="text-white/40 hover:text-white p-1 rounded transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Input Tanggal Laporan */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/60 uppercase block">
                    Tanggal Laporan Database
                  </label>
                  <input
                    type="date"
                    value={pdfDate}
                    onChange={(e) => setPdfDate(e.target.value)}
                    className="w-full bg-surface-dark border border-hairline p-2.5 rounded-lg text-xs text-white focus:border-nvidia-green outline-none"
                  />
                </div>

                {/* Peringatan Jika Database Tanggal Sudah Ada */}
                {hasExistingDateData ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-200 leading-relaxed">
                        Database pada tanggal <strong className="text-amber-300 font-bold">{pdfDate}</strong> sudah tersimpan di sistem dengan total omzet <strong className="text-white font-bold tabular-nums">Rp {existingDateTotal.toLocaleString("id-ID")}</strong>.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterPeriod("custom");
                        setCustomDate(pdfDate);
                        setShowPdfModal(false);
                      }}
                      className="w-full py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wide rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <Eye size={13} />
                      <span>Lihat Rekap Tanggal Tersebut</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-[11px] text-emerald-300 flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>Tanggal siap diinput. Belum ada data laporan tersimpan.</span>
                  </div>
                )}

                {/* Dropzone PDF File Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/60 uppercase block">
                    Pilih Berkas PDF
                  </label>
                  <div className="relative border border-dashed border-white/20 hover:border-nvidia-green/50 bg-surface-dark/50 rounded-xl p-4 text-center transition">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setPdfFile(f);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                    {pdfFile ? (
                      <div className="flex items-center justify-center gap-2 text-xs text-white">
                        <FileText size={16} className="text-nvidia-green" />
                        <span className="font-semibold truncate max-w-[220px]">{pdfFile.name}</span>
                        <span className="text-xs text-zinc-400 tabular-nums">
                          {Math.round(pdfFile.size / 1024)} KB
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload size={22} className="mx-auto text-white/40" />
                        <p className="text-xs text-white/70 font-semibold">
                          Klik atau seret file PDF ke sini
                        </p>
                        <p className="text-[10px] text-white/40">
                          Format berkas wajib dokumen PDF billing
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPdfModal(false);
                      setPdfFile(null);
                    }}
                    className="px-4 py-2 bg-surface-dark border border-hairline hover:bg-white/10 rounded-lg text-xs font-bold uppercase text-white/60 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!pdfFile || isUploading}
                    onClick={handleUploadSubmit}
                    className="px-5 py-2 bg-nvidia-green hover:bg-[#88d600] disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-sm"
                  >
                    {isUploading ? "Memproses..." : "Simpan Laporan PDF"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PinGuard>
  );
}
