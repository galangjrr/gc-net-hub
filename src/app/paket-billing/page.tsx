"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { DatabaseSchema, Paket } from "@/lib/db";

export default function PaketBillingPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [newPaket, setNewPaket] = useState({ name: "", price: "" });

  const loadData = async () => {
    const res = await fetch("/api/data");
    const data = await res.json();
    setDb(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const addPaket = async () => {
    if (!newPaket.name || !newPaket.price) return;
    await fetch("/api/pakets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPaket),
    });
    setNewPaket({ name: "", price: "" });
    loadData();
  };

  const deletePaket = async (id: string) => {
    if (!confirm("Yakin hapus paket ini?")) return;
    await fetch("/api/pakets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadData();
  };

  if (!db) return <div className="p-8 tracking-tight text-white/50 uppercase text-xs">Loading Database...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 pb-32">
      <div className="nvidia-card p-8">
        <div className="nvidia-corner"></div>
        <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-white mb-6 border-b border-hairline pb-4">
          MASTER DATA: Paket & Tarif Booking
        </h2>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Nama Paket (e.g. 3 JAM SULTAN)" 
            className="bg-surface-dark border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm w-full focus:border-nvidia-green outline-none"
            value={newPaket.name}
            onChange={(e) => setNewPaket({...newPaket, name: e.target.value})}
          />
          <input 
            type="number" 
            placeholder="Harga (Rp)" 
            className="bg-surface-dark border border-hairline text-white p-3 rounded-[2px] tracking-tight text-sm w-48 focus:border-nvidia-green outline-none"
            value={newPaket.price}
            onChange={(e) => setNewPaket({...newPaket, price: e.target.value})}
          />
          <button onClick={addPaket} className="nvidia-button shrink-0 flex items-center gap-2">
            <Plus size={16} /> Tambah Paket
          </button>
        </div>

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
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-white">{p.name}</td>
                  <td className="p-4 text-nvidia-green font-bold">Rp {p.price.toLocaleString("id-ID")}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => deletePaket(p.id)} className="text-white/30 hover:text-error transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {(!db.pakets || db.pakets.length === 0) && (
                <tr><td colSpan={3} className="p-8 text-center text-white/30 text-xs uppercase">Belum ada data paket</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
