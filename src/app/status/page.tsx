"use client";

import { motion } from "motion/react";
import { Monitor, Circle, Timer, User } from "lucide-react";

/* ── Mock Data — 10 PC with mixed status ── */
const MOCK_PCS = Array.from({ length: 10 }, (_, i) => {
  const occupied = [0, 2, 5, 7, 9].includes(i);
  return {
    id: i + 1,
    name: `PC ${String(i + 1).padStart(2, "0")}`,
    status: occupied ? "occupied" : "available",
    player: occupied ? ["Raffi", "Budi", "Sari", "Dian", "Eka"][Math.floor(i / 2)] : null,
    paket: occupied ? ["Sultan 5 Jam", "Begadang 10 Jam", "Personal 3 Jam", "Sultan 5 Jam", "Begadang 10 Jam"][Math.floor(i / 2)] : null,
    time_left: occupied ? `${(i % 3) + 1}:${String((i * 15) % 60).padStart(2, "0")}:00` : null,
    started_at: occupied ? `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:30` : null,
  };
});

const EASE = [0.16, 1, 0.3, 1] as const;

export default function StatusPage() {
  const availableCount = MOCK_PCS.filter((p) => p.status === "available").length;
  const occupiedCount = MOCK_PCS.filter((p) => p.status === "occupied").length;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12 md:py-20">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-medium tracking-tight mb-1">Status Lengkap</h1>
        <p className="text-sm text-zinc-500">Data realtime semua PC di warnet.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="glass-panel rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-2">Total PC</div>
          <div className="text-2xl font-semibold tracking-tight">{MOCK_PCS.length}</div>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
            <Circle size={8} className="fill-cyan-500 text-cyan-500" /> Tersedia
          </div>
          <div className="text-2xl font-semibold tracking-tight text-cyan-400">{availableCount}</div>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
            <Circle size={8} className="fill-amber-500 text-amber-500" /> Dipakai
          </div>
          <div className="text-2xl font-semibold tracking-tight text-amber-400">{occupiedCount}</div>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="glass-panel rounded-2xl overflow-hidden"
      >
        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
                <th className="px-5 py-4 font-medium">PC</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Player</th>
                <th className="px-5 py-4 font-medium">Paket</th>
                <th className="px-5 py-4 font-medium">Mulai</th>
                <th className="px-5 py-4 font-medium">Sisa Waktu</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PCS.map((pc, i) => (
                <motion.tr
                  key={pc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <Monitor size={16} className="text-zinc-600" />
                      <span className="tracking-tight text-sm">{pc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {pc.status === "available" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg">
                        <Circle size={6} className="fill-cyan-400 text-cyan-400" /> Tersedia
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                        <Circle size={6} className="fill-amber-400 text-amber-400" /> Dipakai
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {pc.player ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <User size={14} className="text-zinc-600" />
                        {pc.player}
                      </div>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-400">{pc.paket || <span className="text-zinc-700">—</span>}</td>
                  <td className="px-5 py-4 text-sm tracking-tight text-zinc-400">{pc.started_at || <span className="text-zinc-700">—</span>}</td>
                  <td className="px-5 py-4">
                    {pc.time_left ? (
                      <div className="flex items-center gap-1.5 text-sm tracking-tight text-amber-400">
                        <Timer size={14} />
                        {pc.time_left}
                      </div>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-white/[0.04]">
          {MOCK_PCS.map((pc) => (
            <div key={pc.id} className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor size={20} className={pc.status === "available" ? "text-cyan-500" : "text-zinc-600"} />
                <div>
                  <div className="tracking-tight text-sm">{pc.name}</div>
                  {pc.player && <div className="text-xs text-zinc-500">{pc.player}</div>}
                </div>
              </div>
              <div className="text-right">
                {pc.status === "available" ? (
                  <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg">Tersedia</span>
                ) : (
                  <div>
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">{pc.time_left}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
