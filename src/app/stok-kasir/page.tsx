"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Package, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { DatabaseSchema, InventoryItem } from "@/lib/db";

export default function StokKasirPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [newInv, setNewInv] = useState({ name: "", price: "", stock: "", category: "food" });
  const [editingInv, setEditingInv] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "", stock: "", category: "food" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const addInv = async () => {
    if (!newInv.name.trim() || !newInv.price || newInv.stock === "") {
      return alert("Lengkapi nama barang, harga, dan stok awal!");
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newInv.name.trim(),
          price: Number(newInv.price),
          stock: Number(newInv.stock),
          category: newInv.category,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Gagal menambah barang");
      }
      setNewInv({ name: "", price: "", stock: "", category: "food" });
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Gagal menambah barang");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (inv: InventoryItem) => {
    setEditingInv(inv);
    setEditForm({
      name: inv.name,
      price: String(inv.price),
      stock: String(inv.stock),
      category: inv.category,
    });
  };

  const saveEdit = async () => {
    if (!editingInv) return;
    if (!editForm.name.trim() || !editForm.price || editForm.stock === "") {
      return alert("Lengkapi semua field edit barang!");
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingInv.id,
          name: editForm.name.trim(),
          price: Number(editForm.price),
          stock: Number(editForm.stock),
          category: editForm.category,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Gagal update data stok");
      }
      setEditingInv(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Gagal update data stok");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteInv = async (id: string, name: string) => {
    if (!confirm(`Yakin hapus stok barang "${name}"?`)) return;
    try {
      const res = await fetch("/api/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Gagal menghapus barang");
      }
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Gagal menghapus barang");
    }
  };

  const updateStockQuick = async (inv: InventoryItem, delta: number) => {
    const newStock = Math.max(0, inv.stock + delta);
    try {
      const res = await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inv, stock: newStock }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Gagal update stok");
      }
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Gagal update stok");
    }
  };

  if (loading || !db) {
    return (
      <div className="min-h-screen bg-surface-dark p-8 tracking-tight text-white/50 uppercase text-xs xl:text-sm animate-pulse flex items-center justify-center">
        Memuat Database Stok Kasir...
      </div>
    );
  }

  const items = (db.inventory || []).filter(i => {
    if (i.category === 'staff_account') return false;
    if (searchQuery) {
      return i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-surface-dark p-4 md:p-8 pt-16 md:pt-8 text-white space-y-6 pb-32">
      <div className="max-w-[1400px] 2xl:max-w-[1720px] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-4 xl:pb-6">
          <div className="flex items-center gap-3 xl:gap-4">
            <div className="p-3 bg-nvidia-green/10 border border-nvidia-green/30 rounded-xl text-nvidia-green shrink-0">
              <Package size={32} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl 2xl:text-4xl font-bold uppercase tracking-tight text-white flex items-center gap-3">
                Master Data Stok Kasir
              </h1>
              <p className="text-xs xl:text-sm text-white/50 tracking-tight mt-1">
                Manajemen inventaris makanan, minuman, dan item kasir warnet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto w-full md:w-auto">
            <input
              type="text"
              placeholder="Cari item stok kasir..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface border border-hairline px-3.5 xl:px-4 py-2 xl:py-2.5 rounded-xl text-xs xl:text-sm text-white placeholder:text-white/40 focus:border-nvidia-green outline-none w-full md:w-64 xl:w-80 shadow-inner"
            />
          </div>
        </div>
        
        {/* Form Tambah Item */}
        <div className="bg-surface border border-hairline rounded-xl p-4 xl:p-6 shadow-xl space-y-3">
          <h3 className="text-xs xl:text-sm uppercase tracking-wider font-bold text-white/70">
            Tambah Item Baru
          </h3>
          <div className="flex flex-wrap gap-3 xl:gap-4">
            <input 
              type="text" 
              placeholder="Nama Barang, contoh: Indomie Goreng" 
              className="bg-surface-dark border border-hairline text-white p-3 xl:p-3.5 rounded-xl tracking-tight text-xs xl:text-sm flex-1 min-w-[200px] focus:border-nvidia-green outline-none"
              value={newInv.name}
              onChange={(e) => setNewInv({...newInv, name: e.target.value})}
              onKeyDown={(e) => e.key === 'Enter' && addInv()}
            />
            <input 
              type="number" 
              placeholder="Harga Rp" 
              className="bg-surface-dark border border-hairline text-white p-3 xl:p-3.5 rounded-xl text-xs xl:text-sm w-36 xl:w-44 focus:border-nvidia-green outline-none tabular-nums"
              value={newInv.price}
              onChange={(e) => setNewInv({...newInv, price: e.target.value})}
              onKeyDown={(e) => e.key === 'Enter' && addInv()}
            />
            <input 
              type="number" 
              placeholder="Stok Awal" 
              className="bg-surface-dark border border-hairline text-white p-3 xl:p-3.5 rounded-xl text-xs xl:text-sm w-32 xl:w-36 focus:border-nvidia-green outline-none tabular-nums"
              value={newInv.stock}
              onChange={(e) => setNewInv({...newInv, stock: e.target.value})}
              onKeyDown={(e) => e.key === 'Enter' && addInv()}
            />
            <select 
              className="bg-surface-dark border border-hairline text-white p-3 xl:p-3.5 rounded-xl tracking-tight text-xs xl:text-sm focus:border-nvidia-green outline-none"
              value={newInv.category}
              onChange={(e) => setNewInv({...newInv, category: e.target.value})}
            >
              <option value="food">Makanan</option>
              <option value="drink">Minuman</option>
              <option value="other">Lainnya</option>
            </select>
            <button 
              disabled={isSubmitting}
              onClick={addInv} 
              className="nvidia-button shrink-0 flex items-center gap-2 rounded-xl text-xs xl:text-sm px-4 xl:px-6 py-3 xl:py-3.5"
            >
              <Plus size={18} /> Tambah Stok
            </button>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block bg-surface border border-hairline rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left tracking-tight whitespace-nowrap">
              <thead className="bg-surface-soft text-white/50 text-[10px] xl:text-xs uppercase font-bold border-b border-hairline">
                <tr>
                  <th className="px-4 xl:px-6 py-3.5 xl:py-4 font-bold border-b border-hairline">Nama Barang</th>
                  <th className="px-4 xl:px-6 py-3.5 xl:py-4 font-bold border-b border-hairline">Kategori</th>
                  <th className="px-4 xl:px-6 py-3.5 xl:py-4 font-bold border-b border-hairline">Stok</th>
                  <th className="px-4 xl:px-6 py-3.5 xl:py-4 font-bold border-b border-hairline">Harga</th>
                  <th className="px-4 xl:px-6 py-3.5 xl:py-4 font-bold border-b border-hairline text-right">Aksi dan Quick Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-surface">
                {items.map((inv: InventoryItem) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 xl:px-6 py-4 xl:py-5 font-bold text-zinc-100 text-sm xl:text-base">{inv.name}</td>
                    <td className="px-4 xl:px-6 py-4 xl:py-5 text-zinc-400 text-xs">
                      <span className="px-2.5 py-1 rounded-md bg-surface-dark border border-hairline font-semibold">
                        {inv.category === 'food' ? 'Makanan' : inv.category === 'drink' ? 'Minuman' : 'Lainnya'}
                      </span>
                    </td>
                    <td className="px-4 xl:px-6 py-4 xl:py-5">
                      <span className={`px-3 py-1 rounded-lg font-bold text-xs xl:text-sm tabular-nums ${
                        inv.stock <= 0
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                          : inv.stock < 5 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                          : 'bg-surface-dark text-white/90 border border-hairline'
                      }`}>
                        {inv.stock} PCS
                      </span>
                    </td>
                    <td className="px-4 xl:px-6 py-4 xl:py-5 text-nvidia-green font-extrabold text-base xl:text-lg tabular-nums">
                      Rp {inv.price.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 xl:px-6 py-4 xl:py-5 text-right">
                      <div className="flex items-center justify-end gap-2 xl:gap-2.5">
                        <button 
                          onClick={() => updateStockQuick(inv, 1)} 
                          className="text-xs font-bold bg-surface-dark hover:bg-nvidia-green hover:text-black text-nvidia-green px-2.5 xl:px-3 py-1.5 border border-hairline rounded-lg transition"
                          title="Tambah 1 Stok"
                        >
                          +1
                        </button>
                        <button 
                          onClick={() => updateStockQuick(inv, 5)} 
                          className="text-xs font-bold bg-surface-dark hover:bg-nvidia-green hover:text-black text-nvidia-green px-2.5 xl:px-3 py-1.5 border border-hairline rounded-lg transition"
                          title="Tambah 5 Stok"
                        >
                          +5
                        </button>
                        <button 
                          onClick={() => updateStockQuick(inv, 10)} 
                          className="text-xs font-bold bg-nvidia-green/10 text-nvidia-green hover:bg-nvidia-green hover:text-black px-3 py-1.5 border border-nvidia-green/30 rounded-lg transition"
                          title="Tambah 10 Stok"
                        >
                          +10
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(inv)} 
                          className="p-2 bg-surface-dark hover:bg-white/10 text-cyan-400 border border-cyan-500/30 rounded-lg transition"
                          title="Edit Barang"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => deleteInv(inv.id, inv.name)} 
                          className="p-2 bg-surface-dark hover:bg-error hover:text-white text-error border border-error/30 rounded-lg transition"
                          title="Hapus Barang"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-white/30 text-xs xl:text-sm uppercase tracking-wider font-bold">
                      Belum ada data stok barang
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-3">
          {items.map((inv: InventoryItem) => (
            <div key={inv.id} className="bg-surface border border-hairline p-4 rounded-xl flex flex-col gap-3 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-zinc-100 text-sm">{inv.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-nvidia-green font-bold text-sm tabular-nums">
                      Rp {inv.price.toLocaleString("id-ID")}
                    </span>
                    <span className="text-zinc-400 text-xs font-medium">
                      • {inv.category === 'food' ? 'Makanan' : inv.category === 'drink' ? 'Minuman' : 'Lainnya'}
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg font-bold text-xs tabular-nums ${
                  inv.stock <= 0 ? 'bg-red-500/20 text-red-400 border border-red-500/40' : inv.stock < 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-dark text-zinc-300'
                }`}>
                  {inv.stock} PCS
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-hairline pt-3">
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => updateStockQuick(inv, 1)} 
                    className="text-xs font-bold bg-surface-dark border border-hairline text-white px-2.5 py-1 rounded-lg"
                  >
                    +1
                  </button>
                  <button 
                    onClick={() => updateStockQuick(inv, 5)} 
                    className="text-xs font-bold bg-surface-dark border border-hairline text-white px-2.5 py-1 rounded-lg"
                  >
                    +5
                  </button>
                  <button 
                    onClick={() => updateStockQuick(inv, 10)} 
                    className="text-xs font-bold bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/30 px-2.5 py-1 rounded-lg"
                  >
                    +10
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenEdit(inv)} 
                    className="p-1.5 bg-surface-dark text-cyan-400 border border-cyan-500/30 rounded-lg"
                  >
                    <Pencil size={15} />
                  </button>
                  <button 
                    onClick={() => deleteInv(inv.id, inv.name)} 
                    className="p-1.5 bg-surface-dark text-error border border-error/30 rounded-lg"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-8 text-center text-white/30 text-xs uppercase bg-surface border border-hairline rounded-xl font-bold">
              Belum ada data stok barang
            </div>
          )}
        </div>
      </div>

      {/* Edit Inventory Modal */}
      <AnimatePresence>
        {editingInv && (
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
              className="bg-surface border border-hairline p-6 xl:p-8 w-full max-w-md 2xl:max-w-lg rounded-2xl shadow-2xl relative text-white"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-hairline">
                <h3 className="text-lg xl:text-xl font-bold uppercase text-white flex items-center gap-2.5">
                  <Pencil size={20} className="text-nvidia-green" />
                  Edit Stok Barang
                </h3>
                <button
                  onClick={() => setEditingInv(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                    Nama Barang
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-surface-dark border border-hairline p-3 text-xs xl:text-sm text-white focus:border-nvidia-green outline-none rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 uppercase font-bold block mb-1.5">
                      Harga Jual Rp
                    </label>
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="w-full bg-surface-dark border border-hairline p-3 text-xs xl:text-sm text-white focus:border-nvidia-green outline-none rounded-xl tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/60 uppercase font-bold block mb-1.5">
                      Jumlah Stok
                    </label>
                    <input
                      type="number"
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                      className="w-full bg-surface-dark border border-hairline p-3 text-xs xl:text-sm text-white focus:border-nvidia-green outline-none rounded-xl tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] xl:text-xs text-white/50 uppercase font-bold block mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-surface-dark border border-hairline p-3 text-xs xl:text-sm text-white focus:border-nvidia-green outline-none rounded-xl"
                  >
                    <option value="food">Makanan</option>
                    <option value="drink">Minuman</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingInv(null)}
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
