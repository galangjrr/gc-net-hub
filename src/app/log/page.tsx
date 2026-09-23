"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  History, 
  User, 
  Clock, 
  Search, 
  Calendar, 
  RotateCw, 
  Filter, 
  ShieldCheck, 
  Monitor, 
  ShoppingCart, 
  Sliders, 
  Package, 
  Radio, 
  AlertCircle,
  Database,
  ArrowRight,
  Zap,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import PinGuard from "@/components/PinGuard";
import { supabase } from "@/lib/supabase";

interface ActivityLog {
  id: string;
  operator: string;
  role: string;
  target: string;
  action: string;
  details: string;
  timestamp: string;
}

interface ActivityStats {
  todayCount: number;
  totalCount: number;
  topOperator: string;
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats>({ todayCount: 0, totalCount: 0, topOperator: "-" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "custom">("today");
  const [customDate, setCustomDate] = useState("");

  const todayIso = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  useEffect(() => {
    setCustomDate(todayIso);
  }, [todayIso]);

  const loadLogs = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "150");
      if (filterPeriod === "today") {
        params.set("date", todayIso);
      } else if (filterPeriod === "custom" && customDate) {
        params.set("date", customDate);
      }
      if (selectedOperator !== "all") {
        params.set("operator", selectedOperator);
      }

      const res = await fetch(`/api/logs/activity?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal mengambil data log dari server");
      const data = await res.json();
      setLogs(data.activities || []);
      setStats(data.stats || { todayCount: 0, totalCount: 0, topOperator: "-" });
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat memuat log aktivitas");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();

    // Supabase Realtime channel untuk sync otomatis setiap ada aksi baru
    const channel = supabase
      .channel("public:activity-logs-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "logs" }, (payload) => {
        if (payload.new && (payload.new as any).status === "Aktivitas") {
          loadLogs();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterPeriod, customDate, selectedOperator]);

  // Ekstrak daftar unik operator dari log yang ada
  const uniqueOperators = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.operator && l.operator !== "Sistem" && l.operator !== "Pelanggan Online") {
        set.add(l.operator);
      }
    });
    return Array.from(set);
  }, [logs]);

  // Client-side search filtering
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter((l) =>
      l.operator.toLowerCase().includes(q) ||
      l.target.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  // Helper tema badge per kategori aksi
  const getActionBadgeStyle = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("konfirmasi") || act.includes("masuk") || act.includes("simpan")) {
      return "bg-emerald-500/20 border-emerald-500/40 text-emerald-300";
    }
    if (act.includes("batal") || act.includes("hapus") || act.includes("reject")) {
      return "bg-red-500/20 border-red-500/40 text-red-300";
    }
    if (act.includes("checkout") || act.includes("kasir") || act.includes("f&b")) {
      return "bg-amber-500/20 border-amber-500/40 text-amber-300";
    }
    if (act.includes("ubah") || act.includes("paket") || act.includes("edit")) {
      return "bg-cyan-500/20 border-cyan-500/40 text-cyan-300";
    }
    return "bg-zinc-500/20 border-zinc-500/40 text-zinc-200";
  };

  // Helper icon target
  const getTargetIcon = (target: string) => {
    const t = target.toUpperCase();
    if (t.includes("PC")) return <Monitor size={16} className="text-nvidia-green shrink-0" />;
    if (t.includes("KASIR")) return <ShoppingCart size={16} className="text-amber-400 shrink-0" />;
    if (t.includes("PAKET")) return <Sliders size={16} className="text-cyan-400 shrink-0" />;
    if (t.includes("STOK") || t.includes("INV")) return <Package size={16} className="text-purple-400 shrink-0" />;
    return <Database size={16} className="text-zinc-400 shrink-0" />;
  };

  return (
    <PinGuard>
      <div className="min-h-screen bg-canvas text-primary pb-24 pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline/60 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-surface-soft border border-hairline flex items-center justify-center text-nvidia-green shadow-inner">
                <History size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                Log Aktivitas Sistem
              </h1>
              <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Sync
              </span>
            </div>
            <p className="text-sm text-zinc-300 font-medium">
              Audit trail penekanan tombol dan riwayat eksekusi oleh operator berdasarkan sesi login.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => loadLogs(true)}
              disabled={isRefreshing}
              aria-label="Segarkan data log aktivitas"
              className="px-4 py-2.5 rounded-xl bg-surface-soft hover:bg-white/10 border border-hairline text-white text-xs sm:text-sm font-bold flex items-center gap-2.5 transition disabled:opacity-50"
            >
              <RotateCw size={15} className={isRefreshing ? "animate-spin text-nvidia-green" : ""} />
              <span>{isRefreshing ? "Memperbarui..." : "Segarkan Data"}</span>
            </button>
          </div>
        </div>

        {/* 3 SOLID METRIC CARDS (GAGAH, LEGA, DAN TEBAL) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Aksi Hari Ini */}
          <div className="p-6 rounded-2xl bg-surface-1 border border-hairline hover:border-zinc-700 transition relative overflow-hidden flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400 block mb-2">
                Aksi Hari Ini
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                {stats.todayCount}
              </div>
              <span className="text-xs font-bold text-zinc-400 block mt-1.5">
                eksekusi tercatat
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center text-nvidia-green shrink-0 shadow-[0_0_15px_rgba(118,185,0,0.15)]">
              <Zap size={22} />
            </div>
          </div>

          {/* Card 2: Operator Teraktif */}
          <div className="p-6 rounded-2xl bg-surface-1 border border-hairline hover:border-zinc-700 transition relative overflow-hidden flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400 block mb-2">
                Operator Teraktif
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                {stats.topOperator}
              </div>
              <span className="text-xs font-bold text-emerald-400 block mt-1.5">
                staf paling produktif
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <UserCheck size={22} />
            </div>
          </div>

          {/* Card 3: Total Log Terarsip */}
          <div className="p-6 rounded-2xl bg-surface-1 border border-hairline hover:border-zinc-700 transition relative overflow-hidden flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400 block mb-2">
                Total Log Terarsip
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                {stats.totalCount}
              </div>
              <span className="text-xs font-bold text-zinc-400 block mt-1.5">
                entri riwayat sistem
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <Database size={22} />
            </div>
          </div>
        </div>

        {/* FILTER & SEARCH CONTROLS */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-1 border border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl bg-surface-soft border border-hairline p-1">
              <button
                onClick={() => setFilterPeriod("today")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition ${
                  filterPeriod === "today"
                    ? "bg-nvidia-green text-black shadow-md"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setFilterPeriod("all")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition ${
                  filterPeriod === "all"
                    ? "bg-nvidia-green text-black shadow-md"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterPeriod("custom")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition ${
                  filterPeriod === "custom"
                    ? "bg-nvidia-green text-black shadow-md"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                Pilih Tanggal
              </button>
            </div>

            {filterPeriod === "custom" && (
              <input
                type="date"
                value={customDate}
                aria-label="Pilih tanggal log aktivitas"
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-4 py-2 rounded-xl bg-surface-soft border border-hairline text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-nvidia-green"
              />
            )}

            {/* Operator Dropdown Filter */}
            {uniqueOperators.length > 0 && (
              <select
                value={selectedOperator}
                aria-label="Filter berdasarkan operator"
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="px-4 py-2 rounded-xl bg-surface-soft border border-hairline text-white focus:outline-none focus:border-nvidia-green text-xs sm:text-sm font-bold"
              >
                <option value="all">Semua Operator</option>
                {uniqueOperators.map((op) => (
                  <option key={op} value={op}>
                    Operator {op}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari aksi, operator, target PC..."
              aria-label="Cari aksi, operator, atau target PC"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-soft border border-hairline text-white font-medium text-xs sm:text-sm placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green transition"
            />
          </div>
        </div>

        {/* 4 UI STATES */}

        {/* 1. LOADING STATE */}
        {loading && (
          <div className="rounded-2xl bg-surface-1 border border-hairline p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between gap-4 py-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-soft" />
                  <div className="space-y-2">
                    <div className="w-36 h-4 bg-surface-soft rounded" />
                    <div className="w-56 h-3 bg-surface-soft/60 rounded" />
                  </div>
                </div>
                <div className="w-28 h-8 bg-surface-soft rounded-lg" />
                <div className="w-24 h-5 bg-surface-soft rounded" />
              </div>
            ))}
          </div>
        )}

        {/* 2. ERROR STATE */}
        {!loading && error && (
          <div className="p-10 rounded-2xl bg-surface-1 border border-red-500/20 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle size={26} />
            </div>
            <h3 className="font-black text-white text-lg">Gagal Memuat Log Aktivitas</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">{error}</p>
          </div>
        )}

        {/* 3. EMPTY STATE */}
        {!loading && !error && filteredLogs.length === 0 && (
          <div className="p-12 rounded-2xl bg-surface-1 border border-hairline text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-soft border border-hairline text-zinc-500 flex items-center justify-center mx-auto">
              <History size={26} />
            </div>
            <h3 className="font-black text-white text-base uppercase">Belum Ada Aktivitas Tercatat</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Tidak ada riwayat aktivitas yang cocok dengan kriteria filter saat ini.
            </p>
          </div>
        )}

        {/* 4. SUCCESS STATE: LOGS TABLE & LIST */}
        {!loading && !error && filteredLogs.length > 0 && (
          <div className="rounded-2xl bg-surface-1 border border-hairline overflow-hidden shadow-2xl">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-hairline text-zinc-300 uppercase tracking-wider text-xs sm:text-sm font-black bg-surface-soft/80">
                    <th scope="col" className="py-4 pl-6 pr-4 w-[16%]">Waktu Eksekusi</th>
                    <th scope="col" className="py-4 px-4 w-[18%]">Operator / Staf</th>
                    <th scope="col" className="py-4 px-4 w-[18%]">Jenis Aksi</th>
                    <th scope="col" className="py-4 px-4 w-[16%]">Target</th>
                    <th scope="col" className="py-4 pr-6 pl-4 w-[32%]">Detail Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredLogs.map((log) => {
                    const timeObj = new Date(log.timestamp);
                    const timeStr = timeObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                    const dateStr = timeObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.03] transition">
                        {/* Waktu */}
                        <td className="py-4 sm:py-5 pl-6 pr-4 tabular-nums">
                          <div className="flex flex-col">
                            <span className="font-black text-white text-sm sm:text-base font-mono">{timeStr} WIB</span>
                            <span className="text-xs text-zinc-400 font-bold mt-0.5">{dateStr}</span>
                          </div>
                        </td>

                        {/* Operator */}
                        <td className="py-4 sm:py-5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-surface-soft border border-hairline flex items-center justify-center text-white text-sm font-black shrink-0 shadow-sm">
                              {log.operator.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-black text-white text-sm sm:text-base truncate">{log.operator}</span>
                              <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold">
                                {log.role}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-4 sm:py-5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-black tracking-wide ${getActionBadgeStyle(log.action)}`}>
                            {log.action}
                          </span>
                        </td>

                        {/* Target */}
                        <td className="py-4 sm:py-5 px-4">
                          <div className="flex items-center gap-2 font-black text-sm sm:text-base text-white">
                            {getTargetIcon(log.target)}
                            <span className="truncate">{log.target}</span>
                          </div>
                        </td>

                        {/* Detail */}
                        <td className="py-4 sm:py-5 pr-6 pl-4 text-sm sm:text-base text-zinc-100 font-medium leading-relaxed">
                          {log.details || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-white/[0.06]">
              {filteredLogs.map((log) => {
                const timeObj = new Date(log.timestamp);
                const timeStr = timeObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                const dateStr = timeObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

                return (
                  <div key={log.id} className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-surface-soft border border-hairline flex items-center justify-center text-white text-xs font-black shrink-0">
                          {log.operator.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-white text-sm">{log.operator}</span>
                          <span className="text-xs text-zinc-400 uppercase font-bold">{log.role}</span>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400 tabular-nums font-mono font-bold">
                        {dateStr} • {timeStr} WIB
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black border ${getActionBadgeStyle(log.action)}`}>
                        {log.action}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-black text-white">
                        {getTargetIcon(log.target)}
                        <span>{log.target}</span>
                      </div>
                    </div>

                    {log.details && (
                      <p className="text-xs sm:text-sm text-zinc-100 bg-surface-soft/80 p-3 rounded-xl border border-hairline font-medium leading-relaxed">
                        {log.details}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </PinGuard>
  );
}
