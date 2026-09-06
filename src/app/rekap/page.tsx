"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Banknote, Users, Coins, RotateCw, Receipt, Monitor, ShoppingCart } from "lucide-react";
import type { DatabaseSchema, LogEntry, Booking, Paket } from "@/lib/db";
import PinGuard from "@/components/PinGuard";

export default function RekapKeuanganPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [pdfRevenue, setPdfRevenue] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<"today" | "all">("today");

  const loadData = async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDb(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Live sync for pooling
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (db?.settings?.daily_pdf_revenue) {
      setPdfRevenue(db.settings.daily_pdf_revenue);
    }
  }, [db?.settings?.daily_pdf_revenue]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (data.total > 0) {
        setPdfRevenue(data.total);
      } else {
        alert("Gagal menemukan angka total di PDF.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat memproses PDF.");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  if (!db) return <div className="p-8 tracking-tight text-white/50 uppercase text-xs animate-pulse">Memuat data rekap...</div>;

  const todayStr = new Date().toDateString();

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

  // Filter logs by period
  const allLogs = db.logs || [];
  const completedLogs = allLogs.filter(l => {
    if (l.status !== 'Selesai') return false;
    if (filterPeriod === 'today') {
      const logDate = l.end_time ? new Date(l.end_time).toDateString() : "";
      return logDate === todayStr;
    }
    return true;
  });

  // 1. Booking PC Logs
  const completedBookingLogs = completedLogs.filter(l => l.pc_name !== 'KASIR');
  const bookingRevenue = completedBookingLogs.reduce((sum, l) => sum + (Number(l.price) || 0), 0);

  // 2. F&B Logs
  const completedFnbLogs = completedLogs.filter(l => l.pc_name === 'KASIR');
  const fnbRevenue = completedFnbLogs.reduce((sum, l) => sum + (Number(l.price) || 0), 0);

  // Total Revenue (F&B + Bookings + PDF)
  const totalRevenue = fnbRevenue + bookingRevenue + (filterPeriod === 'today' ? pdfRevenue : 0);

  // Total Completed Transactions
  const totalTransactions = completedBookingLogs.length + completedFnbLogs.length;

  // Active / Ongoing Booking Pooling (Real money collected from QRIS/Cash held in current queue/active sessions)
  const activeBookings = (db.bookings || []).filter(b => b.status === 'active' || b.status === 'pending');
  const activePooling = activeBookings.reduce((sum, b) => sum + getBookingPrice(b), 0);

  return (
    <PinGuard>
      <div className="bg-surface-dark min-h-screen p-4 md:p-8 pt-16 md:pt-8 text-white">
        <div className="max-w-[1400px] mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-hairline">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-nvidia-green/10 border border-nvidia-green/30 rounded-xl text-nvidia-green">
                <TrendingUp size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">Rekap & Pooling</h1>
                <p className="text-white/60 tracking-wider text-xs uppercase mt-1">
                  &gt; ANALITIK PENDAPATAN & MONEY POOLING
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-surface border border-hairline rounded-lg p-0.5 text-xs">
                {(["today", "all"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterPeriod(f)}
                    className={`px-3 py-1.5 font-bold uppercase rounded text-[11px] transition ${
                      filterPeriod === f ? "bg-nvidia-green text-black shadow-sm" : "text-white/50 hover:text-white"
                    }`}
                  >
                    {f === "today" ? "Hari Ini" : "Semua Riwayat"}
                  </button>
                ))}
              </div>

              <button
                onClick={loadData}
                className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-white/10 border border-hairline rounded-lg text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white transition w-fit"
              >
                <RotateCw size={16} />
                Segarkan Data
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Total Revenue Card */}
            <div className="nvidia-card p-6 border-nvidia-green/40 relative overflow-hidden bg-surface">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Banknote size={120} />
              </div>
              <div className="nvidia-corner"></div>
              <h3 className="text-white/50 font-bold tracking-wider text-xs uppercase mb-2">
                Total Pendapatan ({filterPeriod === "today" ? "Hari Ini" : "Semua Riwayat"})
              </h3>
              <p className="text-3xl font-bold text-nvidia-green tracking-tight font-mono">
                Rp {totalRevenue.toLocaleString("id-ID")}
              </p>
              <div className="mt-4 pt-4 border-t border-hairline flex flex-col gap-1.5 text-[11px] tracking-tight text-white/60 uppercase">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><ShoppingCart size={13} className="text-cyan-400" /> Kasir F&B:</span>
                  <span className="text-white font-mono font-bold">Rp {fnbRevenue.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><Monitor size={13} className="text-nvidia-green" /> Booking PC Selesai:</span>
                  <span className="text-white font-mono font-bold">Rp {bookingRevenue.toLocaleString("id-ID")}</span>
                </div>
                {pdfRevenue > 0 && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><Receipt size={13} className="text-amber-400" /> Billing PC (PDF):</span>
                    <span className="text-white font-mono font-bold">Rp {pdfRevenue.toLocaleString("id-ID")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total Transactions Card */}
            <div className="nvidia-card p-6 relative overflow-hidden bg-surface">
              <div className="absolute -right-4 -top-4 opacity-5">
                <Users size={120} />
              </div>
              <div className="nvidia-corner"></div>
              <h3 className="text-white/50 font-bold tracking-wider text-xs uppercase mb-2">
                Total Transaksi Selesai
              </h3>
              <p className="text-3xl font-bold text-white tracking-tight font-mono">
                {totalTransactions} <span className="text-sm font-sans text-white/40 font-normal">transaksi</span>
              </p>
              <p className="text-[11px] text-white/40 tracking-wider mt-4 uppercase">
                Termasuk penjualan F&B kasir dan sewa PC yang telah dituntaskan hari ini
              </p>
            </div>

            {/* Money Pooling Card */}
            <div className="nvidia-card p-6 bg-nvidia-green/5 border-nvidia-green relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10 text-nvidia-green">
                <Coins size={120} />
              </div>
              <div className="nvidia-corner"></div>
              <h3 className="text-white/50 font-bold tracking-wider text-xs uppercase mb-2">
                Money Pooling (Live Antrean)
              </h3>
              <p className="text-3xl font-bold text-white tracking-tight flex items-center gap-2 font-mono">
                <span className="relative flex h-3 w-3 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-nvidia-green"></span>
                </span>
                Rp {activePooling.toLocaleString("id-ID")}
              </p>
              <p className="text-[11px] text-white/50 tracking-wider mt-4 uppercase">
                Uang tertahan di <span className="text-nvidia-green font-bold">{activeBookings.length} booking</span> aktif & antrean
              </p>
            </div>

          </div>

          {/* Active Pooling Breakdown */}
          {activeBookings.length > 0 && (
            <div className="bg-surface border border-hairline p-5 rounded-lg space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Coins size={16} className="text-nvidia-green" />
                Rincian Money Pooling Berjalan ({activeBookings.length} Antrean)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {activeBookings.map(b => {
                  const pc = db.pcs?.find(p => p.id === b.pc_id);
                  const pkg = db.pakets?.find(p => p.id === b.paket_id);
                  const price = getBookingPrice(b);
                  return (
                    <div key={b.id} className="p-3 bg-surface-dark border border-hairline rounded flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-white tracking-tight">{b.player_name}</div>
                        <div className="text-[10px] text-nvidia-green">{pc?.name || b.pc_id} &bull; {pkg?.name || 'Paket'}</div>
                      </div>
                      <div className="font-mono font-bold text-white">
                        Rp {price.toLocaleString("id-ID")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PDF Uploader Area */}
          <div className="p-6 border border-hairline border-dashed bg-surface-dark relative text-center rounded-lg">
            <input 
              type="file" 
              accept="application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              disabled={isUploading}
            />
            <div className="pointer-events-none">
              <TrendingUp size={32} className={`mx-auto mb-3 ${isUploading ? 'text-nvidia-green animate-bounce' : 'text-white/20'}`} />
              <h3 className="tracking-tight font-bold text-white uppercase text-sm">
                {isUploading ? "Membaca Laporan PDF..." : "Upload PDF Laporan Billing PC"}
              </h3>
              <p className="tracking-tight text-xs text-white/40 mt-2">
                Klik atau drag & drop file .pdf dari sistem billing server ke sini untuk menggabungkan pendapatan offline.
              </p>
            </div>
          </div>

          {/* Completed Transactions Log Table */}
          <div className="bg-surface border border-hairline rounded-lg overflow-hidden">
            <div className="p-4 border-b border-hairline flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Receipt size={16} className="text-nvidia-green" />
                Daftar Transaksi Selesai ({filterPeriod === "today" ? "Hari Ini" : "Semua Riwayat"}) ({completedLogs.length})
              </h3>
            </div>
            
            {completedLogs.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-xs uppercase tracking-widest">
                Belum ada transaksi selesai {filterPeriod === "today" ? "hari ini" : "yang tercatat"}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-dark border-b border-hairline text-white/50 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3 pl-4">Waktu</th>
                      <th className="p-3">Pelanggan / Pemain</th>
                      <th className="p-3">Tipe / Target</th>
                      <th className="p-3">Item / Paket</th>
                      <th className="p-3 pr-4 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {completedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 pl-4 font-mono text-white/50">
                          {filterPeriod === "today"
                            ? (log.end_time ? new Date(log.end_time).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) : "-")
                            : (log.end_time ? `${new Date(log.end_time).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} ${new Date(log.end_time).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}` : "-")}
                        </td>
                        <td className="p-3 font-bold text-white">{log.player_name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.pc_name === "KASIR" ? "bg-cyan-500/10 text-cyan-400" : "bg-nvidia-green/10 text-nvidia-green"
                          }`}>
                            {log.pc_name}
                          </span>
                        </td>
                        <td className="p-3 text-white/70">{log.paket_name}</td>
                        <td className="p-3 pr-4 text-right font-mono font-bold text-nvidia-green">
                          Rp {Number(log.price).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </PinGuard>
  );
}
