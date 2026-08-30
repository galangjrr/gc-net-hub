"use client";

import { motion } from "motion/react";
import { Monitor, Cpu, HardDrive, Gamepad2 } from "lucide-react";

import { useState, useEffect } from "react";
import type { DatabaseSchema } from "@/lib/db";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function SpecsPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(setDb);
  }, []);

  if (!db) return <div className="min-h-screen bg-surface-dark flex items-center justify-center tracking-tight text-white/50">LOADING SYSTEM SPECS...</div>;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12 md:py-20">
      <div className="mb-10">
        <h1 className="text-2xl font-medium tracking-tight mb-1">Spesifikasi PC & Game</h1>
        <p className="text-sm text-zinc-500">Detail hardware dan daftar game yang terinstall di setiap unit.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {db.pcs.map((pc, i) => {
          const s = pc.specs || { cpu: "-", gpu: "-", monitor: "-", keyboard: "-", mouse: "-", headset: "-", games: [] };
          return (
            <motion.div
            key={pc.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.04, ease: EASE }}
            className="glass-panel rounded-2xl p-6 hover:border-white/[0.12] transition-colors"
          >
            {/* PC Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Monitor size={20} className="text-cyan-400" />
              </div>
              <div>
                <div className="tracking-tight text-sm font-medium">{pc.name}</div>
                <div className="text-[11px] text-zinc-600">{s.monitor}</div>
              </div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-start gap-2">
                <Cpu size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider">CPU</div>
                  <div className="text-xs tracking-tight font-medium">{s.cpu}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Monitor size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider">GPU</div>
                  <div className="text-xs tracking-tight font-medium">{s.gpu}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 col-span-2">
                <Cpu size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Mainboard</div>
                  <div className="text-xs tracking-tight font-medium">{s.mainboard || "-"}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Cpu size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider">RAM</div>
                  <div className="text-xs tracking-tight font-medium">{s.ram || "-"}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <HardDrive size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Storage</div>
                  <div className="text-xs tracking-tight font-medium">{s.storage || "-"}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Gamepad2 size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Keyboard</div>
                  <div className="text-xs tracking-tight font-medium">{s.keyboard || "-"}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Gamepad2 size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Mouse</div>
                  <div className="text-xs tracking-tight font-medium">{s.mouse || "-"}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2 col-span-2">
                <Gamepad2 size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Headset</div>
                  <div className="text-xs tracking-tight font-medium">{s.headset || "-"}</div>
                </div>
              </div>
            </div>

            {/* Games Tags */}
            <div className="mt-4 pt-4 border-t border-white/[0.05]">
              <div className="flex items-center gap-1.5 mb-2">
                <Gamepad2 size={14} className="text-cyan-500" />
                <span className="text-[10px] text-zinc-500 tracking-tight">INSTALLED GAMES</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(s.games || []).map(game => (
                  <span
                    key={game}
                    className="text-[11px] text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md"
                  >
                    {game}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )})}
      </div>
    </div>
  );
}
