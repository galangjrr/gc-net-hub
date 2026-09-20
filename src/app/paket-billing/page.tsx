"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Sliders, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { DatabaseSchema, Paket } from "@/lib/db";

export default function PaketBillingPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPaket, setNewPaket] = useState({ name: "", price: "" });
  const [editingPaket, setEditingPaket] = useState<Paket | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "" });
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

  const addPaket = async () => {
    if (!newPaket.name.trim() || !newPaket.price) {
      return alert("Nama paket dan harga wajib diisi!");
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pakets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPaket.name.trim(),
          price: Number(newPaket.price),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Gagal menambah paket");
      }
      setNewPaket({ name: "", price: "" });
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Gagal menambah paket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (paket: Paket) => {
    setEditingPaket(paket);
    setEditForm({ name: paket.name, price: String(paket.price) });
  };

  const saveEdit = async () => {
    if (!editingPaket) return;
    if (!editForm.name.trim() || !editForm.price) {
      return alert("Nama paket dan harga tidak boleh kosong!");
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pakets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPaket.id,
          name: editForm.name.trim(),
          price: Number(editForm.price),
        }),
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
              <Sliders size={32} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl 2xl:text-4xl font-bold uppercase tracking-tight text-white flex items-center gap-3">
                Master Data Paket dan Tarif
              </h1>
              <p className="text-xs xl:text-sm text-white/50 tracking-tight mt-1">
                Kelola daftar harga dan paket billing warnet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <span className="text-xs xl:text-sm font-bold text-nvidia-green bg-nvidia-green/10 border border-nvidia-green/30 px-3.5 py-1.5 rounded-xl tabular-nums">
              Total: {db.pakets?.length || 0} Paket
            </span>
          </div>
        </div>
        
        {/* Form Tambah Paket */}
        <div className="bg-surface border border-hairline rounded-xl p-4 xl:p-6 shadow-xl space-y-3">
          <h3 className="text-xs xl:text-sm uppercase tracking-wider font-bold text-white/70">
            Tambah Paket Baru
          </h3>
          <div className="flex flex-wrap gap-3 xl:gap-4">
            <input 
              type="text" 
              placeholder="Nama Paket, contoh: 1 Jam, 3 Jam Sultan" 
              className="bg-surface-dark border border-hairline text-white p-3 xl:p-3.5 rounded-xl text-xs xl:text-sm flex-1 min-w-[240px] focus:border-nvidia-green outline-none"
              value={newPaket.name}
              onChange={(e) => setNewPaket({...newPaket, name: e.target.value})}
              onKeyDown={(e) => e.key === 'Enter' && addPaket()}
            />
            <input 
              type="number" 
              placeholder="Harga Rp" 
              className="bg-surface-dark border border-hairline text-white p-3 xl:p-3.5 rounded-xl text-xs xl:text-sm w-44 xl:w-56 focus:border-nvidia-green outline-none tabular-nums"
              value={newPaket.price}
              onChange={(e) => setNewPaket({...newPaket, price: e.target.value})}
              onKeyDown={(e) => e.key === 'Enter' && addPaket()}
            />
            <button 
              disabled={isSubmitting} 
              onClick={addPaket} 
              className="nvidia-button shrink-0 flex items-center gap-2 rounded-xl text-xs xl:text-sm px-4 xl:px-6 py-3 xl:py-3.5"
            >
              <Plus size={18} /> Tambah Paket
            </button>
          </div>
        </div>

        {/* Tabel Paket Desktop & Responsive */}
        <div className="bg-surface border border-hairline rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-surface-soft text-white/50 text-xs uppercase font-bold border-b border-hairline">
                <tr>
                  <th className="px-4 xl:px-6 py-3.5 xl:py-4 font-bold border-b border-hairline">Nama Paket</th>
                  <th className="px-4 xl:px-6 py-3.5 xl:py-4 font-bold border-b border-hairline">Harga</th>
                  <th className="px-4 xl:px-6 py-3.5 xl:py-4 font-bold border-b border-hairline text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-surface">
                {db.pakets?.map((p: Paket) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 xl:px-6 py-4 xl:py-5 font-bold text-zinc-100 text-sm xl:text-base">{p.name}</td>
                    <td className="px-4 xl:px-6 py-4 xl:py-5 text-nvidia-green font-extrabold text-base xl:text-lg tabular-nums">
                      Rp {p.price.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 xl:px-6 py-4 xl:py-5 text-right">
                      <div className="flex items-center justify-end gap-2 xl:gap-3">
                        <button 
                          onClick={() => handleOpenEdit(p)} 
                          className="p-2 xl:p-2.5 bg-surface-dark hover:bg-nvidia-green hover:text-black border border-hairline rounded-lg text-nvidia-green transition-colors"
                          title="Edit Paket"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => deletePaket(p.id, p.name)} 
                          className="p-2 xl:p-2.5 bg-surface-dark hover:bg-error hover:text-white border border-hairline rounded-lg text-error transition-colors"
                          title="Hapus Paket"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!db.pakets || db.pakets.length === 0) && (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-white/30 text-xs xl:text-sm uppercase tracking-wider font-bold">
                      Belum ada data paket
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingPaket && (
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
              className="bg-surface border border-hairline p-6 xl:p-8 w-full max-w-md 2xl:max-w-lg rounded-2xl shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-hairline">
                <h3 className="text-lg xl:text-xl font-bold uppercase text-white flex items-center gap-2.5">
                  <Pencil size={20} className="text-nvidia-green" />
                  Edit Paket Booking
                </h3>
                <button
                  onClick={() => setEditingPaket(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                    Nama Paket
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-surface-dark border border-hairline p-3 text-xs xl:text-sm text-white focus:border-nvidia-green outline-none rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 uppercase font-bold block mb-1.5">
                    Harga Rp
                  </label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full bg-surface-dark border border-hairline p-3 text-xs xl:text-sm text-white focus:border-nvidia-green outline-none rounded-xl tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingPaket(null)}
                  className="px-4 xl:px-5 py-2.5 xl:py-3 border border-hairline text-white/60 hover:text-white rounded-xl text-xs xl:text-sm font-bold uppercase transition"
                >
                  Batal
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={saveEdit}
                  className="nvidia-button text-xs xl:text-sm px-4 xl:px-5 py-2.5 xl:py-3 rounded-xl flex items-center gap-2"
                >
                  <Check size={16} /> Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
