"use client";

import { useState, useEffect } from "react";
import { Plus, PencilSimple, Trash, WarningCircle, Desktop, Cpu, HardDrives } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import type { DatabaseSchema, PC } from "@/lib/db";

export default function DataPC() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [form, setForm] = useState<PC & { remainingMinutes?: string }>({
    id: "",
    name: "",
    expected_empty_time: "",
    specs: { cpu: "", gpu: "", ram: "", storage: "", monitor: "", keyboard: "", mouse: "", headset: "", koneksi: "", games: [] }
  });

  const loadData = async () => {
    try {
      const res = await fetch("/api/data");
      const data = await res.json();
      setDb(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (!db) return;
    if (!form.id.trim()) return alert("ID PC harus diisi!");

    const newDb = { ...db };
    const p = { ...form };
    // Preserve expected_empty_time if we are editing
    if (editMode && db) {
      const existing = db.pcs.find(pc => pc.id === form.id);
      if (existing) {
        p.expected_empty_time = existing.expected_empty_time;
      }
    }
    
    // @ts-ignore
    delete p.remainingMinutes;
    
    if (editMode) {
      const idx = newDb.pcs.findIndex(pc => pc.id === form.id);
      if (idx !== -1) {
        newDb.pcs[idx] = p as PC;
      }
    } else {
      if (newDb.pcs.find(pc => pc.id === form.id)) return alert("ID PC sudah ada!");
      newDb.pcs.push(p as PC);
    }

    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDb)
      });
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data PC");
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    if (!confirm(`Hapus PC ${id}?`)) return;

    const newDb = { ...db, pcs: db.pcs.filter(p => p.id !== id) };
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDb)
      });
      loadData();
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus PC");
    }
  };

  const openAdd = () => {
    setForm({
      id: "",
      name: "",
      expected_empty_time: "",
      specs: { cpu: "", gpu: "", ram: "", storage: "", monitor: "", keyboard: "", mouse: "", headset: "", koneksi: "", games: [] }
    });
    setEditMode(false);
    setShowModal(true);
  };

  const openEdit = (pc: PC) => {
    setForm({ ...pc, remainingMinutes: "" });
    setEditMode(true);
    setShowModal(true);
  };

  if (loading) return <div className="p-8 text-white tracking-tight animate-pulse">MEMUAT DATA PC...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pt-4 md:pt-8 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-nvidia-green uppercase tracking-widest flex items-center gap-3">
            <Desktop size={28} />
            Data PC & Spek
          </h1>
          <p className="text-sm text-white/50 tracking-tight mt-1">Manajemen unit PC, status, dan spesifikasi hardware.</p>
        </div>
        <button 
          onClick={openAdd}
          className="nvidia-button text-xs gap-2 shrink-0 w-full md:w-auto"
        >
          <Plus size={16} weight="bold" />
          TAMBAH PC
        </button>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block border border-hairline bg-surface-dark overflow-x-auto relative z-10">
        <table className="w-full text-left tracking-tight text-sm whitespace-nowrap">
          <thead className="bg-surface text-white/50 border-b border-hairline">
            <tr>
              <th className="p-4 font-normal">ID PC</th>
              <th className="p-4 font-normal">NAMA PC</th>
              <th className="p-4 font-normal">CPU</th>
              <th className="p-4 font-normal">GPU</th>
              <th className="p-4 font-normal">RAM</th>
              <th className="p-4 font-normal">STORAGE</th>
              <th className="p-4 font-normal">MONITOR</th>
              <th className="p-4 font-normal">KONEKSI</th>
              <th className="p-4 font-normal text-right">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {db?.pcs.map(pc => (
              <tr key={pc.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4 font-bold text-white">{pc.id}</td>
                <td className="p-4 font-bold text-white">{pc.name || "-"}</td>
                <td className="p-4 text-white/70">{pc.specs?.cpu || "-"}</td>
                <td className="p-4 text-white/70">{pc.specs?.gpu || "-"}</td>
                <td className="p-4 text-white/70">{pc.specs?.ram || "-"}</td>
                <td className="p-4 text-white/70">{pc.specs?.storage || "-"}</td>
                <td className="p-4 text-white/70">{pc.specs?.monitor || "-"}</td>
                <td className="p-4 text-white/70">{pc.specs?.koneksi || "-"}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEdit(pc)}
                      className="p-2 hover:bg-nvidia-green hover:text-black rounded-[2px] transition-colors text-nvidia-green"
                    >
                      <PencilSimple size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(pc.id)}
                      className="p-2 hover:bg-error hover:text-white rounded-[2px] transition-colors text-error"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(!db?.pcs || db.pcs.length === 0) && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-white/30 italic">
                  Belum ada data PC
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden flex flex-col gap-4 relative z-10">
        {db?.pcs.map(pc => (
          <div key={pc.id} className="bg-surface-dark border border-hairline p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-nvidia-green">{pc.name || "-"}</h3>
                <span className="text-white/50 text-[10px] uppercase">ID: {pc.id}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => openEdit(pc)}
                  className="p-2 bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/30 rounded-[2px]"
                >
                  <PencilSimple size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(pc.id)}
                  className="p-2 border border-error/50 text-error rounded-[2px]"
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex flex-col bg-black/40 p-2 rounded-[2px]">
                <span className="text-[9px] text-white/40 uppercase">CPU</span>
                <span className="text-white/80 text-xs truncate">{pc.specs?.cpu || "-"}</span>
              </div>
              <div className="flex flex-col bg-black/40 p-2 rounded-[2px]">
                <span className="text-[9px] text-white/40 uppercase">GPU</span>
                <span className="text-white/80 text-xs truncate">{pc.specs?.gpu || "-"}</span>
              </div>
              <div className="flex flex-col bg-black/40 p-2 rounded-[2px]">
                <span className="text-[9px] text-white/40 uppercase">RAM</span>
                <span className="text-white/80 text-xs truncate">{pc.specs?.ram || "-"}</span>
              </div>
              <div className="flex flex-col bg-black/40 p-2 rounded-[2px]">
                <span className="text-[9px] text-white/40 uppercase">Monitor</span>
                <span className="text-white/80 text-xs truncate">{pc.specs?.monitor || "-"}</span>
              </div>
            </div>
          </div>
        ))}
        {(!db?.pcs || db.pcs.length === 0) && (
          <div className="p-8 text-center text-white/30 italic bg-surface-dark border border-hairline">
            Belum ada data PC
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-hairline p-6 w-full max-w-lg relative"
            >
              <h2 className="text-xl font-bold tracking-tight text-white mb-6 uppercase">
                {editMode ? "Edit PC" : "Tambah PC Baru"}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 tracking-tight">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase">ID PC (Unik)</label>
                  <input 
                    type="text" 
                    value={form.id} 
                    onChange={e => setForm({...form, id: e.target.value})}
                    disabled={editMode}
                    placeholder="e.g. PC-01"
                    className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white focus:border-nvidia-green outline-none disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase">Nama PC</label>
                  <input 
                    type="text" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="e.g. PC-Lyra"
                    className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white focus:border-nvidia-green outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase">Prosesor (CPU)</label>
                  <input 
                    type="text" 
                    value={form.specs?.cpu || ""} 
                    onChange={e => setForm({...form, specs: {...form.specs!, cpu: e.target.value}})}
                    placeholder="e.g. Ryzen 5 5600X"
                    className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white focus:border-nvidia-green outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase">Grafik (GPU)</label>
                  <input 
                    type="text" 
                    value={form.specs?.gpu || ""} 
                    onChange={e => setForm({...form, specs: {...form.specs!, gpu: e.target.value}})}
                    placeholder="e.g. RTX 3060 12GB"
                    className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white focus:border-nvidia-green outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase">RAM</label>
                  <input 
                    type="text" 
                    value={form.specs?.ram || ""} 
                    onChange={e => setForm({...form, specs: {...form.specs!, ram: e.target.value}})}
                    placeholder="e.g. 16GB DDR4 3200MHz"
                    className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white focus:border-nvidia-green outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase">Monitor</label>
                  <input 
                    type="text" 
                    value={form.specs?.monitor || ""} 
                    onChange={e => setForm({...form, specs: {...form.specs!, monitor: e.target.value}})}
                    placeholder="e.g. 24 inch 144Hz"
                    className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white focus:border-nvidia-green outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase">Storage</label>
                  <input 
                    type="text" 
                    value={form.specs?.storage || ""} 
                    onChange={e => setForm({...form, specs: {...form.specs!, storage: e.target.value}})}
                    placeholder="e.g. 1TB NVMe"
                    className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white focus:border-nvidia-green outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase">Koneksi</label>
                  <input 
                    type="text" 
                    value={form.specs?.koneksi || ""} 
                    onChange={e => setForm({...form, specs: {...form.specs!, koneksi: e.target.value}})}
                    placeholder="e.g. 30 MBPS Fiber Optic"
                    className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white focus:border-nvidia-green outline-none"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] text-white/50 uppercase">Games (Pisahkan dengan koma)</label>
                  <input 
                    type="text" 
                    value={form.specs?.games?.join(", ") || ""} 
                    onChange={e => {
                      const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                      setForm({...form, specs: {...form.specs!, games: arr}});
                    }}
                    placeholder="e.g. Valorant, Dota 2, CS2"
                    className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white focus:border-nvidia-green outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 tracking-tight">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-hairline text-white/50 hover:text-white hover:border-white/50 transition-colors text-sm rounded-[2px]"
                >
                  BATAL
                </button>
                <button 
                  onClick={handleSave}
                  className="nvidia-button text-sm"
                >
                  SIMPAN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
