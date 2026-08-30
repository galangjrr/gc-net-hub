"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { DatabaseSchema, InventoryItem } from "@/lib/db";

export default function StokKasirPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [newInv, setNewInv] = useState({ name: "", price: "", stock: "", category: "food" });

  const loadData = async () => {
    const res = await fetch("/api/data", { cache: "no-store" });
    const data = await res.json();
    setDb(data);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const addInv = async () => {
    if (!newInv.name || !newInv.price || !newInv.stock) return;
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newInv),
    });
    setNewInv({ name: "", price: "", stock: "", category: "food" });
    loadData();
  };

  const deleteInv = async (id: string) => {
    if (!confirm("Yakin hapus stok ini?")) return;
    await fetch("/api/inventory", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadData();
  };

  const updateStock = async (inv: InventoryItem, addedStock: number) => {
    await fetch("/api/inventory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...inv, stock: inv.stock + addedStock }),
    });
    loadData();
  };

  if (!db) return <div className="p-8 tracking-tight text-white/50 uppercase text-xs">Loading Database...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-12 pb-32">
      <div className="nvidia-card p-8">
        <div className="nvidia-corner"></div>
        <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-white mb-6 border-b border-hairline pb-4">
          MASTER DATA: Stok Barang Kasir
        </h2>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Nama Barang (e.g. Indomie Goreng)" 
            className="bg-surface-dark border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm flex-1 min-w-[200px] focus:border-nvidia-green outline-none"
            value={newInv.name}
            onChange={(e) => setNewInv({...newInv, name: e.target.value})}
          />
          <input 
            type="number" 
            placeholder="Harga (Rp)" 
            className="bg-surface-dark border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm w-32 focus:border-nvidia-green outline-none"
            value={newInv.price}
            onChange={(e) => setNewInv({...newInv, price: e.target.value})}
          />
          <input 
            type="number" 
            placeholder="Stok Awal" 
            className="bg-surface-dark border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm w-32 focus:border-nvidia-green outline-none"
            value={newInv.stock}
            onChange={(e) => setNewInv({...newInv, stock: e.target.value})}
          />
          <select 
            className="bg-surface-dark border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm focus:border-nvidia-green outline-none"
            value={newInv.category}
            onChange={(e) => setNewInv({...newInv, category: e.target.value})}
          >
            <option value="food">Makanan</option>
            <option value="drink">Minuman</option>
            <option value="other">Lainnya</option>
          </select>
          <button onClick={addInv} className="nvidia-button shrink-0 flex items-center gap-2">
            <Plus size={16} /> Tambah Stok
          </button>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block border border-hairline rounded-[2px] overflow-x-auto">
          <table className="w-full text-left tracking-tight text-sm whitespace-nowrap">
            <thead className="bg-surface-soft text-white/50 text-[11px] uppercase">
              <tr>
                <th className="p-4 font-bold border-b border-hairline">Nama Barang</th>
                <th className="p-4 font-bold border-b border-hairline">Kategori</th>
                <th className="p-4 font-bold border-b border-hairline">Stok</th>
                <th className="p-4 font-bold border-b border-hairline">Harga</th>
                <th className="p-4 font-bold border-b border-hairline text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {db.inventory?.filter(i => i.category !== 'staff_account').map((inv: InventoryItem) => (
                <tr key={inv.id} className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold uppercase">{inv.name}</td>
                  <td className="p-4 text-white/50 uppercase text-xs">{inv.category}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-[2px] font-bold text-xs ${inv.stock < 5 ? 'bg-error-deep text-white' : 'bg-surface-soft text-white/70'}`}>
                      {inv.stock} PCS
                    </span>
                  </td>
                  <td className="p-4 text-nvidia-green font-bold">Rp {inv.price.toLocaleString("id-ID")}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => updateStock(inv, 10)} 
                        className="text-[10px] font-bold bg-nvidia-green/10 text-nvidia-green hover:bg-nvidia-green hover:text-black px-2 py-1 border border-nvidia-green/30 transition-colors"
                      >
                        +10 STOK
                      </button>
                      <button onClick={() => deleteInv(inv.id)} className="text-white/30 hover:text-error transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!db.inventory || db.inventory.length === 0) && (
                <tr><td colSpan={5} className="p-8 text-center text-white/30 text-xs uppercase">Belum ada data stok barang</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-3">
          {db.inventory?.filter(i => i.category !== 'staff_account').map((inv: InventoryItem) => (
            <div key={inv.id} className="bg-surface-dark border border-hairline p-4 rounded-[2px] flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm uppercase">{inv.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-nvidia-green font-bold text-xs">Rp {inv.price.toLocaleString("id-ID")}</span>
                  <span className="text-white/40 text-[10px] uppercase">• {inv.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-[2px] font-bold text-[10px] ${inv.stock < 5 ? 'bg-error-deep text-white' : 'bg-surface-soft text-white/70'}`}>
                  {inv.stock} PCS
                </span>
                <button 
                  onClick={() => updateStock(inv, 10)} 
                  className="text-[10px] font-bold bg-nvidia-green/10 text-nvidia-green hover:bg-nvidia-green hover:text-black px-2 py-1.5 border border-nvidia-green/30 transition-colors"
                >
                  +10
                </button>
                <button onClick={() => deleteInv(inv.id)} className="text-white/30 hover:text-error p-1">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {(!db.inventory || db.inventory.length === 0) && (
            <div className="p-6 text-center text-white/30 text-xs uppercase bg-surface-dark border border-hairline">Belum ada data stok barang</div>
          )}
        </div>
      </div>
    </div>
  );
}
