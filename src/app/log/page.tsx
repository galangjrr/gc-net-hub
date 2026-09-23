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
  ArrowRight
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
      return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
    }
    if (act.includes("batal") || act.includes("hapus") || act.includes("reject")) {
      return "bg-red-500/15 border-red-500/30 text-red-300";
    }
    if (act.includes("checkout") || act.includes("kasir") || act.includes("f&b")) {
      return "bg-amber-500/15 border-amber-500/30 text-amber-300";
    }
    if (act.includes("ubah") || act.includes("paket") || act.includes("edit")) {
      return "bg-cyan-500/15 border-cyan-500/30 text-cyan-300";
    }
    return "bg-zinc-500/15 border-zinc-500/30 text-zinc-300";
  };

  // Helper icon target
  const getTargetIcon = (target: string) => {
    const t = target.toUpperCase();
    if (t.includes("PC")) return <Monitor size={13} className="text-nvidia-green shrink-0" />;
    if (t.includes("KASIR")) return <ShoppingCart size={13} className="text-amber-400 shrink-0" />;
    if (t.includes("PAKET")) return <Sliders size={13} className="text-cyan-400 shrink-0" />;
    if (t.includes("STOK") || t.includes("INV")) return <Package size={13} className="text-purple-400 shrink-0" />;
    return <Database size={13} className="text-zinc-400 shrink-0" />;
  };

  return (
    <PinGuard>
      <div className="min-h-screen bg-canvas text-primary pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-surface-soft border border-hairline flex items-center justify-center text-nvidia-green">
                <History size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Log Aktivitas Sistem
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Audit trail penekanan tombol dan riwayat eksekusi oleh operator berdasarkan sesi login.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadLogs(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-surface-soft hover:bg-white/10 border border-hairline text-zinc-200 text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
            >
              <RotateCw size={13} className={isRefreshing ? "animate-spin text-nvidia-green" : ""} />
              {isRefreshing ? "Memperbarui..." : "Segarkan"}
            </button>
          </div>
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-surface-1 border border-hairline/60 space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Aksi Hari Ini
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
                {stats.todayCount}
              </span>
              <span className="text-xs text-zinc-400 font-medium">eksekusi tercatat</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-1 border border-hairline/60 space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Operator Teraktif
            </span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-nvidia-green/15 border border-nvidia-green/30 flex items-center justify-center text-nvidia-green text-xs font-bold shrink-0">
                <User size={13} />
              </div>
              <span className="text-lg font-bold text-white truncate">
                {stats.topOperator}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-1 border border-hairline/60 space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Total Log Terarsip
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
                {stats.totalCount}
              </span>
              <span className="text-xs text-zinc-400 font-medium">entri sistem</span>
            </div>
          </div>
        </div>

        {/* FILTER & SEARCH CONTROLS */}
        <div className="p-3.5 rounded-2xl bg-surface-1 border border-hairline/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-surface-soft border border-hairline p-0.5">
              <button
                onClick={() => setFilterPeriod("today")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  filterPeriod === "today"
                    ? "bg-nvidia-green text-black font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setFilterPeriod("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  filterPeriod === "all"
                    ? "bg-nvidia-green text-black font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterPeriod("custom")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  filterPeriod === "custom"
                    ? "bg-nvidia-green text-black font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Pilih Tanggal
              </button>
            </div>

            {filterPeriod === "custom" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-soft border border-hairline text-zinc-200 focus:outline-none focus:border-nvidia-green"
              />
            )}

            {/* Operator Dropdown Filter */}
            {uniqueOperators.length > 0 && (
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-soft border border-hairline text-zinc-200 focus:outline-none focus:border-nvidia-green font-medium"
              >
                <option value="all">Semua Operator</option>
                {uniqueOperators.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative w-full md:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari aksi, operator, target PC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface-soft border border-hairline text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green transition"
            />
          </div>
        </div>

        {/* 4 UI STATES */}

        {/* 1. LOADING STATE */}
        {loading && (
          <div className="rounded-2xl bg-surface-1 border border-hairline/60 p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between gap-4 py-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-soft" />
                  <div className="space-y-1.5">
                    <div className="w-28 h-3.5 bg-surface-soft rounded" />
                    <div className="w-44 h-3 bg-surface-soft/60 rounded" />
                  </div>
                </div>
                <div className="w-24 h-6 bg-surface-soft rounded-md" />
                <div className="w-20 h-4 bg-surface-soft rounded" />
              </div>
            ))}
          </div>
        )}

        {/* 2. ERROR STATE */}
        {!loading && error && (
          <div className="p-8 rounded-2xl bg-surface-1 border border-red-500/20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle size={22} />
            </div>
            <h3 className="font-bold text-white text-base">Gagal Memuat Log Aktivitas</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => loadLogs(true)}
              className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* 3. EMPTY STATE */}
        {!loading && !error && filteredLogs.length === 0 && (
          <div className="p-12 rounded-2xl bg-surface-1 border border-hairline/60 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-soft border border-hairline text-zinc-400 flex items-center justify-center mx-auto">
              <History size={22} />
            </div>
            <h3 className="font-bold text-white text-base">Belum Ada Aktivitas Tercatat</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Semua aksi seperti konfirmasi antrean, checkout kasir, dan perubahan data unit PC akan otomatis terdata di sini.
            </p>
          </div>
        )}

        {/* 4. SUCCESS STATE: LOGS TABLE & LIST */}
        {!loading && !error && filteredLogs.length > 0 && (
          <div className="rounded-2xl bg-surface-1 border border-hairline/60 overflow-hidden shadow-lg">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-hairline text-zinc-400 uppercase tracking-wider text-[11px] font-bold bg-surface-soft/40">
                    <th className="py-3.5 pl-6 pr-4 w-[16%]">Waktu Eksekusi</th>
                    <th className="py-3.5 px-4 w-[18%]">Operator / Staf</th>
                    <th className="py-3.5 px-4 w-[20%]">Jenis Aksi</th>
                    <th className="py-3.5 px-4 w-[16%]">Target</th>
                    <th className="py-3.5 pr-6 pl-4 w-[30%]">Detail Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredLogs.map((log) => {
                    const timeObj = new Date(log.timestamp);
                    const timeStr = timeObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                    const dateStr = timeObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition">
                        {/* Waktu */}
                        <td className="py-3.5 pl-6 pr-4 tabular-nums">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-200 text-xs">{timeStr} WIB</span>
                            <span className="text-[11px] text-zinc-500 font-medium">{dateStr}</span>
                          </div>
                        </td>

                        {/* Operator */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-surface-soft border border-hairline flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {log.operator.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-white truncate">{log.operator}</span>
                              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                                {log.role}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold tracking-wide ${getActionBadgeStyle(log.action)}`}>
                            {log.action}
                          </span>
                        </td>

                        {/* Target */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                            {getTargetIcon(log.target)}
                            <span className="truncate">{log.target}</span>
                          </div>
                        </td>

                        {/* Detail */}
                        <td className="py-3.5 pr-6 pl-4 text-zinc-300 font-medium leading-relaxed">
                          {log.details || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-white/[0.05]">
              {filteredLogs.map((log) => {
                const timeObj = new Date(log.timestamp);
                const timeStr = timeObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                const dateStr = timeObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

                return (
                  <div key={log.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-surface-soft border border-hairline flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                          {log.operator.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-xs">{log.operator}</span>
                          <span className="text-[10px] text-zinc-500 uppercase">{log.role}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-400 tabular-nums font-medium">
                        {dateStr} • {timeStr} WIB
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${getActionBadgeStyle(log.action)}`}>
                        {log.action}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-zinc-300">
                        {getTargetIcon(log.target)}
                        <span>{log.target}</span>
                      </div>
                    </div>

                    {log.details && (
                      <p className="text-xs text-zinc-400 bg-surface-soft/60 p-2 rounded-lg border border-hairline/60">
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
