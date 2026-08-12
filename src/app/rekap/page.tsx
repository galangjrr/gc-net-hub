"use client";

import { useState, useEffect } from "react";
import { ChartLineUp, Money, Users, Coins } from "@phosphor-icons/react";
import type { DatabaseSchema, LogEntry, Booking, Paket } from "@/lib/db";

export default function RekapKeuanganPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [pdfRevenue, setPdfRevenue] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    const res = await fetch("/api/data");
    const data = await res.json();
    setDb(data);
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
      alert("Error membaca PDF.");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  if (!db) return <div className="p-8 tracking-tight text-white/50 text-xs">LOADING DATA...</div>;

  // Calculations
  const today = new Date().toDateString();
  const todaysLogs = db.logs?.filter(l => new Date(l.end_time).toDateString() === today && l.status === 'Selesai') || [];
  
  const fnbRevenue = todaysLogs.filter(l => l.pc_name === "KASIR").reduce((sum, log) => sum + log.price, 0);
  const revenueToday = fnbRevenue + pdfRevenue;
  const totalTransactions = db.logs?.filter(l => new Date(l.end_time).toDateString() === today && l.status === 'Selesai').length || 0;

  // Active Pooling: Money currently held in active/pending bookings
  const activeBookings = db.bookings || [];
  const activePooling = activeBookings.reduce((sum, b) => {
    const pkg = db.pakets.find(p => p.id === b.paket_id);
    return sum + (pkg?.price || 0);
  }, 0);

  return (
    <div className="bg-surface-dark p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-hairline">
          <ChartLineUp size={32} className="text-nvidia-green" weight="fill" />
          <div>
            <h1 className="text-3xl font-bold text-white uppercase tracking-tight tracking-tight">Rekap & Pooling</h1>
            <p className="text-white/60 tracking-tight text-sm mt-1">&gt; ANALITIK PENDAPATAN HARIAN</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Revenue Card */}
          <div className="nvidia-card p-6 border-nvidia-green/30 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
              <Money size={120} weight="fill" />
            </div>
            <div className="nvidia-corner"></div>
            <h3 className="text-white/50 font-bold tracking-tight text-xs uppercase mb-2">Total Pendapatan (F&B + PC)</h3>
            <p className="text-3xl font-bold text-nvidia-green tracking-tight">
              Rp {revenueToday.toLocaleString("id-ID")}
            </p>
            <div className="mt-4 pt-4 border-t border-hairline flex flex-col gap-1 text-[10px] tracking-tight text-white/50 uppercase">
              <div className="flex justify-between"><span>Kasir F&B:</span> <span className="text-white">Rp {fnbRevenue.toLocaleString("id-ID")}</span></div>
              <div className="flex justify-between"><span>Billing PC (PDF):</span> <span className="text-white">Rp {pdfRevenue.toLocaleString("id-ID")}</span></div>
            </div>
          </div>

          {/* Transactions Card */}
          <div className="nvidia-card p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5">
              <Users size={120} weight="fill" />
            </div>
            <div className="nvidia-corner"></div>
            <h3 className="text-white/50 font-bold tracking-tight text-xs uppercase mb-2">Total Transaksi Selesai (Hari Ini)</h3>
            <p className="text-3xl font-bold text-white tracking-tight">
              {totalTransactions} <span className="text-lg text-white/40">trx</span>
            </p>
          </div>

          {/* Money Pooling Card */}
          <div className="nvidia-card p-6 bg-nvidia-green/5 border-nvidia-green relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10 text-nvidia-green">
              <Coins size={120} weight="fill" />
            </div>
            <div className="nvidia-corner"></div>
            <h3 className="text-white/50 font-bold tracking-tight text-xs uppercase mb-2">Money Pooling (Live)</h3>
            <p className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-nvidia-green"></span>
              </span>
              Rp {activePooling.toLocaleString("id-ID")}
            </p>
            <p className="text-[10px] text-white/40 tracking-tight mt-2 uppercase">
              Uang tertahan di {activeBookings.length} booking aktif/pending
            </p>
          </div>

        </div>

        {/* PDF Uploader Area */}
        <div className="mt-8 p-6 border border-hairline border-dashed bg-surface-dark relative text-center">
          <input 
            type="file" 
            accept="application/pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            disabled={isUploading}
          />
          <div className="pointer-events-none">
            <ChartLineUp size={32} className={`mx-auto mb-3 ${isUploading ? 'text-nvidia-green animate-bounce' : 'text-white/20'}`} />
            <h3 className="tracking-tight font-bold text-white uppercase text-sm">
              {isUploading ? "Membaca Laporan PDF..." : "Upload PDF Laporan Billing PC"}
            </h3>
            <p className="tracking-tight text-xs text-white/40 mt-2">
              Klik atau drag & drop file .pdf dari sistem billing utama ke sini untuk menggabungkan pendapatan.
            </p>
          </div>
        </div>

        {pdfRevenue > 0 && (
          <p className="mt-3 text-center text-[10px] tracking-tight text-amber-400/70 uppercase">
            ⚠ Data PDF bersifat sementara — akan hilang jika halaman di-refresh.
          </p>
        )}
      </div>
    </div>
  );
}
