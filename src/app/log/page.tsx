"use client";

import { useState, useEffect } from "react";
import { BookOpen, CheckCircle2, XCircle, ArrowDownWideNarrow, Search, RotateCw, Monitor, ShoppingCart } from "lucide-react";
import type { DatabaseSchema, LogEntry } from "@/lib/db";
import PinGuard from "@/components/PinGuard";

export default function LogAktivitasPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [filterDate, setFilterDate] = useState<"today" | "all">("today");
  const [filterStatus, setFilterStatus] = useState<"all" | "Selesai" | "Batal">("all");
  const [search, setSearch] = useState("");

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
  }, []);

  if (!db) return <div className="p-8 tracking-tight text-white/50 text-xs animate-pulse">MEMUAT LOG AKTIVITAS...</div>;

  const today = new Date().toDateString();
  const filteredLogs = [...(db.logs || [])]
    .filter(l => {
      if (filterDate === "today" && new Date(l.end_time).toDateString() !== today) return false;
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          l.player_name.toLowerCase().includes(q) ||
          l.pc_name.toLowerCase().includes(q) ||
          l.paket_name.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());

  return (
    <PinGuard>
      <div className="bg-surface-dark min-h-screen p-4 md:p-8 pt-16 md:pt-8 text-white space-y-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-hairline">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-nvidia-green/10 border border-nvidia-green/30 rounded-xl text-nvidia-green">
                <BookOpen size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">Log Aktivitas & Transaksi</h1>
                <p className="text-white/60 tracking-wider text-xs uppercase mt-1">
                  &gt; RIWAYAT LENGKAP TRANSAKSI, SESI PC, DAN PEMBATALAN
                </p>
              </div>
            </div>

            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-white/10 border border-hairline rounded-lg text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white transition w-fit"
            >
              <RotateCw size={16} />
              Segarkan Log
            </button>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex bg-surface border border-hairline rounded-lg overflow-hidden p-0.5">
                {(["today", "all"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterDate(f)}
                    className={`px-3 py-1.5 font-bold uppercase rounded text-[11px] transition ${
                      filterDate === f ? "bg-nvidia-green text-black shadow-sm" : "text-white/50 hover:text-white"
                    }`}
                  >
                    {f === "today" ? "Hari Ini" : "Semua Riwayat"}
                  </button>
                ))}
              </div>

              <div className="flex bg-surface border border-hairline rounded-lg overflow-hidden p-0.5">
                {(["all", "Selesai", "Batal"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterStatus(f)}
                    className={`px-3 py-1.5 font-bold uppercase rounded text-[11px] transition ${
                      filterStatus === f
                        ? f === "Batal"
                          ? "bg-error text-white"
                          : "bg-nvidia-green text-black"
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    {f === "all" ? "Semua Status" : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama, PC, item..."
                className="w-full bg-surface border border-hairline p-2.5 pl-9 rounded-lg text-xs text-white placeholder:text-white/40 focus:border-nvidia-green outline-none"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-surface border border-hairline rounded-xl overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-surface-dark border-b border-hairline text-white/50 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-4 pl-6">Waktu Transaksi</th>
                  <th className="p-4">Pelanggan / Pemain</th>
                  <th className="p-4">Tipe / Target</th>
                  <th className="p-4">Paket / Menu</th>
                  <th className="p-4">Nilai Transaksi</th>
                  <th className="p-4 pr-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredLogs.map((log: LogEntry) => {
                  const isSelesai = log.status === "Selesai";
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 pl-6 font-mono text-white/50 text-[11px]">
                        {new Date(log.end_time).toLocaleString("id-ID", { 
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" 
                        })}
                      </td>
                      <td className="p-4 font-bold text-white text-sm">{log.player_name}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                          log.pc_name === "KASIR"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                            : "bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/30"
                        }`}>
                          {log.pc_name}
                        </span>
                      </td>
                      <td className="p-4 text-white/80">{log.paket_name}</td>
                      <td className="p-4 font-mono font-bold text-white text-sm">
                        Rp {Number(log.price).toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {isSelesai ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 size={12} /> Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-error/10 text-error border border-error/30 text-[10px] font-bold uppercase tracking-wider">
                            <XCircle size={12} /> Batal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-white/30 text-xs uppercase tracking-widest font-bold">
                      Tidak ada data log yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {filteredLogs.map((log: LogEntry) => {
              const isSelesai = log.status === "Selesai";
              return (
                <div
                  key={log.id}
                  className={`bg-surface border p-4 rounded-xl shadow space-y-2.5 ${
                    isSelesai ? "border-hairline" : "border-error/30 opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.pc_name === "KASIR" ? "bg-cyan-500/10 text-cyan-400" : "bg-nvidia-green/10 text-nvidia-green"
                      }`}>
                        {log.pc_name}
                      </span>
                      <h4 className="font-bold text-white text-sm">{log.player_name}</h4>
                    </div>

                    {isSelesai ? (
                      <span className="text-emerald-400 text-[10px] font-bold uppercase flex items-center gap-1">
                        <CheckCircle2 size={12} /> Selesai
                      </span>
                    ) : (
                      <span className="text-error text-[10px] font-bold uppercase flex items-center gap-1">
                        <XCircle size={12} /> Batal
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center bg-surface-dark p-2.5 rounded-lg border border-hairline text-xs">
                    <div className="text-white/70">{log.paket_name}</div>
                    <div className="font-mono font-bold text-white text-sm">
                      Rp {Number(log.price).toLocaleString("id-ID")}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-white/40">
                    {new Date(log.end_time).toLocaleString("id-ID", { 
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" 
                    })}
                  </div>
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="p-8 text-center text-white/30 text-xs uppercase tracking-widest font-bold bg-surface border border-hairline rounded-xl">
                Tidak ada log aktivitas.
              </div>
            )}
          </div>

        </div>
      </div>
    </PinGuard>
  );
}
