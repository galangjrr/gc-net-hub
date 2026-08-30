"use client";

import { useState, useEffect } from "react";
import { 
  Monitor, Play, ArrowRightLeft, Lock, Unlock, RotateCw, Power, 
  Clock, CheckCircle2, RefreshCw, Smartphone, ChevronRight, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { DatabaseSchema, PC } from "@/lib/db";
import PinGuard from "@/components/PinGuard";

export default function CompanionPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [selectedPc, setSelectedPc] = useState<PC | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form State for Open Session
  const [selectedPaketId, setSelectedPaketId] = useState<string>("");
  const [customPlayerName, setCustomPlayerName] = useState<string>("");
  const [customMinutes, setCustomMinutes] = useState<number>(60);
  const [targetMovePcId, setTargetMovePcId] = useState<string>("");

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
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Set default package selection when pakets load
  useEffect(() => {
    if (db?.pakets && db.pakets.length > 0 && !selectedPaketId) {
      setSelectedPaketId(db.pakets[0].id);
    }
  }, [db?.pakets]);

  // Keep selected PC data fresh
  useEffect(() => {
    if (selectedPc && db?.pcs) {
      const updated = db.pcs.find((p) => p.id === selectedPc.id);
      if (updated) setSelectedPc(updated);
    }
  }, [db?.pcs]);

  const sendRemoteCommand = async (workstationId: string, command: string, payload: any = {}) => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/remote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workstation_id: workstationId,
          command,
          payload
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Perintah [${command}] berhasil dikirim ke ${workstationId}!`);
        await loadData();
      } else {
        setActionMessage(`Gagal: ${data.error || "Terjadi kesalahan"}`);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err?.message || "Gagal konek ke server"}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // 1. Action: Buka Billing (Start Session)
  const handleStartSession = async () => {
    if (!selectedPc) return;
    const paket = db?.pakets.find((p) => p.id === selectedPaketId);
    const durMin = paket?.duration_minutes || customMinutes || 60;
    const price = paket?.price || 4000;
    const pName = paket?.name || `${durMin} Menit`;
    const player = customPlayerName.trim() || `Pelanggan-${selectedPc.name}`;

    await sendRemoteCommand(selectedPc.id, "start_session", {
      username: player,
      player_name: player,
      durationMinutes: durMin,
      price,
      packageName: pName
    });

    setCustomPlayerName("");
    setSelectedPc(null);
  };

  // 2. Action: Tambah Jam (Extend / Stack Package)
  const handleAddTime = async (minutes: number, price: number, name: string) => {
    if (!selectedPc) return;
    await sendRemoteCommand(selectedPc.id, "add_time", {
      durationMinutes: minutes,
      price,
      packageName: name
    });
    setSelectedPc(null);
  };

  // 3. Action: Pindah PC (Move Station)
  const handleMovePc = async () => {
    if (!selectedPc || !targetMovePcId) return;
    await sendRemoteCommand(selectedPc.id, "move_station", {
      target_pc_id: targetMovePcId
    });
    setTargetMovePcId("");
    setSelectedPc(null);
  };

  const pcs = db?.pcs || [];
  const activePcsCount = pcs.filter((p: any) => p.status === "occupied" || (p.expected_empty_time && new Date(p.expected_empty_time).getTime() > Date.now())).length;
  const availablePcsCount = pcs.length - activePcsCount;

  return (
    <PinGuard>
      <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-24 select-none">
        
        {/* Top Floating App Bar */}
        <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Smartphone size={18} />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  GC-HUB COMPANION
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h1>
                <p className="text-[10px] text-zinc-400">Kasir Saku & Remote Billing Bilik</p>
              </div>
            </div>

            <button 
              onClick={loadData}
              className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-emerald-400" : ""} />
            </button>
          </div>

          {/* Quick Counter Pills */}
          <div className="max-w-md mx-auto grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5 text-center">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total PC</span>
              <div className="text-base font-bold text-white">{pcs.length}</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5 text-center">
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Aktif</span>
              <div className="text-base font-bold text-emerald-400">{activePcsCount}</div>
            </div>
            <div className="bg-zinc-800/40 border border-white/[0.06] rounded-xl px-3 py-1.5 text-center">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Tersedia</span>
              <div className="text-base font-bold text-zinc-300">{availablePcsCount}</div>
            </div>
          </div>
        </header>

        {/* Global Toast Alert */}
        <AnimatePresence>
          {actionMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-md mx-auto px-4 mt-3"
            >
              <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xl">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span>{actionMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area: Pure PC Cards Grid */}
        <main className="max-w-md mx-auto px-4 mt-4">
          <div className="grid grid-cols-2 gap-2.5">
            {pcs.map((pc: any) => {
              const now = Date.now();
              const hasTimer = pc.expected_empty_time && new Date(pc.expected_empty_time).getTime() > now;
              const isOccupied = pc.status === "occupied" || hasTimer;
              const isMaintenance = pc.status === "maintenance";

              let remainingMin = 0;
              if (hasTimer) {
                remainingMin = Math.max(0, Math.ceil((new Date(pc.expected_empty_time).getTime() - now) / 60000));
              }

              return (
                <motion.div
                  key={pc.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedPc(pc)}
                  className={`relative p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between min-h-[115px] ${
                    isOccupied
                      ? "bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : isMaintenance
                      ? "bg-amber-950/20 border-amber-500/40"
                      : "bg-zinc-900/50 border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  {/* Header: PC ID & Status Dot */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white tracking-tight">{pc.name}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      isOccupied 
                        ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" 
                        : isMaintenance 
                        ? "bg-amber-400" 
                        : "bg-zinc-600"
                    }`} />
                  </div>

                  {/* Middle: User or Status */}
                  <div className="my-1.5">
                    {isOccupied ? (
                      <div>
                        <div className="text-[11px] font-semibold text-emerald-300 truncate">
                          {pc.player_name || "Sedang Bermain"}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {pc.paket_name || "Paket Billing"}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-1">
                        <Unlock size={12} /> Bilik Kosong
                      </div>
                    )}
                  </div>

                  {/* Footer: Timer or Action Hint */}
                  <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[10px]">
                    {isOccupied ? (
                      <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                        <Clock size={11} /> {remainingMin}m tersisa
                      </div>
                    ) : (
                      <div className="text-zinc-500 flex items-center gap-0.5">
                        Tap untuk buka <ChevronRight size={12} />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </main>

        {/* BOTTOM SHEET DRAWER (PC ACTION MODAL) */}
        <AnimatePresence>
          {selectedPc && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPc(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              />

              {/* Bottom Sheet Modal */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#121215] border-t border-white/[0.12] rounded-t-3xl p-5 z-50 max-h-[85vh] overflow-y-auto"
              >
                {/* Drag Handle */}
                <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

                {/* PC Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                      <Monitor size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{selectedPc.name}</h3>
                      <p className="text-xs text-zinc-400">
                        {selectedPc.status === "occupied" ? "🟢 Sedang Aktif Main" : "⚪ Bilik Tersedia (Standby)"}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedPc(null)}
                    className="p-2 rounded-full bg-white/[0.04] text-zinc-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* SCENARIO A: PC KOSONG -> BUKA BILLING SEKARANG */}
                {selectedPc.status !== "occupied" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">
                        Pilih Paket Tarif
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(db?.pakets || []).map((pkt) => (
                          <button
                            key={pkt.id}
                            onClick={() => setSelectedPaketId(pkt.id)}
                            className={`p-3 rounded-xl border text-left transition ${
                              selectedPaketId === pkt.id
                                ? "bg-emerald-500/20 border-emerald-500 text-white"
                                : "bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="font-bold text-xs">{pkt.name}</div>
                            <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                              Rp {pkt.price.toLocaleString("id-ID")}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              {pkt.duration_minutes ? `${pkt.duration_minutes} Menit` : "Paket Malam"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">
                        Nama Pemain (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Galang / Budi"
                        value={customPlayerName}
                        onChange={(e) => setCustomPlayerName(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      onClick={handleStartSession}
                      disabled={loading}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 text-sm"
                    >
                      <Play size={16} className="fill-black" />
                      BUKA BILLING SEKARANG
                    </button>
                  </div>
                ) : (
                  /* SCENARIO B: PC AKTIF -> TAMBAH WAKTU, PINDAH PC, KONTROL */
                  <div className="space-y-4">
                    
                    {/* Quick Add Time */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">
                        Tambah Waktu Cepat (Stacking)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleAddTime(60, 4000, "Tambah 1 Jam")}
                          className="py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-center transition"
                        >
                          <div className="text-xs font-bold text-white">+1 Jam</div>
                          <div className="text-[10px] text-emerald-400">Rp 4.000</div>
                        </button>
                        <button
                          onClick={() => handleAddTime(120, 7000, "Tambah 2 Jam")}
                          className="py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-center transition"
                        >
                          <div className="text-xs font-bold text-white">+2 Jam</div>
                          <div className="text-[10px] text-emerald-400">Rp 7.000</div>
                        </button>
                        <button
                          onClick={() => handleAddTime(180, 10000, "Tambah 3 Jam")}
                          className="py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-center transition"
                        >
                          <div className="text-xs font-bold text-white">+3 Jam</div>
                          <div className="text-[10px] text-emerald-400">Rp 10.000</div>
                        </button>
                      </div>
                    </div>

                    {/* Move Station */}
                    <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <label className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                        <ArrowRightLeft size={13} className="text-cyan-400" /> Pindahkan Pemain ke PC Lain
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={targetMovePcId}
                          onChange={(e) => setTargetMovePcId(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="">-- Pilih PC Tujuan --</option>
                          {pcs.filter((p: any) => p.id !== selectedPc.id && p.status !== "occupied").map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Tersedia)
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleMovePc}
                          disabled={!targetMovePcId || loading}
                          className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-lg transition disabled:opacity-50"
                        >
                          Pindah
                        </button>
                      </div>
                    </div>

                    {/* Remote Power & Lock Controls */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">
                        Kontrol Cepat PC
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => sendRemoteCommand(selectedPc.id, "lock")}
                          className="py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Lock size={14} /> Kunci Sementara (AFK)
                        </button>
                        <button
                          onClick={() => sendRemoteCommand(selectedPc.id, "unlock")}
                          className="py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Unlock size={14} /> Buka Kunci
                        </button>
                        <button
                          onClick={() => sendRemoteCommand(selectedPc.id, "restart")}
                          className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/[0.08] rounded-xl text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <RotateCw size={14} /> Restart PC
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Yakin ingin menghentikan billing ${selectedPc.name} sekarang?`)) {
                              sendRemoteCommand(selectedPc.id, "stop_session");
                              setSelectedPc(null);
                            }
                          }}
                          className="py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Power size={14} /> Hentikan Sesi
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </PinGuard>
  );
}
