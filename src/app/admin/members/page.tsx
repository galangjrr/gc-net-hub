"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  User, 
  Search, 
  RotateCw, 
  Coins, 
  Plus, 
  Pencil, 
  Trash2, 
  Phone, 
  Mail, 
  Monitor, 
  Check, 
  X, 
  AlertCircle, 
  CreditCard,
  Calendar,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import PinGuard from "@/components/PinGuard";

interface Member {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  balance: number;
  gc_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface MemberStats {
  totalMembers: number;
  totalDeposit: number;
  newThisMonth: number;
}

export default function MemberManagementPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<MemberStats>({ totalMembers: 0, totalDeposit: 0, newThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Top Up Modal State
  const [topUpMember, setTopUpMember] = useState<Member | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(20000);
  const [customTopUpInput, setCustomTopUpInput] = useState<string>("20000");
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);

  // Edit Modal State
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGcUserId, setEditGcUserId] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Confirm State
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMembers = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/members", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal mengambil data member dari server");
      const data = await res.json();
      setMembers(data.members || []);
      setStats(data.stats || { totalMembers: 0, totalDeposit: 0, newThisMonth: 0 });
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat memuat data member");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter((m) =>
      (m.username || "").toLowerCase().includes(q) ||
      (m.full_name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q) ||
      (m.phone || "").toLowerCase().includes(q) ||
      (m.gc_user_id || "").toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  // Handle Top Up
  const handleOpenTopUp = (member: Member) => {
    setTopUpMember(member);
    setTopUpAmount(20000);
    setCustomTopUpInput("20000");
  };

  const handleSelectPreset = (amount: number) => {
    setTopUpAmount(amount);
    setCustomTopUpInput(amount.toString());
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomTopUpInput(val);
    const parsed = parseInt(val.replace(/\D/g, ""), 10);
    setTopUpAmount(isNaN(parsed) ? 0 : parsed);
  };

  const submitTopUp = async () => {
    if (!topUpMember || topUpAmount === 0) return;
    setIsSubmittingTopUp(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: topUpMember.id,
          action: "topup",
          amount: topUpAmount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memproses top up saldo");
      }

      setTopUpMember(null);
      await loadMembers();
    } catch (err: any) {
      alert(err.message || "Gagal memproses top up");
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  // Handle Edit Profile
  const handleOpenEdit = (member: Member) => {
    setEditMember(member);
    setEditFullName(member.full_name || "");
    setEditPhone(member.phone || "");
    setEditGcUserId(member.gc_user_id || "");
  };

  const submitEdit = async () => {
    if (!editMember) return;
    setIsSubmittingEdit(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editMember.id,
          action: "update_profile",
          full_name: editFullName,
          phone: editPhone,
          gc_user_id: editGcUserId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memperbarui profil member");
      }

      setEditMember(null);
      await loadMembers();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui data member");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete
  const confirmDelete = async () => {
    if (!deletingMember) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingMember.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus member");
      }

      setDeletingMember(null);
      await loadMembers();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus member");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PinGuard>
      <div className="min-h-screen bg-canvas text-primary pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-surface-soft border border-hairline flex items-center justify-center text-nvidia-green">
                <Users size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Kelola Data Member
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Database pelanggan warnet, pemantauan saldo deposit kasir, dan penautan akun billing.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadMembers(true)}
              disabled={isRefreshing}
              aria-label="Segarkan data member"
              className="px-3.5 py-2 rounded-xl bg-surface-soft hover:bg-white/10 border border-hairline text-zinc-200 text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
            >
              <RotateCw size={13} className={isRefreshing ? "animate-spin text-nvidia-green" : ""} />
              {isRefreshing ? "Memperbarui..." : "Segarkan"}
            </button>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-surface-1 border border-hairline/60 space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Total Member
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
                {stats.totalMembers}
              </span>
              <span className="text-xs text-zinc-400 font-medium">pelanggan terdaftar</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-1 border border-hairline/60 space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Total Saldo Mengendap
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-nvidia-green tabular-nums tracking-tight">
                Rp {stats.totalDeposit.toLocaleString("id-ID")}
              </span>
              <span className="text-xs text-zinc-400 font-medium">deposit aktif</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-1 border border-hairline/60 space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Member Baru Bulan Ini
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
                {stats.newThisMonth}
              </span>
              <span className="text-xs text-zinc-400 font-medium">registrasi baru</span>
            </div>
          </div>
        </div>

        {/* SEARCH CONTROLS */}
        <div className="p-3.5 rounded-2xl bg-surface-1 border border-hairline/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari username, nama, no HP, email..."
              aria-label="Cari member berdasarkan username atau kontak"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface-soft border border-hairline text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green transition"
            />
          </div>

          <span className="text-zinc-400 font-medium self-end sm:self-center">
            Menampilkan <strong className="text-white">{filteredMembers.length}</strong> dari {members.length} member
          </span>
        </div>

        {/* 4 UI STATES */}

        {/* 1. LOADING STATE */}
        {loading && (
          <div className="rounded-2xl bg-surface-1 border border-hairline/60 p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between gap-4 py-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-soft" />
                  <div className="space-y-1.5">
                    <div className="w-32 h-4 bg-surface-soft rounded" />
                    <div className="w-48 h-3 bg-surface-soft/60 rounded" />
                  </div>
                </div>
                <div className="w-24 h-6 bg-surface-soft rounded-md" />
                <div className="w-28 h-8 bg-surface-soft rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* 2. ERROR STATE */}
        {!loading && error && (
          <div className="p-8 rounded-2xl bg-surface-1 border border-red-500/20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle size={22} />
            </div>
            <h3 className="font-bold text-white text-base">Gagal Memuat Data Member</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => loadMembers(true)}
              className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* 3. EMPTY STATE */}
        {!loading && !error && filteredMembers.length === 0 && (
          <div className="p-12 rounded-2xl bg-surface-1 border border-hairline/60 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-soft border border-hairline text-zinc-400 flex items-center justify-center mx-auto">
              <Users size={22} />
            </div>
            <h3 className="font-bold text-white text-base">Belum Ada Member Ditemukan</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {searchQuery ? "Tidak ada member yang cocok dengan kata kunci pencarian." : "Belum ada pelanggan yang mendaftar sebagai member warnet."}
            </p>
          </div>
        )}

        {/* 4. SUCCESS STATE: MEMBERS TABLE */}
        {!loading && !error && filteredMembers.length > 0 && (
          <div className="rounded-2xl bg-surface-1 border border-hairline/60 overflow-hidden shadow-lg">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-hairline text-zinc-400 uppercase tracking-wider text-[11px] font-bold bg-surface-soft/40">
                    <th scope="col" className="py-3.5 pl-6 pr-4 w-[26%]">Member</th>
                    <th scope="col" className="py-3.5 px-4 w-[18%]">Kontak</th>
                    <th scope="col" className="py-3.5 px-4 w-[18%]">Saldo Deposit</th>
                    <th scope="col" className="py-3.5 px-4 w-[16%]">Akun Billing</th>
                    <th scope="col" className="py-3.5 pr-6 pl-4 text-right w-[22%]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredMembers.map((m) => {
                    const joinDate = new Date(m.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    });

                    return (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition">
                        {/* Member Profile */}
                        <td className="py-3.5 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-surface-soft border border-hairline flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {m.username.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-white text-sm truncate">
                                {m.full_name || m.username}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-medium">
                                @{m.username} • {joinDate}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Kontak */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            {m.phone ? (
                              <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
                                <Phone size={11} className="text-zinc-400" />
                                {m.phone}
                              </span>
                            ) : (
                              <span className="text-zinc-500 italic">No HP belum ada</span>
                            )}
                            <span className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5">
                              <Mail size={11} className="text-zinc-400" />
                              {m.email}
                            </span>
                          </div>
                        </td>

                        {/* Saldo Deposit */}
                        <td className="py-3.5 px-4 tabular-nums">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${m.balance > 0 ? "text-nvidia-green" : "text-zinc-400"}`}>
                              Rp {Number(m.balance).toLocaleString("id-ID")}
                            </span>
                            <button
                              onClick={() => handleOpenTopUp(m)}
                              aria-label={`Top up saldo ${m.username}`}
                              className="px-2 py-1 rounded-md bg-nvidia-green/15 hover:bg-nvidia-green/25 border border-nvidia-green/30 text-nvidia-green text-[10px] font-bold uppercase transition"
                            >
                              + Top Up
                            </button>
                          </div>
                        </td>

                        {/* Akun Billing PC */}
                        <td className="py-3.5 px-4">
                          {m.gc_user_id ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold text-xs">
                              <Monitor size={11} /> {m.gc_user_id}
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-500 italic">
                              Belum ditautkan
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 pr-6 pl-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(m)}
                              aria-label={`Ubah profil ${m.username}`}
                              className="p-2 rounded-lg bg-surface-soft hover:bg-white/10 text-white/70 hover:text-white border border-hairline transition"
                              title="Ubah Profil Member"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeletingMember(m)}
                              aria-label={`Hapus member ${m.username}`}
                              className="p-2 rounded-lg bg-surface-soft hover:bg-red-500/20 text-white/60 hover:text-red-400 border border-hairline transition"
                              title="Hapus Member"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="lg:hidden divide-y divide-white/[0.05]">
              {filteredMembers.map((m) => (
                <div key={m.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface-soft border border-hairline flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {m.username.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white text-sm truncate">{m.full_name || m.username}</span>
                        <span className="text-xs text-zinc-400">@{m.username}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase block">Saldo</span>
                      <span className="font-bold text-sm text-nvidia-green tabular-nums">
                        Rp {Number(m.balance).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.04] text-xs">
                    <div className="flex items-center gap-3 text-zinc-400">
                      {m.phone && <span className="flex items-center gap-1"><Phone size={11} /> {m.phone}</span>}
                      {m.gc_user_id ? (
                        <span className="text-cyan-400 font-semibold flex items-center gap-1"><Monitor size={11} /> {m.gc_user_id}</span>
                      ) : (
                        <span className="italic text-zinc-500">Tanpa ID Billing</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenTopUp(m)}
                        className="px-2.5 py-1 rounded-md bg-nvidia-green/15 text-nvidia-green font-bold text-xs border border-nvidia-green/30"
                      >
                        + Top Up
                      </button>
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="p-1.5 rounded-md bg-surface-soft text-zinc-300 border border-hairline"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => setDeletingMember(m)}
                        className="p-1.5 rounded-md bg-surface-soft text-red-400 border border-hairline"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL TOP UP SALDO */}
        <AnimatePresence>
          {topUpMember && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-surface-1 border border-hairline rounded-2xl p-5 space-y-4 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-white">Top Up Saldo Member</h2>
                    <p className="text-xs text-zinc-400">
                      Pelanggan: <strong className="text-white">@{topUpMember.username}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setTopUpMember(null)}
                    aria-label="Tutup modal top up"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-soft border border-hairline/60 flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium">Saldo Saat Ini</span>
                  <span className="text-sm font-bold text-white tabular-nums">
                    Rp {Number(topUpMember.balance).toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Pilih Nominal Cepat
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[10000, 20000, 50000, 100000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => handleSelectPreset(nominal)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold tabular-nums transition ${
                          topUpAmount === nominal
                            ? "bg-nvidia-green text-black border-nvidia-green shadow-sm"
                            : "bg-surface-soft border-hairline text-zinc-200 hover:bg-white/10"
                        }`}
                      >
                        + Rp {nominal.toLocaleString("id-ID")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Nominal Kustom (Rupiah)
                  </label>
                  <input
                    type="text"
                    value={customTopUpInput}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="Contoh: 35000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-soft border border-hairline text-white font-bold text-sm focus:outline-none focus:border-nvidia-green"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline/60">
                  <button
                    type="button"
                    onClick={() => setTopUpMember(null)}
                    className="px-4 py-2 bg-surface-soft hover:bg-white/10 text-zinc-300 text-xs font-bold rounded-xl border border-hairline transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingTopUp || topUpAmount === 0}
                    onClick={submitTopUp}
                    className="px-5 py-2 bg-nvidia-green hover:bg-[#88d600] disabled:opacity-50 text-black text-xs font-bold rounded-xl shadow-sm transition"
                  >
                    {isSubmittingTopUp ? "Menyimpan..." : "Konfirmasi Top Up"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL EDIT PROFIL */}
        <AnimatePresence>
          {editMember && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-surface-1 border border-hairline rounded-2xl p-5 space-y-4 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-white">Ubah Data Member</h2>
                    <p className="text-xs text-zinc-400">
                      Akun: <strong className="text-white">@{editMember.username}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setEditMember(null)}
                    aria-label="Tutup modal ubah member"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 block">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Nama lengkap member"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-soft border border-hairline text-white text-xs focus:outline-none focus:border-nvidia-green"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 block">
                      Nomor HP / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="0812xxxx"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-soft border border-hairline text-white text-xs focus:outline-none focus:border-nvidia-green"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 block">
                      ID Akun Billing PC
                    </label>
                    <input
                      type="text"
                      value={editGcUserId}
                      onChange={(e) => setEditGcUserId(e.target.value)}
                      placeholder="Username akun billing Cyberindo"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-soft border border-hairline text-white text-xs focus:outline-none focus:border-nvidia-green"
                    />
                    <span className="text-[11px] text-zinc-500 block">
                      Tautkan dengan ID akun billing pemain untuk integrasi otomatis.
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline/60">
                  <button
                    type="button"
                    onClick={() => setEditMember(null)}
                    className="px-4 py-2 bg-surface-soft hover:bg-white/10 text-zinc-300 text-xs font-bold rounded-xl border border-hairline transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingEdit}
                    onClick={submitEdit}
                    className="px-5 py-2 bg-nvidia-green hover:bg-[#88d600] disabled:opacity-50 text-black text-xs font-bold rounded-xl shadow-sm transition"
                  >
                    {isSubmittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL KONFIRMASI HAPUS */}
        <AnimatePresence>
          {deletingMember && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-surface-1 border border-red-500/30 rounded-2xl p-5 space-y-4 shadow-2xl text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Hapus Member</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Yakin ingin menghapus member <strong className="text-white">@{deletingMember.username}</strong>? Seluruh catatan profil akan dihapus permanen.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingMember(null)}
                    className="flex-1 py-2 bg-surface-soft hover:bg-white/10 text-zinc-300 text-xs font-bold rounded-xl border border-hairline transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={confirmDelete}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition"
                  >
                    {isDeleting ? "Menghapus..." : "Hapus Permanen"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PinGuard>
  );
}
