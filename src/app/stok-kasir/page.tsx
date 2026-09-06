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
    return <div className="p-8 tracking-tight text-white/50 uppercase text-xs animate-pulse">Memuat Database Stok...</div>;
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-10 pb-32">
      <div className="nvidia-card p-6 md:p-8">
        <div className="nvidia-corner"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-hairline pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-white flex items-center gap-2.5">
              <Package size={22} className="text-nvidia-green" />
              MASTER DATA: Stok Barang Kasir
            </h2>
            <p className="text-xs text-white/50 tracking-tight mt-1">Manajemen inventaris makanan, minuman, dan item kasir warnet.</p>
          </div>
          <input
            type="text"
            placeholder="Cari item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-surface-dark border border-hairline px-3 py-1.5 rounded-[2px] text-xs text-white placeholder:text-white/40 focus:border-nvidia-green outline-none w-full md:w-56"
          />
        </div>
        
        {/* Form Tambah Item */}
        <div className="flex flex-wrap gap-3 mb-8 bg-surface-dark p-4 rounded border border-hairline">
          <input 
            type="text" 
            placeholder="Nama Barang (e.g. Indomie Goreng)" 
            className="bg-surface border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm flex-1 min-w-[200px] focus:border-nvidia-green outline-none"
            value={newInv.name}
            onChange={(e) => setNewInv({...newInv, name: e.target.value})}
            onKeyDown={(e) => e.key === 'Enter' && addInv()}
          />
          <input 
            type="number" 
            placeholder="Harga (Rp)" 
            className="bg-surface border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm w-36 focus:border-nvidia-green outline-none font-mono"
            value={newInv.price}
            onChange={(e) => setNewInv({...newInv, price: e.target.value})}
            onKeyDown={(e) => e.key === 'Enter' && addInv()}
          />
          <input 
            type="number" 
            placeholder="Stok Awal" 
            className="bg-surface border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm w-32 focus:border-nvidia-green outline-none font-mono"
            value={newInv.stock}
            onChange={(e) => setNewInv({...newInv, stock: e.target.value})}
            onKeyDown={(e) => e.key === 'Enter' && addInv()}
          />
          <select 
            className="bg-surface border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm focus:border-nvidia-green outline-none"
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
            className="nvidia-button shrink-0 flex items-center gap-2"
          >
            <Plus size={16} /> Tambah Stok
          </button>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block border border-hairline rounded-[2px] overflow-x-auto">
          <table className="w-full text-left tracking-tight text-sm whitespace-nowrap">
            <thead className="bg-surface-soft text-white/50 text-[11px] uppercase">
              <tr>
                <th className="p-4 font-bold border-b border-hairline">Nama Barang</th>
                <th className="p-4 font-bold border-b border-hairline">Kategori</th>
                <th className="p-4 font-bold border-b border-hairline">Stok</th>
                <th className="p-4 font-bold border-b border-hairline">Harga</th>
                <th className="p-4 font-bold border-b border-hairline text-right">Aksi & Quick Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline bg-surface-dark">
              {items.map((inv: InventoryItem) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-bold uppercase text-white">{inv.name}</td>
                  <td className="p-4 text-white/50 uppercase text-xs">
                    <span className="px-2 py-0.5 rounded bg-surface border border-hairline">
                      {inv.category === 'food' ? 'Makanan' : inv.category === 'drink' ? 'Minuman' : 'Lainnya'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-[2px] font-mono font-bold text-xs ${
                      inv.stock <= 0
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : inv.stock < 5 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                        : 'bg-surface-soft text-white/90 border border-hairline'
                    }`}>
                      {inv.stock} PCS
                    </span>
                  </td>
                  <td className="p-4 text-nvidia-green font-mono font-bold">
                    Rp {inv.price.toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => updateStockQuick(inv, 1)} 
                        className="text-[10px] font-bold bg-surface hover:bg-nvidia-green hover:text-black text-nvidia-green px-2 py-1 border border-hairline rounded transition"
                        title="Tambah 1 Stok"
                      >
                        +1
                      </button>
                      <button 
                        onClick={() => updateStockQuick(inv, 5)} 
                        className="text-[10px] font-bold bg-surface hover:bg-nvidia-green hover:text-black text-nvidia-green px-2 py-1 border border-hairline rounded transition"
                        title="Tambah 5 Stok"
                      >
                        +5
                      </button>
                      <button 
                        onClick={() => updateStockQuick(inv, 10)} 
                        className="text-[10px] font-bold bg-nvidia-green/10 text-nvidia-green hover:bg-nvidia-green hover:text-black px-2.5 py-1 border border-nvidia-green/30 rounded transition"
                        title="Tambah 10 Stok"
                      >
                        +10
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(inv)} 
                        className="p-1.5 bg-surface hover:bg-white/10 text-cyan-400 border border-cyan-500/30 rounded transition"
                        title="Edit Barang"
                      >
                        <Pencil size={15} />
                      </button>
                      <button 
                        onClick={() => deleteInv(inv.id, inv.name)} 
                        className="p-1.5 bg-surface hover:bg-error hover:text-white text-error border border-error/30 rounded transition"
                        title="Hapus Barang"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-white/30 text-xs uppercase tracking-widest font-bold">
                    Belum ada data stok barang.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-3">
          {items.map((inv: InventoryItem) => (
            <div key={inv.id} className="bg-surface-dark border border-hairline p-4 rounded-[2px] flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm uppercase">{inv.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-nvidia-green font-mono font-bold text-sm">
                      Rp {inv.price.toLocaleString("id-ID")}
                    </span>
                    <span className="text-white/40 text-[10px] uppercase">
                      • {inv.category}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-[2px] font-mono font-bold text-[11px] ${
                  inv.stock <= 0 ? 'bg-red-500/20 text-red-400 border border-red-500/40' : inv.stock < 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-soft text-white/70'
                }`}>
                  {inv.stock} PCS
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-hairline pt-2">
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => updateStockQuick(inv, 1)} 
                    className="text-[10px] font-bold bg-surface border border-hairline text-white px-2.5 py-1 rounded"
                  >
                    +1
                  </button>
                  <button 
                    onClick={() => updateStockQuick(inv, 5)} 
                    className="text-[10px] font-bold bg-surface border border-hairline text-white px-2.5 py-1 rounded"
                  >
                    +5
                  </button>
                  <button 
                    onClick={() => updateStockQuick(inv, 10)} 
                    className="text-[10px] font-bold bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/30 px-2.5 py-1 rounded"
                  >
                    +10
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenEdit(inv)} 
                    className="p-1.5 bg-surface text-cyan-400 border border-cyan-500/30 rounded"
                  >
                    <Pencil size={15} />
                  </button>
                  <button 
                    onClick={() => deleteInv(inv.id, inv.name)} 
                    className="p-1.5 bg-surface text-error border border-error/30 rounded"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-6 text-center text-white/30 text-xs uppercase bg-surface-dark border border-hairline">
              Belum ada data stok barang.
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
              className="bg-surface border border-hairline p-6 w-full max-w-md rounded-xl shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-hairline">
                <h3 className="text-lg font-bold uppercase text-white flex items-center gap-2">
                  <Pencil size={18} className="text-nvidia-green" />
                  Edit Stok Barang
                </h3>
                <button
                  onClick={() => setEditingInv(null)}
                  className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] text-white/50 uppercase font-bold block mb-1.5">
                    Nama Barang
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-surface-dark border border-hairline p-2.5 text-sm text-white focus:border-nvidia-green outline-none rounded-[2px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                  <div>
                    <label className="text-[10px] text-white/50 uppercase font-bold block mb-1.5">
                      Jumlah Stok
                    </label>
                    <input
                      type="number"
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                      className="w-full bg-surface-dark border border-hairline p-2.5 text-sm text-white focus:border-nvidia-green outline-none rounded-[2px] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/50 uppercase font-bold block mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-surface-dark border border-hairline p-2.5 text-sm text-white focus:border-nvidia-green outline-none rounded-[2px]"
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
