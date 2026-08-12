"use client";

import { useState, useEffect } from "react";
import { BookOpenText, CheckCircle, WarningCircle, SortDescending } from "@phosphor-icons/react";
import type { DatabaseSchema, LogEntry } from "@/lib/db";

export default function LogAktivitasPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [filterDate, setFilterDate] = useState<"today" | "all">("today");
  const [filterStatus, setFilterStatus] = useState<"all" | "Selesai" | "Batal">("all");

  const loadData = async () => {
    const res = await fetch("/api/data");
    const data = await res.json();
    setDb(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!db) return <div className="p-8 tracking-tight text-white/50 text-xs">LOADING DATA...</div>;

  const today = new Date().toDateString();
  const filteredLogs = [...(db.logs || [])]
    .filter(l => {
      if (filterDate === "today" && new Date(l.end_time).toDateString() !== today) return false;
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());

  return (
    <div className="bg-surface-dark p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 pb-6 border-b border-hairline">
          <div className="flex items-center gap-4 flex-1">
            <BookOpenText size={32} className="text-nvidia-green" weight="fill" />
            <div>
              <h1 className="text-3xl font-bold text-white uppercase tracking-tight tracking-tight">Log Aktivitas</h1>
              <p className="text-white/60 tracking-tight text-sm mt-1">&gt; RIWAYAT TRANSAKSI &amp; PEMBATALAN</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 tracking-tight text-xs">
            <div className="flex border border-hairline rounded-[2px] overflow-hidden">
              {(["today", "all"] as const).map(f => (
                <button key={f} onClick={() => setFilterDate(f)}
                  className={`px-3 py-2 font-bold uppercase transition-colors ${filterDate === f ? "bg-nvidia-green text-black" : "text-white/50 hover:text-white"}`}>
                  {f === "today" ? "Hari Ini" : "Semua"}
                </button>
              ))}
            </div>
            <div className="flex border border-hairline rounded-[2px] overflow-hidden">
              {(["all", "Selesai", "Batal"] as const).map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={`px-3 py-2 font-bold uppercase transition-colors ${filterStatus === f ? "bg-nvidia-green text-black" : "text-white/50 hover:text-white"}`}>
                  {f === "all" ? "Semua" : f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 px-3 py-2 border border-hairline text-white/30">
              <SortDescending size={14} /> <span>Terbaru</span>
            </div>
          </div>
        </div>

        <div className="nvidia-card overflow-hidden">
          <div className="nvidia-corner"></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left tracking-tight whitespace-nowrap">
              <thead className="bg-surface-soft text-white/50 text-[11px] uppercase border-b border-hairline">
                <tr>
                  <th className="p-4 font-bold border-r border-hairline">Waktu</th>
                  <th className="p-4 font-bold border-r border-hairline">Nama</th>
                  <th className="p-4 font-bold border-r border-hairline">PC</th>
                  <th className="p-4 font-bold border-r border-hairline">Item/Paket</th>
                  <th className="p-4 font-bold border-r border-hairline">Nilai (Rp)</th>
                  <th className="p-4 font-bold border-r border-hairline">Status</th>
                  <th className="p-4 font-bold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-surface-dark text-sm">
                {filteredLogs.map((log: LogEntry) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 border-r border-hairline text-white/50 text-xs">
                      {new Date(log.end_time).toLocaleString("id-ID", { 
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" 
                      })}
                    </td>
                    <td className="p-4 border-r border-hairline text-white font-bold">{log.player_name}</td>
                    <td className="p-4 border-r border-hairline text-nvidia-green font-bold">{log.pc_name}</td>
                    <td className="p-4 border-r border-hairline text-white/70 text-xs">{log.paket_name}</td>
                    <td className="p-4 border-r border-hairline font-bold text-white">Rp {log.price.toLocaleString("id-ID")}</td>
                    <td className="p-4 border-r border-hairline">
                      {log.status === "Selesai" ? (
                        <div className="flex items-center gap-1.5 text-nvidia-green text-[10px] uppercase font-bold">
                          <CheckCircle weight="fill" size={14} /> Selesai
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-error text-[10px] uppercase font-bold">
                          <WarningCircle weight="fill" size={14} /> Batal
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-white/40 text-xs line-clamp-3 leading-relaxed min-w-[150px] max-w-[250px]">
                      {log.reason || "-"}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-white/30 text-xs uppercase font-bold">
                      TIDAK ADA DATA UNTUK FILTER INI
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
