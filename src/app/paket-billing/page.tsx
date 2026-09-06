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
    return <div className="p-8 tracking-tight text-white/50 uppercase text-xs animate-pulse">Memuat Master Data Paket...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-12 pb-32">
      <div className="nvidia-card p-6 md:p-8">
        <div className="nvidia-corner"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-hairline pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-white flex items-center gap-2.5">
              <Sliders size={22} className="text-nvidia-green" />
              MASTER DATA: Paket & Tarif Booking
            </h2>
            <p className="text-xs text-white/50 tracking-tight mt-1">Kelola daftar harga dan paket billing warnet.</p>
          </div>
          <span className="text-xs font-mono font-bold text-nvidia-green bg-nvidia-green/10 border border-nvidia-green/30 px-3 py-1 rounded">
            Total: {db.pakets?.length || 0} Paket
          </span>
        </div>
        
        {/* Form Tambah Paket */}
        <div className="flex flex-wrap gap-4 mb-8 bg-surface-dark p-4 rounded border border-hairline">
          <input 
            type="text" 
            placeholder="Nama Paket (e.g. 1 Jam / Rp. 5000 / 3 JAM SULTAN)" 
            className="bg-surface border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm flex-1 min-w-[240px] focus:border-nvidia-green outline-none"
            value={newPaket.name}
            onChange={(e) => setNewPaket({...newPaket, name: e.target.value})}
            onKeyDown={(e) => e.key === 'Enter' && addPaket()}
          />
          <input 
            type="number" 
            placeholder="Harga (Rp)" 
            className="bg-surface border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm w-44 focus:border-nvidia-green outline-none font-mono"
            value={newPaket.price}
            onChange={(e) => setNewPaket({...newPaket, price: e.target.value})}
            onKeyDown={(e) => e.key === 'Enter' && addPaket()}
          />
          <button 
            disabled={isSubmitting} 
            onClick={addPaket} 
            className="nvidia-button shrink-0 flex items-center gap-2"
          >
            <Plus size={16} /> Tambah Paket
          </button>
        </div>

        {/* Tabel Paket Desktop */}
        <div className="border border-hairline rounded-[2px] overflow-x-auto">
          <table className="w-full text-left tracking-tight text-sm whitespace-nowrap">
            <thead className="bg-surface-soft text-white/50 text-[11px] uppercase">
              <tr>
                <th className="p-4 font-bold border-b border-hairline">Nama Paket</th>
                <th className="p-4 font-bold border-b border-hairline">Harga</th>
                <th className="p-4 font-bold border-b border-hairline text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline bg-surface-dark">
              {db.pakets?.map((p: Paket) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-bold text-white uppercase">{p.name}</td>
                  <td className="p-4 text-nvidia-green font-mono font-bold text-base">
                    Rp {p.price.toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenEdit(p)} 
                        className="p-2 bg-surface hover:bg-nvidia-green hover:text-black border border-hairline rounded-[2px] text-nvidia-green transition-colors"
                        title="Edit Paket"
                      >
                        <Pencil size={15} />
                      </button>
                      <button 
                        onClick={() => deletePaket(p.id, p.name)} 
                        className="p-2 bg-surface hover:bg-error hover:text-white border border-hairline rounded-[2px] text-error transition-colors"
                        title="Hapus Paket"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!db.pakets || db.pakets.length === 0) && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-white/30 text-xs uppercase">
                    Belum ada data paket
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              className="bg-surface border border-hairline p-6 w-full max-w-md rounded-xl shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-hairline">
                <h3 className="text-lg font-bold uppercase text-white flex items-center gap-2">
                  <Pencil size={18} className="text-nvidia-green" />
                  Edit Paket Booking
                </h3>
                <button
                  onClick={() => setEditingPaket(null)}
                  className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] text-white/50 uppercase font-bold block mb-1.5">
                    Nama Paket
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-surface-dark border border-hairline p-2.5 text-sm text-white focus:border-nvidia-green outline-none rounded-[2px]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/50 uppercase font-bold block mb-1.5">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full bg-surface-dark border border-hairline p-2.5 text-sm text-white focus:border-nvidia-green outline-none rounded-[2px] font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingPaket(null)}
                  className="px-4 py-2 border border-hairline text-white/60 hover:text-white rounded-[2px] text-xs font-bold uppercase transition"
                >
                  Batal
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={saveEdit}
                  className="nvidia-button text-xs flex items-center gap-1.5"
                >
                  <Check size={14} /> Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
