"use client";

import { useState, useEffect } from "react";
import { User, Key, ShieldCheck, Plus, Trash2, Pencil, CheckCircle2, XCircle, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import PinGuard from "@/components/PinGuard";

interface Account {
  id: string;
  username: string;
  role: 'super_admin' | 'owner' | 'admin' | 'operator';
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

  // Owner Master Passkey States
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [isVerifyingPasskey, setIsVerifyingPasskey] = useState(false);

  // Form states
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formRole, setFormRole] = useState<'super_admin' | 'owner' | 'admin' | 'operator'>('operator');
  const [formActive, setFormActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts");
      if (res.status === 403 || res.status === 401) {
        setIsOwnerUnlocked(false);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        setIsOwnerUnlocked(true);
      }
    } catch (_) {
      setIsOwnerUnlocked(false);
    }
    setLoading(false);
  };

  const handleVerifyPasskey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPasskeyError(null);
    if (!passkeyInput.trim()) {
      setPasskeyError("Master Passkey wajib diisi");
      return;
    }

    setIsVerifyingPasskey(true);
    try {
      const res = await fetch("/api/auth/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: passkeyInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasskeyError(data.error || "Master Passkey tidak cocok");
        return;
      }

      setIsOwnerUnlocked(true);
      setPasskeyInput("");
      await loadAccounts();
    } catch (err: any) {
      setPasskeyError(err?.message || "Gagal memverifikasi passkey");
    } finally {
      setIsVerifyingPasskey(false);
    }
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
    if (acc.username.toLowerCase() === "gcnet" || acc.role === "super_admin") {
      alert("Akun Super Admin master tidak dapat dihapus.");
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

  if (loading) {
    return (
      <PinGuard>
        <div className="min-h-screen bg-surface-dark flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-nvidia-green border-t-transparent animate-spin" />
            <span className="text-xs text-zinc-400 font-medium">Memeriksa Hak Otoritas Pemilik...</span>
          </div>
        </div>
      </PinGuard>
    );
  }

  if (!isOwnerUnlocked) {
    return (
      <PinGuard>
        <div className="min-h-screen bg-surface-dark text-white flex items-center justify-center p-4">
          <div className="nvidia-card p-8 w-full max-w-md relative overflow-hidden space-y-6">
            <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
              <Lock size={140} />
            </div>
            <div className="nvidia-corner" />

            <div className="flex items-center gap-3.5 border-b border-hairline/60 pb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Key size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                  Brankas Akun Staf
                </h2>
                <p className="text-xs text-zinc-400">
                  Otoritas Tingkat Dua Pemilik GC-Net
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Halaman ini mengelola hak akses seluruh staf kasir dan admin warnet. Masukkan Master Passkey Pemilik untuk membuka brankas.
            </p>

            {passkeyError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <Lock size={14} className="shrink-0" />
                <span>{passkeyError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPasskey} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Master Passkey Pemilik
                </label>
                <input
                  type="password"
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  placeholder="Masukkan passkey rahasia pemilik"
                  className="w-full px-4 py-3 rounded-xl bg-black border border-hairline focus:border-nvidia-green text-white text-sm outline-none transition placeholder:text-zinc-600"
                  autoFocus
                  required
                />
                <span className="text-[10px] text-zinc-500 block">
                  Diatur secara terisolasi pada variabel OWNER_PASSKEY di file env server.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <Link
                  href="/data-booking"
                  className="px-4 py-2.5 rounded-xl border border-hairline text-zinc-400 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali</span>
                </Link>

                <button
                  type="submit"
                  disabled={isVerifyingPasskey || !passkeyInput.trim()}
                  className="nvidia-button flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  {isVerifyingPasskey ? (
                    <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <Key size={14} />
                      <span>Buka Brankas</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </PinGuard>
    );
  }

  return (
    <PinGuard>
      <div className="min-h-screen bg-surface-dark text-white p-4 md:p-8 pt-16 md:pt-8 space-y-6 pb-32">
        <div className="max-w-[1400px] 2xl:max-w-[1720px] mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-4 xl:pb-6">
            <div className="flex items-center gap-3 xl:gap-4">
              <Link href="/data-booking" className="p-2.5 xl:p-3 hover:bg-surface border border-hairline rounded-xl text-white/50 hover:text-white transition">
                <ArrowLeft size={22} />
              </Link>
              <div className="p-3 bg-nvidia-green/10 border border-nvidia-green/30 rounded-xl text-nvidia-green shrink-0">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl 2xl:text-4xl font-bold uppercase tracking-tight text-white flex items-center gap-3">
                  Manajemen Akun Login
                </h1>
                <p className="text-xs xl:text-sm text-white/50 tracking-tight mt-1">
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
              className="nvidia-button flex items-center justify-center gap-2 px-4 xl:px-5 py-2.5 xl:py-3 rounded-xl font-bold text-xs xl:text-sm uppercase tracking-wider shrink-0"
            >
              <Plus size={18} />
              Tambah Akun Staff
            </button>
          </div>

          {/* Accounts Grid / Table */}
          {loading ? (
            <div className="p-12 text-center text-white/40 text-xs xl:text-sm uppercase tracking-wider animate-pulse font-bold">
              Memuat data akun...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-6">
              {accounts.map(acc => (
                <div
                  key={acc.id}
                  className={`bg-surface border p-5 xl:p-6 rounded-xl flex flex-col justify-between relative overflow-hidden transition shadow-xl ${
                    acc.active ? "border-hairline hover:border-nvidia-green/40" : "border-error/30 opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 xl:p-3 bg-surface-dark border border-hairline rounded-xl text-nvidia-green shrink-0">
                          <User size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm xl:text-base text-white tracking-tight">{acc.fullName || acc.username}</h3>
                          <span className="text-xs xl:text-sm text-zinc-400 font-medium">@{acc.username}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] xl:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                          acc.role === "super_admin"
                            ? "bg-purple-500/10 text-purple-300 border-purple-500/30 font-black"
                            : acc.role === "owner"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : acc.role === "admin"
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                            : "bg-nvidia-green/10 text-nvidia-green border-nvidia-green/30"
                        }`}
                      >
                        {acc.role === "super_admin" ? "Super Admin" : acc.role}
                      </span>
                    </div>

                    <div className="text-xs xl:text-sm text-white/50 uppercase tracking-wider space-y-1 mb-5">
                      <div className="flex items-center gap-2">
                        <span>Status:</span>
                        <span className={acc.active ? "text-emerald-400 font-bold" : "text-error font-bold"}>
                          {acc.active ? "Aktif" : "Dinonaktifkan"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-4 border-t border-hairline">
                    <button
                      onClick={() => openEdit(acc)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 xl:py-3 bg-surface-dark hover:bg-white/10 text-white text-xs xl:text-sm font-bold rounded-xl transition border border-hairline"
                    >
                      <Pencil size={15} />
                      Ubah Akun
                    </button>
                    {acc.username.toLowerCase() !== "gcnet" && acc.role !== "super_admin" && (
                      <button
                        onClick={() => handleDelete(acc)}
                        className="p-2.5 xl:p-3 bg-error/10 hover:bg-error text-error hover:text-white rounded-xl transition border border-error/30 shrink-0"
                        title="Hapus Akun"
                      >
                        <Trash2 size={16} />
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
                  className="bg-surface border border-hairline p-6 xl:p-8 rounded-2xl max-w-md xl:max-w-lg w-full space-y-5 shadow-2xl relative text-white"
                >
                  <h2 className="text-lg xl:text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2.5">
                    <Plus size={20} className="text-nvidia-green" />
                    Tambah Akun Baru
                  </h2>

                  {errorMsg && (
                    <div className="p-3 bg-error/10 border border-error/30 text-error text-xs rounded-xl font-bold">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] xl:text-xs font-bold text-white/50 uppercase block mb-1.5">Username Login</label>
                      <input
                        type="text"
                        value={formUsername}
                        onChange={e => setFormUsername(e.target.value)}
                        placeholder="contoh: kasir_pagi"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] xl:text-xs font-bold text-white/50 uppercase block mb-1.5">Password</label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={e => setFormPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] xl:text-xs font-bold text-white/50 uppercase block mb-1.5">Nama Lengkap atau Panggilan</label>
                      <input
                        type="text"
                        value={formFullName}
                        onChange={e => setFormFullName(e.target.value)}
                        placeholder="contoh: Budi Kasir Siang"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] xl:text-xs font-bold text-white/50 uppercase block mb-1.5">Role atau Jabatan</label>
                      <select
                        value={formRole}
                        onChange={e => setFormRole(e.target.value as any)}
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      >
                        <option value="operator">Operator Kasir: Shift Harian</option>
                        <option value="admin">Admin: Akses Penuh Manajemen dan Rekap</option>
                        <option value="owner">Owner: Hak Akses Pemilik</option>
                        <option value="super_admin">Super Admin: Hak Akses Sistem Mutlak</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 py-3 bg-surface-dark hover:bg-white/10 rounded-xl text-xs xl:text-sm font-bold uppercase text-white/60 border border-hairline transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleCreate}
                      className="flex-1 py-3 bg-nvidia-green text-black hover:bg-nvidia-green/90 rounded-xl text-xs xl:text-sm font-bold uppercase transition"
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
                  className="bg-surface border border-hairline p-6 xl:p-8 rounded-2xl max-w-md xl:max-w-lg w-full space-y-5 shadow-2xl relative text-white"
                >
                  <h2 className="text-lg xl:text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2.5">
                    <Pencil size={20} className="text-cyan-400" />
                    Ubah Akun @{selectedAcc.username}
                  </h2>

                  {errorMsg && (
                    <div className="p-3 bg-error/10 border border-error/30 text-error text-xs rounded-xl font-bold">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] xl:text-xs font-bold text-white/50 uppercase block mb-1.5">Nama Lengkap</label>
                      <input
                        type="text"
                        value={formFullName}
                        onChange={e => setFormFullName(e.target.value)}
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] xl:text-xs font-bold text-white/50 uppercase block mb-1.5">
                        Ganti Password, kosongkan jika tidak diubah
                      </label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={e => setFormPassword(e.target.value)}
                        placeholder="Masukkan password baru"
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] xl:text-xs font-bold text-white/50 uppercase block mb-1.5">Role atau Jabatan</label>
                      <select
                        value={formRole}
                        onChange={e => setFormRole(e.target.value as any)}
                        disabled={selectedAcc.username.toLowerCase() === "gcnet" || selectedAcc.role === "super_admin"}
                        className="w-full bg-surface-dark border border-hairline p-3 rounded-xl text-xs xl:text-sm text-white focus:border-nvidia-green outline-none disabled:opacity-50"
                      >
                        <option value="operator">Operator Kasir</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>

                    {selectedAcc.username.toLowerCase() !== "gcnet" && selectedAcc.role !== "super_admin" && (
                      <div className="flex items-center gap-2.5 pt-2">
                        <input
                          type="checkbox"
                          id="chkActive"
                          checked={formActive}
                          onChange={e => setFormActive(e.target.checked)}
                          className="w-4 h-4 rounded text-nvidia-green"
                        />
                        <label htmlFor="chkActive" className="text-xs xl:text-sm font-semibold text-white/80 cursor-pointer">
                          Akun Aktif
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 py-3 bg-surface-dark hover:bg-white/10 rounded-xl text-xs xl:text-sm font-bold uppercase text-white/60 border border-hairline transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="flex-1 py-3 bg-cyan-500 text-black hover:bg-cyan-400 rounded-xl text-xs xl:text-sm font-bold uppercase transition"
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
