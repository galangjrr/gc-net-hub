"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Monitor,
  ShoppingCart,
  TrendingUp,
  ClipboardList,
  Circle,
  Plus,
  Minus,
  Trash2,
  Search,
  Sparkles,
  DollarSign,
} from "lucide-react";
import { useDebounce } from "use-debounce";

/* ── Mock Data ── */
const ADMIN_PCS = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `PC ${String(i + 1).padStart(2, "0")}`,
  status: [1, 4, 7].includes(i) ? ("occupied" as const) : ("available" as const),
  player: [1, 4, 7].includes(i) ? ["Agus", "Budi", "Citra"][Math.floor(i / 3)] : null,
  time_left: [1, 4, 7].includes(i) ? `${2 + i}:15:00` : null,
}));

const MOCK_ITEMS = [
  { id: 1, name: "Es Teh Manis", price: 5000, category: "Minuman" },
  { id: 2, name: "Kopi Hitam", price: 7000, category: "Minuman" },
  { id: 3, name: "Mie Goreng", price: 12000, category: "Makanan" },
  { id: 4, name: "Nasi Goreng", price: 15000, category: "Makanan" },
  { id: 5, name: "Gorengan (5 pcs)", price: 10000, category: "Makanan" },
  { id: 6, name: "Aqua 600ml", price: 4000, category: "Minuman" },
  { id: 7, name: "Pop Mie", price: 8000, category: "Makanan" },
  { id: 8, name: "Teh Botol", price: 5000, category: "Minuman" },
];

const MOCK_DAILY = {
  totalWarnet: 450000,
  totalFnb: 230000,
  totalTrx: 48,
  pcUsageHours: 64,
};

type CartItem = { id: number; name: string; price: number; qty: number };

const TABS = [
  { key: "warnet", label: "Warnet", icon: Monitor },
  { key: "pos", label: "POS F&B", icon: ShoppingCart },
  { key: "analytics", label: "AI Analytics", icon: TrendingUp },
  { key: "report", label: "Laporan", icon: ClipboardList },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("warnet");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch] = useDebounce(searchText, 300);

  /* POS helpers */
  const addToCart = (item: (typeof MOCK_ITEMS)[number]) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c)).filter((c) => c.qty > 0)
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const filteredItems = MOCK_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12 md:py-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-medium tracking-tight">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-900/80 rounded-xl border border-white/[0.06] overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="admin-tab"
                    className="absolute inset-0 bg-white/[0.08] rounded-lg border border-white/[0.06]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon size={14} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ══════ WARNET TAB ══════ */}
        {activeTab === "warnet" && (
          <motion.div
            key="warnet"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="glass-panel p-6 md:p-8 rounded-2xl"
          >
            <div className="flex-1 min-w-0 mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase flex items-center gap-3">
                Admin Dashboard <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-[10px] rounded border border-amber-500/50">WIP</span>
              </h1>
              <p className="text-white/50 text-xs md:text-sm tracking-tight mt-1 uppercase tracking-widest hidden md:block">
                Management System & Analytics (Mock Data)
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {ADMIN_PCS.map((pc) => {
                const isOccupied = pc.status === "occupied";
                return (
                  <button
                    key={pc.id}
                    className={`relative rounded-xl border p-4 text-left transition-all min-h-[100px] flex flex-col justify-between group ${
                      isOccupied
                        ? "bg-amber-500/[0.06] border-amber-500/20"
                        : "bg-zinc-900/60 border-white/[0.06] hover:border-cyan-500/40 hover:bg-cyan-500/[0.04] cursor-pointer"
                    }`}
                    onClick={() => {
                      if (!isOccupied) alert(`Mock: PC ${pc.name} diaktifkan! Timer mulai.`);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <span className="tracking-tight text-xs text-zinc-400">{pc.name}</span>
                      <Circle
                        size={8}
                        className={isOccupied ? "text-amber-500 fill-amber-500" : "text-cyan-500 fill-cyan-500 animate-pulse-glow"}
                      />
                    </div>
                    {isOccupied && pc.player && (
                      <div className="mt-3">
                        <div className="text-xs text-zinc-300">{pc.player}</div>
                        <div className="text-[10px] tracking-tight text-amber-400/70">{pc.time_left}</div>
                      </div>
                    )}
                    {!isOccupied && (
                      <div className="mt-3 text-[10px] text-zinc-600 group-hover:text-cyan-500/60 transition-colors">
                        Klik untuk aktifkan
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══════ POS TAB ══════ */}
        {activeTab === "pos" && (
          <motion.div
            key="pos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            {/* Menu */}
            <div className="lg:col-span-2 glass-panel p-6 md:p-8 rounded-2xl">
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3">Menu F&B</h2>
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Cari menu..."
                    className="w-full bg-zinc-950/60 border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/[0.04] bg-zinc-900/40 hover:border-white/[0.1] hover:bg-zinc-900/60 transition-all text-left group"
                  >
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-zinc-600">{item.category}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tracking-tight text-zinc-400">
                        Rp {item.price.toLocaleString("id-ID")}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-colors">
                        <Plus size={12} className="text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
                {filteredItems.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-sm text-zinc-600">
                    Tidak ada item ditemukan.
                  </div>
                )}
              </div>
            </div>

            {/* Cart */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <ShoppingCart size={16} className="text-cyan-400" />
                Keranjang
                {cart.length > 0 && (
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded ml-auto">
                    {cart.reduce((s, c) => s + c.qty, 0)} item
                  </span>
                )}
              </h3>

              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-zinc-700">
                  Keranjang kosong
                </div>
              ) : (
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-white/[0.04]">
                      <div>
                        <div className="text-xs font-medium">{item.name}</div>
                        <div className="text-[10px] tracking-tight text-zinc-500">
                          Rp {(item.price * item.qty).toLocaleString("id-ID")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors">
                          {item.qty === 1 ? <Trash2 size={10} className="text-red-400" /> : <Minus size={10} className="text-zinc-400" />}
                        </button>
                        <span className="text-xs tracking-tight w-6 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors">
                          <Plus size={10} className="text-zinc-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <div className="border-t border-white/[0.06] pt-4 mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-zinc-500">Total</span>
                    <span className="tracking-tight text-sm text-cyan-400">Rp {cartTotal.toLocaleString("id-ID")}</span>
                  </div>
                  <button
                    onClick={() => {
                      alert(`Mock: Transaksi Rp ${cartTotal.toLocaleString("id-ID")} berhasil.`);
                      setCart([]);
                    }}
                    className="w-full bg-cyan-500 text-zinc-950 font-semibold rounded-xl py-3 text-sm hover:bg-cyan-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <DollarSign size={16} />
                    Bayar
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════ AI ANALYTICS TAB ══════ */}
        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="glass-panel p-6 md:p-8 rounded-2xl min-h-[400px] flex flex-col items-center justify-center text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
              <Sparkles size={28} className="text-cyan-400 animate-float" />
            </div>
            <h2 className="text-lg font-medium mb-2">Gemini AI Analytics</h2>
            <p className="text-sm text-zinc-500 max-w-sm">
              Insight otomatis dari data omzet, pemakaian PC, dan stok F&B. Menunggu integrasi backend di Step 3.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {["Ringkasan Omzet", "Trend Harian", "Rekomendasi Stok", "Peak Hours"].map((f) => (
                <span key={f} className="text-[11px] text-zinc-600 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full">
                  {f}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ══════ REPORT TAB ══════ */}
        {activeTab === "report" && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="glass-panel p-6 md:p-8 rounded-2xl"
          >
            <h2 className="text-lg font-medium mb-6">Rekap Harian</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl bg-zinc-950/40 border border-white/[0.04] p-5">
                <div className="text-xs text-zinc-500 mb-2">Omzet Warnet</div>
                <div className="text-xl font-semibold tracking-tight text-cyan-400">
                  Rp {MOCK_DAILY.totalWarnet.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-950/40 border border-white/[0.04] p-5">
                <div className="text-xs text-zinc-500 mb-2">Omzet F&B</div>
                <div className="text-xl font-semibold tracking-tight text-cyan-400">
                  Rp {MOCK_DAILY.totalFnb.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-950/40 border border-white/[0.04] p-5">
                <div className="text-xs text-zinc-500 mb-2">Total Transaksi</div>
                <div className="text-xl font-semibold">{MOCK_DAILY.totalTrx}</div>
              </div>
              <div className="rounded-xl bg-zinc-950/40 border border-white/[0.04] p-5">
                <div className="text-xs text-zinc-500 mb-2">Jam Pemakaian PC</div>
                <div className="text-xl font-semibold">{MOCK_DAILY.pcUsageHours} jam</div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-zinc-950/40 border border-white/[0.04] p-5">
              <div className="text-xs text-zinc-500 mb-3">Grand Total Hari Ini</div>
              <div className="text-3xl font-semibold tracking-tight text-gradient">
                Rp {(MOCK_DAILY.totalWarnet + MOCK_DAILY.totalFnb).toLocaleString("id-ID")}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
