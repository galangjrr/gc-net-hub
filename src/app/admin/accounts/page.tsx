"use client";

import { useState, useEffect } from "react";
import { User, Key, ShieldCheck, Plus, Trash, PencilSimple, CheckCircle, XCircle, ArrowLeft, Lock } from "@phosphor-icons/react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import PinGuard from "@/components/PinGuard";

interface Account {
  id: string;
  username: string;
  role: 'owner' | 'admin' | 'operator';
  fullName: string;
  createdAt: string;
  active: boolean;
}

export default function AccountsManagementPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<Account | null>(null);

  // Form states
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formRole, setFormRole] = useState<'owner' | 'admin' | 'operator'>('operator');
  const [formActive, setFormActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreate = async () => {
    setErrorMsg("");
    if (!formUsername || !formPassword) {
      setErrorMsg("Username dan Password wajib diisi!");
      return;
    }

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formUsername,
          password: formPassword,
          fullName: formFullName,
          role: formRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal membuat akun.");
        return;
      }

      setShowAddModal(false);
      setFormUsername("");
      setFormPassword("");
      setFormFullName("");
      setFormRole("operator");
      loadAccounts();
    } catch (_) {
      setErrorMsg("Terjadi kesalahan jaringan.");
    }
  };

  const handleUpdate = async () => {
    if (!selectedAcc) return;
    setErrorMsg("");

    try {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAcc.id,
          password: formPassword || undefined,
          fullName: formFullName,
          role: formRole,
          active: formActive
        })
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || "Gagal mengupdate akun.");
        return;
      }

      setShowEditModal(false);
      setSelectedAcc(null);
      setFormPassword("");
      loadAccounts();
    } catch (_) {
      setErrorMsg("Terjadi kesalahan jaringan.");
    }
  };

  const handleDelete = async (acc: Account) => {
    if (acc.username.toLowerCase() === "gcnet") {
      alert("Akun master owner tidak dapat dihapus.");
      return;
    }
    if (!confirm(`Hapus akun staff "${acc.username}"?`)) return;

    try {
      const res = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: acc.id })
      });

      if (res.ok) {
        loadAccounts();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menghapus akun.");
      }
    } catch (_) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const openEdit = (acc: Account) => {
    setSelectedAcc(acc);
    setFormFullName(acc.fullName);
    setFormRole(acc.role);
    setFormActive(acc.active);
    setFormPassword("");
    setErrorMsg("");
    setShowEditModal(true);
  };

  return (
    <PinGuard>
      <div className="min-h-screen bg-surface-dark text-white p-4 md:p-8 pt-20">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-6">
            <div className="flex items-center gap-4">
              <Link href="/data-booking" className="p-2 hover:bg-surface rounded-lg text-white/50 hover:text-white transition">
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2">
                  <ShieldCheck size={28} className="text-nvidia-green" />
                  Manajemen Akun Login
                </h1>
                <p className="text-xs text-white/50 uppercase tracking-wider mt-1">
                  Kelola hak akses kasir, operator, dan admin warnet
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setFormUsername("");
                setFormPassword("");
                setFormFullName("");
                setFormRole("operator");
                setErrorMsg("");
                setShowAddModal(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-nvidia-green/10 border border-nvidia-green/50 text-nvidia-green hover:bg-nvidia-green hover:text-black rounded-lg transition font-bold text-xs uppercase tracking-wider"
            >
              <Plus size={18} weight="bold" />
              Tambah Akun Staff
            </button>
          </div>

          {/* Accounts Grid / Table */}
          {loading ? (
            <div className="p-12 text-center text-white/40 text-sm uppercase tracking-widest animate-pulse">
              Memuat data akun...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map(acc => (
                <div
                  key={acc.id}
                  className={`bg-surface border p-5 rounded-lg flex flex-col justify-between relative overflow-hidden transition ${
                    acc.active ? "border-hairline hover:border-nvidia-green/40" : "border-error/30 opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-surface-dark border border-hairline rounded-lg text-nvidia-green">
                          <User size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white tracking-tight">{acc.fullName || acc.username}</h3>
                          <span className="text-[11px] font-mono text-white/50">@{acc.username}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                          acc.role === "owner"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : acc.role === "admin"
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                            : "bg-nvidia-green/10 text-nvidia-green border-nvidia-green/30"
                        }`}
                      >
                        {acc.role}
                      </span>
                    </div>

                    <div className="text-[10px] text-white/40 uppercase tracking-wider space-y-1 mb-4">
                      <div className="flex items-center gap-1.5">
                        <span>Status:</span>
                        <span className={acc.active ? "text-emerald-400 font-bold" : "text-error font-bold"}>
                          {acc.active ? "Aktif" : "Dinonaktifkan"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-hairline">
                    <button
                      onClick={() => openEdit(acc)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-surface-dark hover:bg-white/10 text-white text-xs font-semibold rounded transition"
                    >
                      <PencilSimple size={14} />
                      Ubah / Password
                    </button>
                    {acc.username.toLowerCase() !== "gcnet" && (
                      <button
                        onClick={() => handleDelete(acc)}
                        className="p-2 bg-error/10 hover:bg-error text-error hover:text-white rounded transition"
                        title="Hapus Akun"
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal Tambah Akun */}
          <AnimatePresence>
            {showAddModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-surface border border-hairline p-6 rounded-xl max-w-md w-full space-y-4"
                >
                  <h2 className="text-lg font-bold uppercase tracking-tight text-white flex items-center gap-2">
                    <Plus size={20} className="text-nvidia-green" />
                    Tambah Akun Baru
                  </h2>

                  {errorMsg && (
                    <div className="p-3 bg-error/10 border border-error/30 text-error text-xs rounded font-bold">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-white/50 uppercase">Username (Login)</label>
                      <input
                        type="text"
                        value={formUsername}
                        onChange={e => setFormUsername(e.target.value)}
                        placeholder="contoh: kasir_pagi"
                        className="w-full bg-surface-dark border border-hairline p-2.5 rounded text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-white/50 uppercase">Password</label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={e => setFormPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-surface-dark border border-hairline p-2.5 rounded text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-white/50 uppercase">Nama Lengkap / Panggilan</label>
                      <input
                        type="text"
                        value={formFullName}
                        onChange={e => setFormFullName(e.target.value)}
                        placeholder="contoh: Budi (Kasir Siang)"
                        className="w-full bg-surface-dark border border-hairline p-2.5 rounded text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-white/50 uppercase">Role / Jabatan</label>
                      <select
                        value={formRole}
                        onChange={e => setFormRole(e.target.value as any)}
                        className="w-full bg-surface-dark border border-hairline p-2.5 rounded text-sm text-white focus:border-nvidia-green outline-none"
                      >
                        <option value="operator">Operator / Kasir (Shift Harian)</option>
                        <option value="admin">Admin (Akses Penuh Manajemen & Rekap)</option>
                        <option value="owner">Owner (Hak Akses Tertinggi)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 py-2.5 bg-surface-dark hover:bg-white/10 rounded text-xs font-bold uppercase text-white/60"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleCreate}
                      className="flex-1 py-2.5 bg-nvidia-green text-black hover:bg-nvidia-green/90 rounded text-xs font-bold uppercase"
                    >
                      Simpan Akun
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal Ubah Akun / Password */}
          <AnimatePresence>
            {showEditModal && selectedAcc && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-surface border border-hairline p-6 rounded-xl max-w-md w-full space-y-4"
                >
                  <h2 className="text-lg font-bold uppercase tracking-tight text-white flex items-center gap-2">
                    <PencilSimple size={20} className="text-cyan-400" />
                    Ubah Akun @{selectedAcc.username}
                  </h2>

                  {errorMsg && (
                    <div className="p-3 bg-error/10 border border-error/30 text-error text-xs rounded font-bold">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-white/50 uppercase">Nama Lengkap</label>
                      <input
                        type="text"
                        value={formFullName}
                        onChange={e => setFormFullName(e.target.value)}
                        className="w-full bg-surface-dark border border-hairline p-2.5 rounded text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-white/50 uppercase">
                        Ganti Password (Kosongkan jika tidak diubah)
                      </label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={e => setFormPassword(e.target.value)}
                        placeholder="Masukkan password baru"
                        className="w-full bg-surface-dark border border-hairline p-2.5 rounded text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-white/50 uppercase">Role / Jabatan</label>
                      <select
                        value={formRole}
                        onChange={e => setFormRole(e.target.value as any)}
                        disabled={selectedAcc.username.toLowerCase() === "gcnet"}
                        className="w-full bg-surface-dark border border-hairline p-2.5 rounded text-sm text-white focus:border-nvidia-green outline-none"
                      >
                        <option value="operator">Operator / Kasir</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>

                    {selectedAcc.username.toLowerCase() !== "gcnet" && (
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="chkActive"
                          checked={formActive}
                          onChange={e => setFormActive(e.target.checked)}
                          className="rounded text-nvidia-green"
                        />
                        <label htmlFor="chkActive" className="text-xs font-semibold text-white/80 cursor-pointer">
                          Akun Aktif (Bisa Login)
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 py-2.5 bg-surface-dark hover:bg-white/10 rounded text-xs font-bold uppercase text-white/60"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="flex-1 py-2.5 bg-cyan-500 text-black hover:bg-cyan-400 rounded text-xs font-bold uppercase"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </PinGuard>
  );
}
