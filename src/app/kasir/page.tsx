"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Coffee, Utensils, Package, Trash2, Check } from "lucide-react";
import { motion } from "motion/react";
import type { DatabaseSchema, InventoryItem } from "@/lib/db";

export default function KasirPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [cart, setCart] = useState<{product: InventoryItem, qty: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  const addToCart = (product: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev; // Cannot add more than stock
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      if (product.stock <= 0) return prev;
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const decrementCart = (id: string) => {
    setCart(prev => prev
      .map(item => item.product.id === id ? { ...item, qty: item.qty - 1 } : item)
      .filter(item => item.qty > 0)
    );
  };

  const handleCheckout = async () => {
    setShowConfirm(false);
    setLoading(true);
    await fetch("/api/kasir/checkout", {
      method: "POST",
      body: JSON.stringify({ cart, total })
    });
    setCart([]);
    await loadData();
    setLoading(false);
    alert("Pembayaran lunas! Stok berhasil dipotong.");
  };

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);

  if (!db) return <div className="p-8 tracking-tight text-white/50 uppercase text-xs">Loading Database...</div>;

  return (
    <div className="bg-surface-dark p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-8">
        
        {/* Left: Product Grid */}
        <div className="flex-1 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-hairline">
            <div className="flex items-center gap-4">
              <ShoppingCart size={32} className="text-nvidia-green" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-tight">Meja Kasir / Warung</h1>
                <p className="text-white/60 tracking-tight text-xs md:text-sm mt-1">&gt; PENJUALAN F&B & BARANG KASIR</p>
              </div>
            </div>

            {/* Search & Category Filter */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Cari barang..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-surface-dark border border-hairline px-3 py-2 text-xs text-white rounded-[2px] outline-none focus:border-nvidia-green w-full md:w-48"
              />
              <div className="flex gap-1 overflow-x-auto w-full md:w-auto">
                {['all', 'food', 'drink', 'other'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-2 text-[10px] font-bold uppercase rounded-[2px] border transition-colors ${
                      selectedCategory === cat 
                        ? 'bg-nvidia-green text-black border-nvidia-green' 
                        : 'bg-surface-dark text-white/50 border-hairline hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? 'Semua' : cat === 'food' ? 'Makanan' : cat === 'drink' ? 'Minuman' : 'Lainnya'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {db.inventory
              ?.filter((p: InventoryItem) => {
                if (p.category === 'staff_account') return false;
                const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
                const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
                return matchCat && matchSearch;
              })
              .map((p: InventoryItem) => {
                const inCart = cart.find(c => c.product.id === p.id)?.qty || 0;
                const isOutOfStock = p.stock - inCart <= 0;
                return (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p)}
                    className={`nvidia-card p-3 md:p-4 text-left transition-all group h-[130px] md:h-[140px] flex flex-col relative overflow-hidden ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-surface-soft border-error-deep' : 'hover:bg-surface-soft hover:border-white/30'}`}
                  >
                    <div className="nvidia-corner"></div>
                    <div className="flex justify-between items-start mb-auto">
                      <div className="flex items-center gap-2">
                        {p.category === 'food' ? <Utensils size={18} className="text-white/50" /> : p.category === 'drink' ? <Coffee size={18} className="text-white/50" /> : <Package size={18} className="text-white/50" />}
                        <span className="text-[10px] uppercase tracking-tight font-bold text-white/40">{p.category}</span>
                      </div>
                      <div className={`text-[10px] uppercase font-bold tracking-tight px-2 py-0.5 rounded-[2px] ${p.stock <= 5 ? 'bg-error-deep text-white' : 'bg-surface-soft text-white/60'}`}>
                        STOK: {p.stock}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight uppercase mt-4 line-clamp-2">{p.name}</h3>
                      <p className="text-nvidia-green tracking-tight font-bold mt-1">RP {p.price.toLocaleString("id-ID")}</p>
                    </div>
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-surface-dark/80 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="text-error font-bold tracking-tight text-xs uppercase bg-error-deep/20 px-3 py-1 rounded-[2px]">HABIS BOSS</span>
                      </div>
                    )}
                  </button>
                );
              })}
            {(!db.inventory || db.inventory.length === 0) && (
              <div className="col-span-3 text-white/40 text-xs tracking-tight uppercase">Belum ada stok barang. Tambahkan di menu Stok Kasir.</div>
            )}
          </div>
        </div>

        {/* Right Cart Section */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          <div className="nvidia-card p-6 flex flex-col h-[550px] relative">
            <div className="nvidia-corner"></div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-hairline">
              <h2 className="font-bold tracking-tight text-white flex items-center gap-2 uppercase">
                <ShoppingCart size={18} /> Keranjang Kasir
              </h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-[10px] text-error uppercase font-bold hover:underline">
                  KOSONGKAN
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-xs tracking-tight uppercase">
                <ShoppingCart size={32} className="mb-2 opacity-50" />
                Keranjang Kosong
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-hairline pr-1 space-y-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="pt-3 flex items-center justify-between tracking-tight">
                    <div className="flex-1 pr-2">
                      <h4 className="font-bold text-white text-xs uppercase line-clamp-1">{item.product.name}</h4>
                      <p className="text-nvidia-green font-bold text-xs mt-0.5">RP {(item.product.price * item.qty).toLocaleString("id-ID")}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => decrementCart(item.product.id)}
                        className="w-7 h-7 flex items-center justify-center border border-hairline text-white/70 hover:bg-white/10 font-bold text-sm transition-colors rounded-[2px]"
                      >−</button>
                      <span className="w-6 text-center font-bold text-xs text-white">{item.qty}</span>
                      <button
                        onClick={() => addToCart(item.product)}
                        className="w-7 h-7 flex items-center justify-center border border-hairline text-white/70 hover:bg-white/10 font-bold text-sm transition-colors rounded-[2px]"
                      >+</button>
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-7 h-7 flex items-center justify-center text-white/30 hover:text-red-500 transition-colors ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-hairline pt-4 mt-4">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm tracking-tight text-white/60 font-bold uppercase">Total Tagihan</span>
                <span className="text-2xl font-bold text-white">RP {total.toLocaleString("id-ID")}</span>
              </div>
              <button 
                disabled={cart.length === 0 || loading}
                className={`w-full nvidia-button ${cart.length === 0 || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setShowConfirm(true)}
              >
                {loading ? 'MEMPROSES...' : 'BAYAR CASH / LUNAS'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="nvidia-card p-6 w-full max-w-sm">
            <div className="nvidia-corner"></div>
            <h2 className="text-lg font-bold tracking-tight text-white mb-2 uppercase">Konfirmasi Pembayaran</h2>
            <p className="text-white/60 tracking-tight text-xs mb-4 uppercase">{cart.length} item • Total: RP {total.toLocaleString("id-ID")}</p>
            <div className="border border-hairline divide-y divide-hairline mb-6 max-h-40 overflow-y-auto">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between px-3 py-2 tracking-tight text-xs">
                  <span className="text-white/70">{item.product.name} ×{item.qty}</span>
                  <span className="text-nvidia-green font-bold">RP {(item.product.price * item.qty).toLocaleString("id-ID")}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 border border-hairline text-white/50 hover:text-white tracking-tight font-bold text-xs uppercase transition-colors">BATAL</button>
              <button onClick={handleCheckout} className="flex-1 py-3 nvidia-button text-xs uppercase flex items-center justify-center gap-1.5">
                <Check size={16} /> LUNAS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
