"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingCart, Coffee, Utensils, Package, Trash2, Check, LayoutGrid, List, Monitor, User, Plus, Minus, X } from "lucide-react";
import type { DatabaseSchema, InventoryItem } from "@/lib/db";
import PinGuard from "@/components/PinGuard";

export default function KasirPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [cart, setCart] = useState<{ product: InventoryItem; qty: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Destination delivery state
  const [targetType, setTargetType] = useState<"walkin" | "pc">("walkin");
  const [selectedPc, setSelectedPc] = useState<string>("");
  const [buyerName, setBuyerName] = useState<string>("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gc_kasir_view_mode") as "grid" | "list" | null;
      if (saved === "grid" || saved === "list") {
        setViewMode(saved);
      } else if (window.innerWidth < 768) {
        setViewMode("list");
      }
    } catch (_) {}
  }, []);

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("gc_kasir_view_mode", mode);
    } catch (_) {}
  };

  const loadData = async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDb(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const addToCart = (product: InventoryItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      if (product.stock <= 0) return prev;
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
  };

  const decrementCart = (id: string) => {
    setCart((prev) =>
      prev
        .map((item) => (item.product.id === id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const handleCheckout = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const targetPcVal = targetType === "pc" ? (selectedPc || "PC-01") : "KASIR";
      const buyerNameVal = buyerName.trim() || (targetType === "pc" ? `Pemain ${targetPcVal}` : "Tamu Kasir");

      const res = await fetch("/api/kasir/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          total,
          target_pc: targetPcVal,
          buyer_name: buyerNameVal
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Gagal memproses pembayaran kasir");
        setLoading(false);
        return;
      }

      setCart([]);
      setBuyerName("");
      await loadData();
      alert("Pembayaran lunas dan stok barang berhasil dipotong");
    } catch (_) {
      alert("Terjadi gangguan koneksi jaringan");
    } finally {
      setLoading(false);
    }
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showConfirm) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowConfirm(false);
          return;
        }
        if (e.key === "Enter" && !loading) {
          e.preventDefault();
          handleCheckout();
          return;
        }
        return;
      }

      if ((e.key === "/" || e.key === "F3") && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === "Escape") {
        if (search) {
          e.preventDefault();
          setSearch("");
        } else if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
        return;
      }

      if (e.key === "F9" && cart.length > 0 && !loading) {
        e.preventDefault();
        setShowConfirm(true);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConfirm, loading, search, cart, total, targetType, selectedPc, buyerName]);

  const cleanName = (name: string) => {
    return name.replace(/\(|\)/g, "").replace(/\//g, " atau ");
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === "food") return "Makanan";
    if (cat === "drink") return "Minuman";
    return "Lainnya";
  };

  if (!db) {
    return (
      <div className="p-8 tracking-tight text-zinc-400 text-xs animate-pulse">
        Memuat data kasir...
      </div>
    );
  }

  const inventoryItems = (db.inventory || []).filter((p: InventoryItem) => {
    if (p.category === "staff_account") return false;
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchSearch = cleanName(p.name).toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const activePcs = db.pcs || [];

  return (
    <PinGuard>
      <div className="min-h-screen bg-[#0d0e11] p-4 md:p-8 pt-16 md:pt-8 text-zinc-100 space-y-6">
        <div className="max-w-[1400px] 2xl:max-w-[1720px] mx-auto flex flex-col xl:flex-row gap-6 items-start">
          
          {/* Sisi Kiri: Katalog Barang */}
          <div className="flex-1 w-full space-y-5">
            
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-hairline/80">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-nvidia-green/10 border border-nvidia-green/30 rounded-xl text-nvidia-green shrink-0">
                  <ShoppingCart size={28} />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl 2xl:text-3xl font-bold text-white tracking-tight">
                    Meja Kasir dan Warung
                  </h1>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Penjualan makanan, minuman, dan inventaris kasir warnet
                  </p>
                </div>
              </div>

              {/* Kontrol Pencarian, Filter Kategori, dan Mode Tampilan */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                
                {/* Input Pencarian dengan Shortcut Badge */}
                <div className="relative w-full sm:w-48 xl:w-56">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Cari barang kasir..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#16171b] border border-hairline pl-3.5 pr-8 py-2 text-xs text-zinc-100 rounded-lg outline-none focus:border-nvidia-green transition"
                  />
                  {search ? (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
                      title="Bersihkan pencarian"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <kbd 
                      className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 bg-white/5 border border-white/10 rounded pointer-events-none"
                      title="Shortcut keyboard tombol garis miring"
                    >
                      /
                    </kbd>
                  )}
                </div>

                {/* Filter Kategori */}
                <div className="bg-[#16171b] border border-hairline/80 p-1 rounded-xl flex gap-1 overflow-x-auto">
                  {(["all", "food", "drink", "other"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                        selectedCategory === cat
                          ? "bg-white/10 text-white border border-white/15 shadow-sm font-bold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {cat === "all" ? "Semua" : cat === "food" ? "Makanan" : cat === "drink" ? "Minuman" : "Lainnya"}
                    </button>
                  ))}
                </div>

                {/* Tombol Pengalih Tampilan Kotak vs Baris */}
                <div className="bg-[#16171b] border border-hairline/80 p-1 rounded-xl flex items-center gap-1">
                  <button
                    onClick={() => handleSetViewMode("grid")}
                    title="Tampilan Kotak Kompak"
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === "grid"
                        ? "bg-nvidia-green text-black font-bold shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    onClick={() => handleSetViewMode("list")}
                    title="Tampilan Baris Cepat"
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === "list"
                        ? "bg-nvidia-green text-black font-bold shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <List size={16} />
                  </button>
                </div>

                {/* Hint Bar Tombol Cepat Keyboard */}
                <div className="hidden lg:flex items-center gap-2 text-[11px] text-zinc-400 bg-[#16171b] border border-hairline/80 px-3 py-1.5 rounded-xl">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-zinc-300 font-semibold">/</kbd> Cari
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-zinc-300 font-semibold">F9</kbd> Bayar
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-zinc-300 font-semibold">Esc</kbd> Reset
                  </span>
                </div>

              </div>
            </div>

            {/* Tampilan 1: Mode Kotak Kompak Berwarna (Grid Tile) */}
            {viewMode === "grid" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
                {inventoryItems.map((p: InventoryItem) => {
                  const inCart = cart.find((c) => c.product.id === p.id)?.qty || 0;
                  const isOutOfStock = p.stock - inCart <= 0;
                  const isFood = p.category === "food";
                  const isDrink = p.category === "drink";

                  return (
                    <button
                      key={p.id}
                      disabled={isOutOfStock}
                      onClick={() => addToCart(p)}
                      className={`relative text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between min-h-[104px] xl:min-h-[110px] overflow-hidden ${
                        isOutOfStock
                          ? "opacity-35 cursor-not-allowed bg-[#141518] border-white/5"
                          : inCart > 0
                          ? "bg-[#16171b] border-nvidia-green shadow-[0_0_12px_rgba(118,185,0,0.15)] ring-1 ring-nvidia-green/40"
                          : isFood
                          ? "bg-[#16171b] border-hairline hover:border-amber-500/60 hover:bg-amber-500/[0.03]"
                          : isDrink
                          ? "bg-[#16171b] border-hairline hover:border-cyan-500/60 hover:bg-cyan-500/[0.03]"
                          : "bg-[#16171b] border-hairline hover:border-purple-500/60 hover:bg-purple-500/[0.03]"
                      }`}
                    >
                      {/* Baris Atas: Kategori dan Stok */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            isFood
                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              : isDrink
                              ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                              : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                          }`}
                        >
                          {isFood ? <Utensils size={11} /> : isDrink ? <Coffee size={11} /> : <Package size={11} />}
                          <span>{getCategoryLabel(p.category)}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {inCart > 0 && (
                            <span className="bg-nvidia-green text-black font-black tabular-nums text-[11px] px-2 py-0.2 rounded-full shadow-sm">
                              x{inCart}
                            </span>
                          )}
                          <span
                            className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md ${
                              p.stock <= 3
                                ? "bg-red-500/20 text-red-300 border border-red-500/30 font-bold"
                                : p.stock <= 5
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-white/5 text-zinc-300 border border-white/10"
                            }`}
                          >
                            {isOutOfStock ? "Habis" : `Stok ${p.stock}`}
                          </span>
                        </div>
                      </div>

                      {/* Baris Bawah: Judul Alami dan Harga */}
                      <div className="mt-2">
                        <h3 className="text-sm font-bold text-zinc-100 tracking-normal line-clamp-1">
                          {cleanName(p.name)}
                        </h3>
                        <p className="text-nvidia-green font-bold text-sm xl:text-base tabular-nums mt-0.5">
                          <span className="text-xs font-semibold mr-0.5">Rp</span>
                          {p.price.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tampilan 2: Mode Baris Cepat (List View) */}
            {viewMode === "list" && (
              <div className="space-y-2">
                {inventoryItems.map((p: InventoryItem) => {
                  const inCart = cart.find((c) => c.product.id === p.id)?.qty || 0;
                  const isOutOfStock = p.stock - inCart <= 0;
                  const isFood = p.category === "food";
                  const isDrink = p.category === "drink";

                  return (
                    <div
                      key={p.id}
                      className={`p-3 px-4 bg-[#16171b] border rounded-xl flex items-center justify-between gap-3 transition-all ${
                        isOutOfStock
                          ? "opacity-40 border-hairline/40"
                          : inCart > 0
                          ? "border-nvidia-green/60 bg-nvidia-green/[0.02]"
                          : "border-hairline hover:border-white/20"
                      }`}
                    >
                      {/* Kiri: Icon Kategori dan Nama */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isFood
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : isDrink
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          }`}
                        >
                          {isFood ? <Utensils size={16} /> : isDrink ? <Coffee size={16} /> : <Package size={16} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-sm font-bold text-zinc-100 truncate">
                              {cleanName(p.name)}
                            </h3>
                            <span
                              className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md shrink-0 ${
                                p.stock <= 3
                                  ? "bg-red-500/20 text-red-300 border border-red-500/30 font-bold"
                                  : "bg-white/5 text-zinc-300 border border-white/10"
                              }`}
                            >
                              {isOutOfStock ? "Habis" : `Sisa ${p.stock}`}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-400 font-medium">
                            {getCategoryLabel(p.category)}
                          </span>
                        </div>
                      </div>

                      {/* Kanan: Harga dan Kontrol Tambah */}
                      <div className="flex items-center gap-3.5 shrink-0">
                        <span className="text-nvidia-green font-bold text-sm xl:text-base tabular-nums">
                          <span className="text-xs font-semibold mr-0.5">Rp</span>
                          {p.price.toLocaleString("id-ID")}
                        </span>

                        {inCart > 0 ? (
                          <div className="flex items-center gap-1.5 bg-[#0d0e11] border border-hairline px-1.5 py-1 rounded-lg">
                            <button
                              onClick={() => decrementCart(p.id)}
                              className="w-5 h-5 flex items-center justify-center text-zinc-300 hover:text-white rounded transition"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-6 text-center tabular-nums font-bold text-xs text-nvidia-green">
                              {inCart}
                            </span>
                            <button
                              onClick={() => addToCart(p)}
                              disabled={isOutOfStock}
                              className="w-5 h-5 flex items-center justify-center text-zinc-300 hover:text-white disabled:opacity-30 rounded transition"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={isOutOfStock}
                            onClick={() => addToCart(p)}
                            className="px-3.5 py-1.5 bg-[#0d0e11] hover:bg-nvidia-green hover:text-black border border-hairline disabled:opacity-30 rounded-lg text-xs font-bold transition"
                          >
                            Tambah
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {inventoryItems.length === 0 && (
              <div className="text-zinc-400 text-xs p-8 text-center bg-[#16171b] border border-hairline rounded-xl">
                Tidak ada barang jualan yang cocok dengan pencarian.
              </div>
            )}

          </div>

          {/* Sisi Kanan: Keranjang Kasir & Konteks Pengantaran */}
          <div className="w-full xl:w-[360px] 2xl:w-[400px] shrink-0 xl:sticky xl:top-6">
            <div className="bg-[#16171b] border border-hairline rounded-2xl p-4 xl:p-5 flex flex-col justify-between shadow-2xl space-y-4">
              
              {/* Header Keranjang */}
              <div className="flex items-center justify-between pb-3 border-b border-hairline">
                <h2 className="font-bold text-sm xl:text-base text-white flex items-center gap-2 tracking-tight">
                  <ShoppingCart size={18} className="text-nvidia-green" />
                  <span>Keranjang Kasir</span>
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-red-400 font-bold hover:underline"
                  >
                    Kosongkan
                  </button>
                )}
              </div>

              {/* Konteks Target Pesanan Kasir */}
              <div className="space-y-2.5 bg-[#0d0e11] border border-hairline p-3 rounded-xl">
                <span className="text-xs font-semibold text-zinc-400 block">
                  Tujuan Pesanan
                </span>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetType("walkin")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      targetType === "walkin"
                        ? "bg-white/10 text-white border border-white/20 shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <User size={14} />
                    <span>Bawa Sendiri</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("pc")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      targetType === "pc"
                        ? "bg-nvidia-green text-black font-bold shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Monitor size={14} />
                    <span>Antar ke PC</span>
                  </button>
                </div>

                {targetType === "pc" && (
                  <div className="pt-1 space-y-1.5">
                    <label className="text-xs text-zinc-400 font-semibold block">
                      Pilih Nomor PC
                    </label>
                    <select
                      value={selectedPc}
                      onChange={(e) => setSelectedPc(e.target.value)}
                      className="w-full bg-[#16171b] border border-hairline p-2 rounded-lg text-xs text-white focus:border-nvidia-green outline-none"
                    >
                      <option value="">Pilih PC Pemesan</option>
                      {activePcs.map((pc) => (
                        <option key={pc.id} value={pc.id}>
                          {pc.name} • {pc.status === "occupied" ? "Sedang Main" : "Tersedia"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Daftar Barang di Keranjang */}
              {cart.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-500 text-xs space-y-2 border border-dashed border-white/10 rounded-xl">
                  <ShoppingCart size={32} className="opacity-40" />
                  <span>Keranjang Masih Kosong</span>
                </div>
              ) : (
                <div className="max-h-[260px] overflow-y-auto divide-y divide-hairline pr-1 space-y-2.5 custom-scrollbar">
                  {cart.map((item) => (
                    <div key={item.product.id} className="pt-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className="font-bold text-zinc-100 text-xs xl:text-sm truncate">
                          {cleanName(item.product.name)}
                        </h4>
                        <p className="text-nvidia-green font-bold text-xs xl:text-sm tabular-nums mt-0.5">
                          <span className="text-[10px] font-semibold mr-0.5">Rp</span>
                          {(item.product.price * item.qty).toLocaleString("id-ID")}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => decrementCart(item.product.id)}
                          className="w-6 h-6 flex items-center justify-center bg-[#0d0e11] border border-hairline text-zinc-300 hover:bg-white/10 font-bold text-xs transition rounded-lg"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-xs text-white">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => addToCart(item.product)}
                          disabled={item.qty >= item.product.stock}
                          className="w-6 h-6 flex items-center justify-center bg-[#0d0e11] border border-hairline text-zinc-300 hover:bg-white/10 font-bold text-xs transition rounded-lg disabled:opacity-30"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-zinc-400 hover:text-red-400 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total dan Tombol Bayar */}
              <div className="pt-3 border-t border-hairline space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400 font-semibold">
                    Total Pembayaran
                  </span>
                  <span className="text-2xl xl:text-3xl font-extrabold text-nvidia-green tabular-nums">
                    <span className="text-base font-bold mr-1">Rp</span>
                    {total.toLocaleString("id-ID")}
                  </span>
                </div>

                <button
                  disabled={cart.length === 0 || loading}
                  onClick={() => setShowConfirm(true)}
                  className="w-full py-3 bg-nvidia-green hover:bg-[#88d600] disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_20px_rgba(118,185,0,0.25)] flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>{loading ? "Memproses..." : "Bayar Cash Lunas"}</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-black/20 text-black/80 font-bold rounded border border-black/20" title="Shortcut keyboard F9">
                    F9
                  </kbd>
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Modal Konfirmasi Pembayaran */}
        {showConfirm && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#141518] border border-white/10 rounded-2xl p-5 md:p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-nvidia-green bg-nvidia-green/10 border border-nvidia-green/20 px-2 py-0.5 rounded-full">
                  Kasir F&B
                </span>
                <h2 className="text-base font-bold text-white tracking-tight mt-2">
                  Konfirmasi Pembayaran
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  {cart.length} item • Total: Rp {total.toLocaleString("id-ID")}
                </p>
                <div className="text-xs text-zinc-400 mt-1">
                  Tujuan: <strong className="text-white">{targetType === "pc" ? `Antar ke ${selectedPc || "Meja PC"}` : "Bawa Sendiri"}</strong>
                </div>
              </div>

              <div className="border border-hairline divide-y divide-hairline rounded-xl max-h-48 overflow-y-auto bg-[#0d0e11] custom-scrollbar">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between px-3 py-2 text-xs">
                    <span className="text-zinc-200">{cleanName(item.product.name)} ×{item.qty}</span>
                    <span className="text-nvidia-green font-bold tabular-nums">
                      <span className="text-[10px] font-semibold mr-0.5">Rp</span>
                      {(item.product.price * item.qty).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                <span>Enter konfirmasi lunas</span>
                <span>Esc batal</span>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 bg-[#1a1b20] border border-hairline text-zinc-300 hover:text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition"
                >
                  <span>Batal</span>
                  <kbd className="px-1.5 py-0.2 bg-white/10 text-zinc-400 text-[10px] rounded font-semibold">Esc</kbd>
                </button>
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-nvidia-green hover:bg-[#88d600] disabled:opacity-50 text-black rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <Check size={16} />
                  <span>{loading ? "Memproses..." : "Lunas"}</span>
                  <kbd className="px-1.5 py-0.2 bg-black/20 text-black text-[10px] rounded font-semibold">Enter</kbd>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PinGuard>
  );
}
