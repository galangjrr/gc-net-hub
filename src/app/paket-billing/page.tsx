"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, Pencil, Trash2, Sliders, X, Check, 
  Clock, Sparkles, Zap, Search, Calendar, ChevronDown, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { DatabaseSchema, Paket } from "@/lib/db";

const ALL_DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function PaketBillingPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'jam' | 'spesial' | 'hemat'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State Tambah Paket
  const [newCategory, setNewCategory] = useState<'jam' | 'spesial' | 'hemat'>('jam');
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDuration, setNewDuration] = useState("60");
  const [newStartTime, setNewStartTime] = useState("22:00");
  const [newEndTime, setNewEndTime] = useState("04:00");
  const [newDays, setNewDays] = useState<string[]>(ALL_DAYS);

  // Edit State
  const [editingPaket, setEditingPaket] = useState<Paket | null>(null);
  const [editCategory, setEditCategory] = useState<'jam' | 'spesial' | 'hemat'>('jam');
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editDays, setEditDays] = useState<string[]>(ALL_DAYS);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      const data = await res.json();
      setDb(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPaketType = (p: Paket): 'jam' | 'spesial' | 'hemat' => {
    if (p.fixed_start_time) return 'spesial';
    if (p.duration_minutes && p.duration_minutes % 60 === 0 && !p.name.toLowerCase().startsWith("paket ")) {
      return 'jam';
    }
    if (p.name.endsWith(" Jam")) return 'jam';
    return 'hemat';
  };

  const formatDurationText = (mins?: number) => {
    if (!mins) return "-";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} Jam ${m} Menit`;
    if (h > 0) return `${h} Jam`;
    return `${m} Menit`;
  };

  // Filter Data
  const paketsWithMeta = useMemo(() => {
    if (!db?.pakets) return [];
    return db.pakets.map(p => ({
      ...p,
      type: getPaketType(p),
    }));
  }, [db?.pakets]);

  const filteredPakets = useMemo(() => {
    return paketsWithMeta.filter(p => {
      // Tab filter
      if (activeTab !== 'all' && p.type !== activeTab) return false;
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchPrice = p.price.toString().includes(q);
        const matchTime = p.fixed_start_time ? `${p.fixed_start_time}-${p.fixed_end_time}`.includes(q) : false;
        return matchName || matchPrice || matchTime;
      }
      return true;
    });
  }, [paketsWithMeta, activeTab, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const jam = paketsWithMeta.filter(p => p.type === 'jam').length;
    const spesial = paketsWithMeta.filter(p => p.type === 'spesial').length;
    const hemat = paketsWithMeta.filter(p => p.type === 'hemat').length;
    return { all: paketsWithMeta.length, jam, spesial, hemat };
  }, [paketsWithMeta]);

  const getPaketDesc = (p: Paket) => {
    if (p.fixed_start_time) {
      if (p.name.toLowerCase().includes("malam")) return "Server sepi ping adem, begadang bareng kawan sampai subuh.";
      if (p.name.toLowerCase().includes("pagi") || p.name.toLowerCase().includes("subuh")) return "Udara pagi sejuk, warnet tenang buat fokus grinding.";
      return "Sesi spesial dengan jadwal main tetap.";
    }
    if (p.name.endsWith(" Jam")) {
      const h = Math.round((p.duration_minutes || 60) / 60);
      if (h === 1) return "Pemanasan santai sambil cek update game atau browsing.";
      if (h === 2) return "Waktu paling pas buat dua match ranked tanpa buru-buru.";
      if (h === 3) return "Pilihan utama anak tongkrongan, mabar squad sampai puas.";
      if (h === 4) return "Cocok buat grinding battle pass pas lagi libur santai.";
      if (h === 5) return "Lima jam marathon tanpa pusing mikirin sisa billing.";
      if (h >= 6) return "Sesi panjang seharian, harga per jam jauh lebih miring.";
      return "Paket jam reguler standar warnet.";
    }
    if (p.price === 3000) return "Nanggung mau pulang, habisin rokok sebatang atau cetak tugas.";
    if (p.price === 5000) return "Modal goceng dapet sejam lebih, pas buat nunggu maghrib.";
    if (p.price === 6000) return "Satu setengah jam pas buat kelarin daily quest bareng kawan.";
    if (p.price === 7000) return "Main leluasa tanpa takut kepotong di tengah match seru.";
    if (p.price === 9000) return "Dua jam lebih sedikit, cukup buat push rank sampai naik bintang.";
    if (p.price === 10000) return "Uang pas ceban dapet dua setengah jam, auto balik modal.";
    if (p.price === 15000) return "Duduk anteng dari sore ke malem, puas no debat.";
    return "Paket pecahan fleksibel, pas di kantong anak warnet.";
  };

  const groupedPakets = useMemo(() => {
    const jam = filteredPakets.filter(p => p.type === 'jam');
    const spesial = filteredPakets.filter(p => p.type === 'spesial');
    const hemat = filteredPakets.filter(p => p.type === 'hemat');

    const groups: {
      id: 'jam' | 'spesial' | 'hemat';
      title: string;
      description: string;
      badge: string;
      badgeColor: string;
      icon: typeof Clock;
      items: typeof filteredPakets;
    }[] = [];

    if (activeTab === 'all' || activeTab === 'jam') {
      if (jam.length > 0 || activeTab === 'jam') {
        groups.push({
          id: 'jam',
          title: 'Paket Jam Reguler',
          description: 'Paket billing berbasis durasi per jam (1 Jam, 2 Jam, 3 Jam, dst)',
          badge: `${jam.length} Paket`,
          badgeColor: 'bg-nvidia-green/10 text-nvidia-green border-nvidia-green/30',
          icon: Clock,
          items: jam,
        });
      }
    }

    if (activeTab === 'all' || activeTab === 'spesial') {
      if (spesial.length > 0 || activeTab === 'spesial') {
        groups.push({
          id: 'spesial',
          title: 'Paket Spesial & Malam',
          description: 'Paket sesi tertentu dengan jadwal main tetap (Paket Malam, Subuh, Ramadan)',
          badge: `${spesial.length} Paket`,
          badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
          icon: Sparkles,
          items: spesial,
        });
      }
    }

    if (activeTab === 'all' || activeTab === 'hemat') {
      if (hemat.length > 0 || activeTab === 'hemat') {
        groups.push({
          id: 'hemat',
          title: 'Paket Hemat Fleksibel (Nominal Tongkrongan)',
          description: 'Pecahan rupiah dengan durasi proporsional (Paket Goceng, Ceban, Kilat, dst)',
          badge: `${hemat.length} Paket`,
          badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
          icon: Zap,
          items: hemat,
        });
      }
    }

    return groups;
  }, [filteredPakets, activeTab]);

  // Tambah Paket
  const handleAddPaket = async () => {
    if (!newName.trim() || !newPrice) {
      return alert("Nama paket dan harga wajib diisi");
    }
    setIsSubmitting(true);
    try {
      const payload: any = {
        name: newName.trim(),
        price: Number(newPrice),
        is_custom: false,
      };

      if (newCategory === 'spesial') {
        payload.fixed_start_time = newStartTime;
        payload.fixed_end_time = newEndTime;
        payload.days = newDays;
        payload.duration_minutes = null;
      } else {
        payload.duration_minutes = Number(newDuration) || (newCategory === 'jam' ? 60 : 45);
        payload.fixed_start_time = null;
        payload.fixed_end_time = null;
        payload.days = null;
      }

      const res = await fetch("/api/pakets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Gagal menambah paket");
      }

      setNewName("");
      setNewPrice("");
      setNewDuration("60");
      setShowAddForm(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Gagal menambah paket");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buka Edit
  const handleOpenEdit = (p: Paket) => {
    const type = getPaketType(p);
    setEditingPaket(p);
    setEditCategory(type);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setEditDuration(p.duration_minutes ? String(p.duration_minutes) : "60");
    setEditStartTime(p.fixed_start_time || "22:00");
    setEditEndTime(p.fixed_end_time || "04:00");
    setEditDays(p.days && p.days.length > 0 ? p.days : ALL_DAYS);
  };

  // Simpan Edit
  const handleSaveEdit = async () => {
    if (!editingPaket) return;
    if (!editName.trim() || !editPrice) {
      return alert("Nama paket dan harga tidak boleh kosong");
    }
    setIsSubmitting(true);
    try {
      const payload: any = {
        id: editingPaket.id,
        name: editName.trim(),
        price: Number(editPrice),
      };

      if (editCategory === 'spesial') {
        payload.fixed_start_time = editStartTime;
        payload.fixed_end_time = editEndTime;
        payload.days = editDays;
        payload.duration_minutes = null;
      } else {
        payload.duration_minutes = Number(editDuration) || 60;
        payload.fixed_start_time = null;
        payload.fixed_end_time = null;
        payload.days = null;
      }

      const res = await fetch("/api/pakets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Gagal update paket");
      }

      setEditingPaket(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Gagal update paket");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hapus Paket
  const deletePaket = async (id: string, name: string) => {
    if (!confirm(`Yakin hapus paket "${name}"?`)) return;
    try {
      const res = await fetch("/api/pakets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Gagal menghapus paket");
      }
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Gagal menghapus paket");
    }
  };

  const toggleDay = (day: string, currentDays: string[], setFn: (d: string[]) => void) => {
    if (currentDays.includes(day)) {
      if (currentDays.length === 1) return; // minimal 1 hari
      setFn(currentDays.filter(d => d !== day));
    } else {
      setFn([...currentDays, day]);
    }
  };

  if (loading || !db) {
    return (
      <div className="min-h-screen bg-surface-dark p-8 tracking-tight text-white/50 uppercase text-xs xl:text-sm animate-pulse flex items-center justify-center">
        Memuat Master Data Paket...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark p-4 md:p-8 pt-16 md:pt-8 text-white space-y-6 pb-32">
      <div className="max-w-[1400px] 2xl:max-w-[1720px] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-4 xl:pb-6">
          <div className="flex items-center gap-3 xl:gap-4">
            <div className="p-3 bg-nvidia-green/10 border border-nvidia-green/30 rounded-xl text-nvidia-green shrink-0">
              <Sliders size={30} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                Master Data Paket dan Tarif
              </h1>
              <p className="text-xs xl:text-sm text-zinc-400 tracking-tight mt-1">
                Kelola paket jam reguler, paket malam dan spesial, serta paket hemat fleksibel
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowAddForm(prev => !prev)}
              className="nvidia-button flex items-center gap-2 rounded-xl text-xs xl:text-sm px-4 py-2.5 shadow-[0_0_20px_rgba(118,185,0,0.3)]"
            >
              <Plus size={16} />
              <span>{showAddForm ? "Tutup Form" : "Tambah Paket"}</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-surface border border-hairline flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Paket</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-white tabular-nums">{counts.all}</span>
              <span className="text-[10px] font-mono font-bold text-zinc-500">KATALOG</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface border border-hairline flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-nvidia-green">
              <Clock size={13} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-nvidia-green">Jam Reguler</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-white tabular-nums">{counts.jam}</span>
              <span className="text-[10px] font-mono font-bold text-nvidia-green/70">1-10 JAM</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface border border-hairline flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-purple-400">
              <Sparkles size={13} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Spesial & Malam</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-white tabular-nums">{counts.spesial}</span>
              <span className="text-[10px] font-mono font-bold text-purple-400/70">JADWAL FIX</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface border border-hairline flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Zap size={13} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Hemat Fleksibel</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-white tabular-nums">{counts.hemat}</span>
              <span className="text-[10px] font-mono font-bold text-cyan-400/70">PECAHAN</span>
            </div>
          </div>
        </div>

        {/* Form Tambah Paket (Expandable) */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-surface border border-nvidia-green/40 rounded-2xl p-5 xl:p-6 shadow-2xl space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-hairline">
                <h3 className="text-sm xl:text-base uppercase tracking-wider font-bold text-white flex items-center gap-2">
                  <Plus size={18} className="text-nvidia-green" />
                  Tambah Paket Billing Baru
                </h3>
                <span className="text-[11px] text-zinc-400">Pilih kategori paket untuk menentukan tipe durasi</span>
              </div>

              {/* Tipe Kategori */}
              <div>
                <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1.5">
                  Kategori Paket
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewCategory('jam');
                      setNewDuration("60");
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold uppercase flex items-center justify-center gap-2 transition ${
                      newCategory === 'jam'
                        ? 'bg-nvidia-green text-black border-nvidia-green shadow-[0_0_12px_rgba(118,185,0,0.3)]'
                        : 'bg-surface-dark border-hairline text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Clock size={14} /> Jam Reguler
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCategory('spesial')}
                    className={`p-2.5 rounded-xl border text-xs font-bold uppercase flex items-center justify-center gap-2 transition ${
                      newCategory === 'spesial'
                        ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                        : 'bg-surface-dark border-hairline text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Sparkles size={14} /> Spesial & Malam
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCategory('hemat');
                      setNewDuration("45");
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold uppercase flex items-center justify-center gap-2 transition ${
                      newCategory === 'hemat'
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-surface-dark border-hairline text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Zap size={14} /> Hemat Fleksibel
                  </button>
                </div>
              </div>

              {/* Fields Input */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1">
                    Nama Paket
                  </label>
                  <input 
                    type="text" 
                    placeholder={
                      newCategory === 'jam' ? "Contoh: 3 Jam, 5 Jam Sultan" :
                      newCategory === 'spesial' ? "Contoh: Paket Malam Pro, Paket Pagi" :
                      "Contoh: Paket Kilat, Paket Santai, Paket Goceng"
                    }
                    className="w-full bg-surface-dark border border-hairline text-white p-3 rounded-xl text-xs xl:text-sm focus:border-nvidia-green outline-none"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1">
                    Tarif (Rp)
                  </label>
                  <input 
                    type="number" 
                    placeholder="Contoh: 12000" 
                    className="w-full bg-surface-dark border border-hairline text-white p-3 rounded-xl text-xs xl:text-sm focus:border-nvidia-green outline-none tabular-nums"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                  />
                </div>

                {newCategory !== 'spesial' ? (
                  <div>
                    <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1">
                      Durasi (Menit)
                    </label>
                    <div className="flex gap-1.5">
                      <input 
                        type="number" 
                        placeholder="Menit" 
                        className="w-full bg-surface-dark border border-hairline text-white p-3 rounded-xl text-xs xl:text-sm focus:border-nvidia-green outline-none tabular-nums"
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setNewDuration("60")}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white/5 hover:bg-white/10 border border-hairline shrink-0"
                      >
                        1 Jam
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewDuration("120")}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white/5 hover:bg-white/10 border border-hairline shrink-0"
                      >
                        2 Jam
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1">
                      Jadwal Jam (Mulai - Selesai)
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="time" 
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        className="bg-surface-dark border border-hairline text-white p-2.5 rounded-xl text-xs flex-1 focus:border-nvidia-green outline-none text-center"
                      />
                      <span className="text-zinc-500 font-bold">-</span>
                      <input 
                        type="time" 
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="bg-surface-dark border border-hairline text-white p-2.5 rounded-xl text-xs flex-1 focus:border-nvidia-green outline-none text-center"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Hari Berlaku (khusus spesial) */}
              {newCategory === 'spesial' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] uppercase font-bold text-zinc-400 block">
                      Hari Aktif Berlaku
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewDays(ALL_DAYS)}
                        className="text-[10px] text-purple-400 hover:underline font-bold"
                      >
                        Semua Hari
                      </button>
                      <span className="text-zinc-600">•</span>
                      <button
                        type="button"
                        onClick={() => setNewDays(["Sen", "Sel", "Rab", "Kam", "Jum"])}
                        className="text-[10px] text-purple-400 hover:underline font-bold"
                      >
                        Senin - Jumat
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_DAYS.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day, newDays, setNewDays)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                          newDays.includes(day)
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                            : 'bg-surface-dark text-zinc-500 border-hairline hover:text-zinc-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-hairline text-zinc-400 hover:text-white text-xs font-bold uppercase transition"
                >
                  Batal
                </button>
                <button 
                  disabled={isSubmitting} 
                  onClick={handleAddPaket} 
                  className="nvidia-button flex items-center gap-2 rounded-xl text-xs px-5 py-2.5"
                >
                  <Plus size={16} /> Simpan Paket Baru
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Filter & Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-hairline">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shrink-0 ${
                activeTab === 'all'
                  ? 'bg-white text-black shadow-sm font-black'
                  : 'bg-surface-dark text-zinc-400 hover:text-white border border-hairline'
              }`}
            >
              Semua ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab('jam')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'jam'
                  ? 'bg-nvidia-green text-black shadow-sm font-black'
                  : 'bg-surface-dark text-zinc-400 hover:text-white border border-hairline'
              }`}
            >
              <Clock size={13} />
              <span>Jam Reguler ({counts.jam})</span>
            </button>
            <button
              onClick={() => setActiveTab('spesial')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'spesial'
                  ? 'bg-purple-500 text-white shadow-sm font-black'
                  : 'bg-surface-dark text-zinc-400 hover:text-white border border-hairline'
              }`}
            >
              <Sparkles size={13} />
              <span>Spesial & Malam ({counts.spesial})</span>
            </button>
            <button
              onClick={() => setActiveTab('hemat')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'hemat'
                  ? 'bg-cyan-500 text-black shadow-sm font-black'
                  : 'bg-surface-dark text-zinc-400 hover:text-white border border-hairline'
              }`}
            >
              <Zap size={13} />
              <span>Hemat Fleksibel ({counts.hemat})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama paket atau harga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-dark border border-hairline pl-9 pr-3 py-1.5 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-nvidia-green outline-none"
            />
          </div>
        </div>

        {/* Render Paket Dikelompokkan per Kategori */}
        {groupedPakets.length > 0 ? (
          <div className="space-y-8">
            {groupedPakets.map((group) => {
              const IconComp = group.icon;
              return (
                <div key={group.id} className="space-y-3.5">
                  {/* Header Kelompok Paket */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${group.badgeColor}`}>
                        <IconComp size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm xl:text-base font-bold text-white uppercase tracking-wider">
                            {group.title}
                          </h3>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${group.badgeColor}`}>
                            {group.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {group.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tabel Paket Desktop untuk Grup Ini */}
                  <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-xl hidden md:block">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-surface-soft text-zinc-400 text-[11px] uppercase font-bold border-b border-hairline">
                          <tr>
                            <th className="px-5 py-3 font-bold">Nama Paket & Karakter</th>
                            <th className="px-5 py-3 font-bold">Durasi / Jadwal Main</th>
                            <th className="px-5 py-3 font-bold">Hari Berlaku</th>
                            <th className="px-5 py-3 font-bold">Tarif</th>
                            <th className="px-5 py-3 font-bold text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline bg-surface">
                          {group.items.map((p) => {
                            return (
                              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                {/* 1. Nama Paket & Deskripsi */}
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${group.badgeColor}`}>
                                      <IconComp size={15} />
                                    </div>
                                    <div className="min-w-0 max-w-[320px]">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm leading-tight truncate">
                                          {p.name}
                                        </span>
                                        {p.duration_minutes && p.type === 'hemat' && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 border border-hairline text-zinc-300 font-bold shrink-0">
                                            {formatDurationText(p.duration_minutes)}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-zinc-400 block mt-0.5 truncate group-hover:text-zinc-300 transition-colors">
                                        {getPaketDesc(p)}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* 2. Durasi / Waktu */}
                                <td className="px-5 py-3.5">
                                  {p.type === 'spesial' ? (
                                    <div className="flex items-center gap-1.5 text-xs text-purple-300 font-bold">
                                      <Clock size={12} className="text-purple-400" />
                                      <span>{p.fixed_start_time} - {p.fixed_end_time} WIB</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-medium">
                                      <Clock size={12} className="text-zinc-400" />
                                      <span>{formatDurationText(p.duration_minutes)}</span>
                                      {p.duration_minutes && (
                                        <span className="text-[10px] text-zinc-500 tabular-nums font-mono">
                                          ({p.duration_minutes} mnt)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* 3. Hari Berlaku */}
                                <td className="px-5 py-3.5">
                                  {p.type === 'spesial' && p.days && p.days.length > 0 ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {p.days.length === 7 ? (
                                        <span className="text-xs text-zinc-300 font-medium">Semua Hari</span>
                                      ) : (
                                        p.days.map(d => (
                                          <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 border border-hairline font-bold">
                                            {d}
                                          </span>
                                        ))
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-zinc-400 font-medium">Setiap Hari</span>
                                  )}
                                </td>

                                {/* 4. Tarif */}
                                <td className="px-5 py-3.5">
                                  <span className="text-nvidia-green font-black text-sm xl:text-base tabular-nums">
                                    Rp {p.price.toLocaleString("id-ID")}
                                  </span>
                                </td>

                                {/* 5. Aksi */}
                                <td className="px-5 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => handleOpenEdit(p)} 
                                      className="p-2 bg-surface-dark hover:bg-nvidia-green hover:text-black border border-hairline rounded-lg text-nvidia-green transition-colors"
                                      title="Edit Detail Paket"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button 
                                      onClick={() => deletePaket(p.id, p.name)} 
                                      className="p-2 bg-surface-dark hover:bg-red-500 hover:text-white border border-hairline rounded-lg text-red-400 transition-colors"
                                      title="Hapus Paket"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Card View untuk Grup Ini (< md) */}
                  <div className="space-y-2.5 md:hidden">
                    {group.items.map((p) => (
                      <div
                        key={p.id}
                        className="bg-surface border border-hairline p-3.5 rounded-2xl space-y-2.5 shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${group.badgeColor}`}>
                              <IconComp size={15} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-white text-sm truncate">{p.name}</h4>
                              <span className="text-[10px] text-zinc-400 block truncate">{getPaketDesc(p)}</span>
                            </div>
                          </div>
                          <span className="text-nvidia-green font-black text-sm tabular-nums shrink-0">
                            Rp {p.price.toLocaleString("id-ID")}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-hairline">
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block">Durasi / Waktu</span>
                            <span className="text-zinc-200 font-semibold">
                              {p.type === 'spesial' ? `${p.fixed_start_time}-${p.fixed_end_time}` : formatDurationText(p.duration_minutes)}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block">Hari</span>
                            <span className="text-zinc-300 font-medium">
                              {p.type === 'spesial' && p.days && p.days.length > 0 && p.days.length < 7
                                ? p.days.join(", ")
                                : "Setiap Hari"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
                          <button 
                            onClick={() => handleOpenEdit(p)} 
                            className="px-3 py-1.5 bg-surface-dark border border-hairline rounded-lg text-nvidia-green text-xs font-bold flex items-center gap-1.5"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button 
                            onClick={() => deletePaket(p.id, p.name)} 
                            className="px-3 py-1.5 bg-surface-dark border border-hairline rounded-lg text-red-400 text-xs font-bold flex items-center gap-1.5"
                          >
                            <Trash2 size={13} /> Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500 text-xs uppercase tracking-wider font-bold bg-surface border border-hairline rounded-2xl">
            Tidak ada paket yang sesuai dengan filter atau kata kunci
          </div>
        )}
      </div>

      {/* Edit Modal (Lengkap dengan Tipe, Jadwal & Hari) */}
      <AnimatePresence>
        {editingPaket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-hairline p-5 xl:p-7 w-full max-w-lg rounded-2xl shadow-2xl relative space-y-4 my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-hairline">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center text-nvidia-green">
                    <Pencil size={16} />
                  </div>
                  <div>
                    <h3 className="text-base xl:text-lg font-bold uppercase text-white">
                      Edit Detail Paket
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-400">{editingPaket.id}</span>
                  </div>
                </div>
                <button
                  onClick={() => setEditingPaket(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tipe Kategori */}
              <div>
                <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1.5">
                  Tipe Kategori
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCategory('jam')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition ${
                      editCategory === 'jam'
                        ? 'bg-nvidia-green text-black border-nvidia-green font-black'
                        : 'bg-surface-dark border-hairline text-zinc-400'
                    }`}
                  >
                    <Clock size={13} /> Reguler
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCategory('spesial')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition ${
                      editCategory === 'spesial'
                        ? 'bg-purple-500 text-white border-purple-400 font-black'
                        : 'bg-surface-dark border-hairline text-zinc-400'
                    }`}
                  >
                    <Sparkles size={13} /> Spesial
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCategory('hemat')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition ${
                      editCategory === 'hemat'
                        ? 'bg-cyan-500 text-black border-cyan-400 font-black'
                        : 'bg-surface-dark border-hairline text-zinc-400'
                    }`}
                  >
                    <Zap size={13} /> Hemat
                  </button>
                </div>
              </div>

              {/* Input Nama & Harga */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1">
                    Nama Paket
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-surface-dark border border-hairline p-2.5 text-xs text-white focus:border-nvidia-green outline-none rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1">
                    Tarif (Rp)
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-surface-dark border border-hairline p-2.5 text-xs text-white focus:border-nvidia-green outline-none rounded-xl tabular-nums"
                  />
                </div>
              </div>

              {/* Detail Durasi / Jadwal */}
              {editCategory !== 'spesial' ? (
                <div>
                  <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1">
                    Durasi Bermain (Menit)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      className="w-full bg-surface-dark border border-hairline p-2.5 text-xs text-white focus:border-nvidia-green outline-none rounded-xl tabular-nums"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditDuration("60")}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white/5 border border-hairline"
                      >
                        1 Jam
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditDuration("120")}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white/5 border border-hairline"
                      >
                        2 Jam
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1">
                      Jam Operasional (Mulai - Selesai)
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="time" 
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="bg-surface-dark border border-hairline text-white p-2.5 rounded-xl text-xs flex-1 text-center"
                      />
                      <span className="text-zinc-500 font-bold">-</span>
                      <input 
                        type="time" 
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="bg-surface-dark border border-hairline text-white p-2.5 rounded-xl text-xs flex-1 text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1.5">
                      Hari Aktif Berlaku
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_DAYS.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day, editDays, setEditDays)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                            editDays.includes(day)
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                              : 'bg-surface-dark text-zinc-500 border-hairline hover:text-zinc-300'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setEditingPaket(null)}
                  className="px-4 py-2 border border-hairline text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveEdit}
                  className="nvidia-button text-xs px-5 py-2 rounded-xl flex items-center gap-1.5"
                >
                  <Check size={15} /> Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
