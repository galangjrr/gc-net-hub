"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, Monitor, Cpu, HardDrive, Search, X, Check, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { DatabaseSchema, PC, PCSpecs } from "@/lib/db";

export default function DataPC() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State for Add & Edit
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Modal State for Confirm Delete
  const [deletingPc, setDeletingPc] = useState<PC | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const initialFormState: PC = {
    id: "",
    name: "",
    specs: {
      cpu: "",
      gpu: "",
      mainboard: "",
      ram: "",
      storage: "",
      monitor: "",
      keyboard: "",
      mouse: "",
      headset: "",
      koneksi: "",
      games: []
    }
  };
  const [form, setForm] = useState<PC>(initialFormState);

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

  // Keyboard shortcut listener for delete modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!deletingPc) return;
      if (e.key === "Escape") {
        setDeletingPc(null);
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirmDelete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deletingPc]);

  const openAdd = () => {
    setForm(initialFormState);
    setErrorMessage("");
    setEditMode(false);
    setShowModal(true);
  };

  const openEdit = (pc: PC) => {
    setForm({
      id: pc.id,
      name: pc.name || "",
      specs: {
        cpu: pc.specs?.cpu || "",
        gpu: pc.specs?.gpu || "",
        mainboard: pc.specs?.mainboard || "",
        ram: pc.specs?.ram || "",
        storage: pc.specs?.storage || "",
        monitor: pc.specs?.monitor || "",
        keyboard: pc.specs?.keyboard || "",
        mouse: pc.specs?.mouse || "",
        headset: pc.specs?.headset || "",
        koneksi: pc.specs?.koneksi || "",
        games: pc.specs?.games || []
      }
    });
    setErrorMessage("");
    setEditMode(true);
    setShowModal(true);
  };

  const handleSave = async () => {
    const cleanId = form.id.trim().toLowerCase();
    const cleanName = form.name.trim();

    if (!cleanId) {
      setErrorMessage("ID PC wajib diisi");
      return;
    }
    if (!cleanName) {
      setErrorMessage("Nama PC wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const payload: PC = {
      ...form,
      id: cleanId,
      name: cleanName
    };

    try {
      const method = editMode ? "PUT" : "POST";
      const res = await fetch("/api/pcs", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Gagal menyimpan data unit PC");
      }

      // Optimistic update
      setDb(prev => {
        if (!prev) return prev;
        const exists = prev.pcs.some(p => p.id === cleanId);
        let updatedPcs: PC[];
        if (exists) {
          updatedPcs = prev.pcs.map(p => (p.id === cleanId ? { ...p, ...payload } : p));
        } else {
          updatedPcs = [...prev.pcs, payload];
        }
        return { ...prev, pcs: updatedPcs };
      });

      setShowModal(false);
      loadData();
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Terjadi kesalahan saat menyimpan data unit PC");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDelete = (pc: PC) => {
    setDeletingPc(pc);
  };

  const confirmDelete = async () => {
    if (!deletingPc) return;
    const targetId = deletingPc.id;
    setIsDeleting(true);

    // Optimistic UI delete
    setDb(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        pcs: prev.pcs.filter(p => p.id !== targetId)
      };
    });

    try {
      const res = await fetch("/api/pcs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Gagal menghapus unit PC");
      }
      setDeletingPc(null);
      loadData();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Gagal menghapus unit PC dari server");
      loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPcs = useMemo(() => {
    const list = db?.pcs || [];
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(pc =>
      pc.name.toLowerCase().includes(q) ||
      pc.id.toLowerCase().includes(q) ||
      (pc.specs?.cpu || "").toLowerCase().includes(q) ||
      (pc.specs?.gpu || "").toLowerCase().includes(q) ||
      (pc.specs?.ram || "").toLowerCase().includes(q) ||
      (pc.specs?.storage || "").toLowerCase().includes(q) ||
      (pc.specs?.monitor || "").toLowerCase().includes(q) ||
      (pc.specs?.keyboard || "").toLowerCase().includes(q) ||
      (pc.specs?.mouse || "").toLowerCase().includes(q) ||
      (pc.specs?.headset || "").toLowerCase().includes(q)
    );
  }, [db?.pcs, searchQuery]);

  const totalCount = db?.pcs?.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-dark p-8 tracking-tight text-white/50 uppercase text-xs xl:text-sm animate-pulse flex items-center justify-center">
        Memuat Data PC dan Spesifikasi Hardware...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark p-4 md:p-8 xl:p-10 pt-16 md:pt-8 text-white space-y-6 pb-32">
      <div className="w-full max-w-[1680px] 2xl:max-w-[2200px] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-4 xl:pb-6">
          <div className="flex items-center gap-3 xl:gap-4">
            <div className="p-3 bg-nvidia-green/10 border border-nvidia-green/30 rounded-xl text-nvidia-green shrink-0">
              <Monitor size={32} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl 2xl:text-4xl font-bold uppercase tracking-tight text-white flex items-center gap-3">
                Data PC & Spesifikasi
              </h1>
              <p className="text-xs xl:text-sm text-white/50 tracking-tight mt-1">
                Daftar unit PC warnet dan rincian spesifikasi hardware
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-auto">
            <span className="bg-surface border border-hairline px-4 py-2 rounded-xl text-xs xl:text-sm font-bold tabular-nums text-white/80 shadow-sm">
              Total: {totalCount} Unit PC
            </span>
            <button 
              onClick={openAdd}
              className="nvidia-button flex items-center gap-2 px-5 xl:px-6 py-2.5 xl:py-3 rounded-xl font-bold text-xs xl:text-sm uppercase tracking-wider shrink-0"
            >
              <Plus size={18} />
              Tambah Unit PC
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-surface border border-hairline p-3 xl:p-4 rounded-xl shadow-lg">
          <div className="relative w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Cari PC berdasarkan nama, ID, prosesor CPU, GPU, monitor, keyboard, atau storage..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-dark border border-hairline pl-11 pr-10 py-2.5 xl:py-3 rounded-xl text-xs xl:text-sm text-white placeholder:text-white/40 focus:border-nvidia-green outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-surface border border-hairline rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs xl:text-sm">
              <thead className="bg-surface-soft text-white/50 text-[10px] xl:text-xs uppercase font-bold border-b border-hairline">
                <tr>
                  <th className="px-5 xl:px-6 py-4 font-bold border-b border-hairline w-[16%]">Unit PC</th>
                  <th className="px-5 xl:px-6 py-4 font-bold border-b border-hairline w-[25%]">Mesin dan Hardware Inti</th>
                  <th className="px-5 xl:px-6 py-4 font-bold border-b border-hairline w-[27%]">Peripheral dan Layar</th>
                  <th className="px-5 xl:px-6 py-4 font-bold border-b border-hairline w-[16%]">Storage dan Jaringan</th>
                  <th className="px-5 xl:px-6 py-4 font-bold border-b border-hairline text-right w-[16%]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-surface">
                {filteredPcs.map(pc => (
                  <tr key={pc.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* ID dan Nama Unit */}
                    <td className="px-5 xl:px-6 py-5 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-white text-base xl:text-lg uppercase tracking-tight">
                          {pc.name || pc.id}
                        </span>
                        <span className="text-xs xl:text-sm text-nvidia-green font-bold uppercase tracking-wide tabular-nums">
                          ID: {pc.id}
                        </span>
                      </div>
                    </td>

                    {/* Mesin dan Hardware Inti (Tanpa Truncate) */}
                    <td className="px-5 xl:px-6 py-5 align-top">
                      <div className="space-y-1.5">
                        <div className="text-white font-semibold text-xs xl:text-sm leading-snug">
                          {pc.specs?.cpu || "CPU belum diatur"}
                        </div>
                        <div className="text-white/80 text-xs xl:text-sm leading-snug">
                          GPU: {pc.specs?.gpu || "-"}
                        </div>
                        <div className="text-white/60 text-xs flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
                          <span className="text-white/70 tabular-nums font-medium">RAM: {pc.specs?.ram || "-"}</span>
                          {pc.specs?.mainboard && (
                            <>
                              <span className="text-white/30">•</span>
                              <span>MBD: {pc.specs.mainboard}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Peripheral dan Layar (Tanpa Truncate) */}
                    <td className="px-5 xl:px-6 py-5 align-top">
                      <div className="space-y-1.5">
                        <div className="text-white font-semibold text-xs xl:text-sm leading-snug">
                          Layar: {pc.specs?.monitor || "-"}
                        </div>
                        <div className="text-white/80 text-xs xl:text-sm leading-snug">
                          Keyboard: {pc.specs?.keyboard || "-"}
                        </div>
                        <div className="text-white/60 text-xs flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
                          <span>Mouse: {pc.specs?.mouse || "-"}</span>
                          {pc.specs?.headset && (
                            <>
                              <span className="text-white/30">•</span>
                              <span>Headset: {pc.specs.headset}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Storage dan Jaringan */}
                    <td className="px-5 xl:px-6 py-5 align-top">
                      <div className="space-y-1.5">
                        <div className="text-white font-semibold text-xs xl:text-sm leading-snug">
                          Storage: {pc.specs?.storage || "-"}
                        </div>
                        <div className="text-white/60 text-xs leading-snug">
                          LAN: {pc.specs?.koneksi || "Fiber Optic"}
                        </div>
                      </div>
                    </td>

                    {/* Tombol Aksi */}
                    <td className="px-5 xl:px-6 py-5 align-top text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button 
                          onClick={() => openEdit(pc)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-surface-dark hover:bg-nvidia-green hover:text-black text-nvidia-green border border-hairline rounded-xl text-xs font-bold transition"
                          title="Edit Spesifikasi PC"
                        >
                          <Pencil size={15} />
                          Edit
                        </button>
                        <button 
                          onClick={() => requestDelete(pc)}
                          className="p-2 bg-surface-dark hover:bg-error hover:text-white text-error border border-hairline rounded-xl transition"
                          title="Hapus Unit PC"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPcs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-white/30 text-xs xl:text-sm uppercase tracking-wider font-bold">
                      Tidak ada unit PC yang cocok dengan pencarian
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden flex flex-col gap-4">
          {filteredPcs.map(pc => (
            <div key={pc.id} className="bg-surface border border-hairline p-5 rounded-xl shadow space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-lg uppercase">{pc.name || pc.id}</h3>
                  <span className="text-nvidia-green text-xs font-bold tabular-nums">ID: {pc.id}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEdit(pc)}
                    className="p-2.5 bg-surface-dark hover:bg-white/10 text-white/80 border border-hairline rounded-lg"
                    title="Edit PC"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => requestDelete(pc)}
                    className="p-2.5 bg-surface-dark hover:bg-error text-error hover:text-white border border-hairline rounded-lg"
                    title="Hapus PC"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-xs bg-surface-dark p-4 rounded-xl border border-hairline">
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-bold block">Prosesor CPU</span>
                  <span className="font-semibold text-white leading-snug block">{pc.specs?.cpu || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-bold block">Kartu Grafis GPU</span>
                  <span className="font-semibold text-white leading-snug block">{pc.specs?.gpu || "-"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-hairline/60">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase font-bold block">RAM</span>
                    <span className="text-white/80">{pc.specs?.ram || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase font-bold block">Storage</span>
                    <span className="text-white/80">{pc.specs?.storage || "-"}</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-hairline/60">
                  <span className="text-[10px] text-white/40 uppercase font-bold block">Layar dan Peripheral</span>
                  <span className="text-white/80 leading-snug block">
                    {pc.specs?.monitor || "-"} • {pc.specs?.keyboard || "-"} • {pc.specs?.mouse || "-"}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filteredPcs.length === 0 && (
            <div className="p-8 text-center text-white/30 text-xs uppercase bg-surface border border-hairline rounded-xl font-bold">
              Tidak ada unit PC yang cocok
            </div>
          )}
        </div>
      </div>

      {/* Form Modal: Tambah dan Edit PC */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-hairline p-6 xl:p-8 w-full max-w-2xl 2xl:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative text-white custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-hairline">
                <h3 className="text-lg xl:text-xl font-bold uppercase text-white flex items-center gap-2.5">
                  <Monitor size={22} className="text-nvidia-green" />
                  {editMode ? "Edit Spesifikasi Unit PC" : "Tambah Unit PC Baru"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-error/10 border border-error/30 text-error text-xs rounded-xl font-bold">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-6">
                {/* Section 1: Identitas Unit */}
                <div>
                  <h4 className="text-xs uppercase font-bold text-nvidia-green tracking-wider mb-3">
                    Identitas Unit PC
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xl:gap-4">
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        ID PC Unik
                      </label>
                      <input 
                        type="text" 
                        value={form.id} 
                        onChange={e => setForm({ ...form, id: e.target.value.toLowerCase().trim() })}
                        disabled={editMode}
                        placeholder="contoh: pc-01 atau pc-vip"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none tabular-nums disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Nama Tampilan Unit
                      </label>
                      <input 
                        type="text" 
                        value={form.name} 
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="contoh: PC 01 VIP"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Hardware Mesin Inti */}
                <div>
                  <h4 className="text-xs uppercase font-bold text-nvidia-green tracking-wider mb-3">
                    Hardware Mesin Inti
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xl:gap-4">
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Prosesor CPU
                      </label>
                      <input 
                        type="text" 
                        value={form.specs?.cpu || ""} 
                        onChange={e => setForm({ ...form, specs: { ...form.specs!, cpu: e.target.value } })}
                        placeholder="contoh: AMD Ryzen 5 5600X"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Kartu Grafis GPU
                      </label>
                      <input 
                        type="text" 
                        value={form.specs?.gpu || ""} 
                        onChange={e => setForm({ ...form, specs: { ...form.specs!, gpu: e.target.value } })}
                        placeholder="contoh: NVIDIA RTX 4060 8GB"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Kapasitas RAM
                      </label>
                      <input 
                        type="text" 
                        value={form.specs?.ram || ""} 
                        onChange={e => setForm({ ...form, specs: { ...form.specs!, ram: e.target.value } })}
                        placeholder="contoh: 16 GB DDR4 3200 MHz"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Penyimpanan Storage
                      </label>
                      <input 
                        type="text" 
                        value={form.specs?.storage || ""} 
                        onChange={e => setForm({ ...form, specs: { ...form.specs!, storage: e.target.value } })}
                        placeholder="contoh: ADATA NVMe 512GB"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Motherboard Mainboard
                      </label>
                      <input 
                        type="text" 
                        value={form.specs?.mainboard || ""} 
                        onChange={e => setForm({ ...form, specs: { ...form.specs!, mainboard: e.target.value } })}
                        placeholder="contoh: ASRock B450M-HDV R4.0"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Peripheral dan Layar */}
                <div>
                  <h4 className="text-xs uppercase font-bold text-nvidia-green tracking-wider mb-3">
                    Peripheral dan Layar
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xl:gap-4">
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Layar Monitor
                      </label>
                      <input 
                        type="text" 
                        value={form.specs?.monitor || ""} 
                        onChange={e => setForm({ ...form, specs: { ...form.specs!, monitor: e.target.value } })}
                        placeholder="contoh: GIGABYTE 25 Inch 240Hz"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Keyboard Gaming
                      </label>
                      <input 
                        type="text" 
                        value={form.specs?.keyboard || ""} 
                        onChange={e => setForm({ ...form, specs: { ...form.specs!, keyboard: e.target.value } })}
                        placeholder="contoh: Fantech ATOM MK886 RGB"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Mouse Gaming
                      </label>
                      <input 
                        type="text" 
                        value={form.specs?.mouse || ""} 
                        onChange={e => setForm({ ...form, specs: { ...form.specs!, mouse: e.target.value } })}
                        placeholder="contoh: Fantech THOR X9 Macro"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Headset Gaming
                      </label>
                      <input 
                        type="text" 
                        value={form.specs?.headset || ""} 
                        onChange={e => setForm({ ...form, specs: { ...form.specs!, headset: e.target.value } })}
                        placeholder="contoh: Fantech Flash HQ53 7.1"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Jaringan dan Game */}
                <div>
                  <h4 className="text-xs uppercase font-bold text-nvidia-green tracking-wider mb-3">
                    Jaringan dan Game Terpasang
                  </h4>
                  <div className="grid grid-cols-1 gap-3 xl:gap-4">
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Koneksi Jaringan
                      </label>
                      <input 
                        type="text" 
                        value={form.specs?.koneksi || ""} 
                        onChange={e => setForm({ ...form, specs: { ...form.specs!, koneksi: e.target.value } })}
                        placeholder="contoh: Fiber Optic High Speed Low Latency"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                        Daftar Game, pisahkan dengan koma
                      </label>
                      <input 
                        type="text" 
                        value={form.specs?.games?.join(", ") || ""} 
                        onChange={e => {
                          const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                          setForm({ ...form, specs: { ...form.specs!, games: arr } });
                        }}
                        placeholder="contoh: Valorant, Dota 2, Point Blank, GTA V, Steam"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-hairline">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 xl:px-5 py-2.5 xl:py-3 border border-hairline text-white/60 hover:text-white rounded-xl text-xs xl:text-sm font-bold uppercase transition"
                >
                  Batal
                </button>
                <button 
                  disabled={isSubmitting}
                  onClick={handleSave}
                  className="nvidia-button text-xs xl:text-sm px-5 xl:px-6 py-2.5 xl:py-3 rounded-xl flex items-center gap-2"
                >
                  <Check size={16} />
                  {editMode ? "Simpan Perubahan" : "Tambah PC Sekarang"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingPc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-hairline p-6 xl:p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-5 text-white relative"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-error/10 border border-error/30 rounded-xl text-error shrink-0">
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <h3 className="text-base xl:text-lg font-bold uppercase tracking-tight text-white">
                    Hapus Unit PC
                  </h3>
                  <p className="text-xs text-white/50 tracking-tight mt-0.5">
                    Konfirmasi penghapusan unit dari database
                  </p>
                </div>
              </div>

              <div className="bg-surface-dark border border-hairline p-4 rounded-xl space-y-2 text-xs xl:text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Unit PC:</span>
                  <span className="font-bold text-white uppercase">{deletingPc.name || deletingPc.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">ID PC:</span>
                  <span className="text-white/70 uppercase font-semibold tabular-nums">{deletingPc.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Spesifikasi:</span>
                  <span className="text-white/70">{deletingPc.specs?.cpu || "-"}</span>
                </div>
              </div>

              <p className="text-xs text-error/90 leading-relaxed">
                Peringatan: Seluruh data antrean dan riwayat yang terkait dengan unit PC ini akan otomatis dibersihkan.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeletingPc(null)}
                  className="flex-1 py-3 bg-surface-dark hover:bg-white/10 rounded-xl text-xs xl:text-sm font-bold uppercase text-white/60 border border-hairline transition"
                >
                  Batal
                </button>
                <button
                  disabled={isDeleting}
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-error text-white hover:bg-error/80 rounded-xl text-xs xl:text-sm font-bold uppercase transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Hapus Unit PC
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
