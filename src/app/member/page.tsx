"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  ShieldCheck, 
  Sparkles, 
  Gamepad2, 
  Clock, 
  CreditCard,
  Eye,
  EyeOff,
  Pencil,
  X,
  Key
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface MemberProfile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  phone: string | null;
  balance: number;
  gc_user_id: string | null;
  created_at: string;
}

export default function MemberPage() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Auth Form States
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Password Recovery Mode State (saat tautan reset diklik member)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newRecoveryPassword, setNewRecoveryPassword] = useState("");
  const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/member`,
        },
      });

      if (error) {
        setErrorMessage(error.message || "Gagal membuka otentikasi Google");
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan koneksi ke Google");
      setGoogleLoading(false);
    }
  };

  // Load session
  useEffect(() => {
    async function initSession() {
      setLoading(true);

      // Cek apakah url mengandung recovery token
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        if (hash && hash.includes("type=recovery")) {
          setIsRecoveryMode(true);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSessionUser(session.user);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }

      if (session?.user) {
        setSessionUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setSessionUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Profile Setup / Edit Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalUsername, setModalUsername] = useState("");
  const [modalFullName, setModalFullName] = useState("");
  const [modalPhone, setModalPhone] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const res = await fetch(`/api/member/profile?user_id=${userId}`);
      const data = await res.json();
      if (res.ok && data.member) {
        setProfile(data.member);
        // Jika nomor WhatsApp / HP belum diatur atau baru pertama kali login Google, tanyakan data diri
        if (!data.member.phone || data.member.phone.trim() === "") {
          setModalUsername(data.member.username || "");
          setModalFullName(data.member.full_name || "");
          setModalPhone("");
          setIsFirstTimeSetup(true);
          setShowProfileModal(true);
        }
      }
    } catch (_) {}
  };

  const openEditModal = () => {
    setModalUsername(profile?.username || "");
    setModalFullName(profile?.full_name || "");
    setModalPhone(profile?.phone || "");
    setModalError(null);
    setIsFirstTimeSetup(false);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalLoading(true);

    try {
      const cleanUsername = modalUsername.trim().toLowerCase();
      const cleanFullName = modalFullName.trim() || cleanUsername;
      const cleanPhone = modalPhone.trim();

      if (!cleanUsername) {
        setModalError("Nickname gaming wajib diisi");
        setModalLoading(false);
        return;
      }

      if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
        setModalError("Nickname hanya boleh huruf kecil, angka, dan garis bawah 3 sampai 20 karakter");
        setModalLoading(false);
        return;
      }

      if (!cleanPhone) {
        setModalError("Nomor WhatsApp wajib diisi agar OP warnet bisa mengonfirmasi giliran booking");
        setModalLoading(false);
        return;
      }

      if (!/^[0-9+\-\s]{8,20}$/.test(cleanPhone)) {
        setModalError("Format nomor WhatsApp tidak valid minimal 8 digit angka");
        setModalLoading(false);
        return;
      }

      const res = await fetch("/api/member/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionUser?.id,
          email: sessionUser?.email,
          username: cleanUsername,
          full_name: cleanFullName,
          phone: cleanPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setModalError(data.error || "Gagal menyimpan data diri");
        setModalLoading(false);
        return;
      }

      if (data.member) {
        setProfile(data.member);
        setShowProfileModal(false);
        setSuccessMessage("Data diri member berhasil disimpan");
      }
    } catch (err: any) {
      setModalError(err?.message || "Terjadi kesalahan koneksi");
    } finally {
      setModalLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setActionLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      if (!cleanEmail || !cleanPassword) {
        setErrorMessage("Email dan password wajib diisi");
        setActionLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        setErrorMessage(error.message || "Email atau password salah");
        setActionLoading(false);
        return;
      }

      if (data?.user) {
        setSessionUser(data.user);
        await fetchProfile(data.user.id);
        setSuccessMessage("Login berhasil! Selamat datang kembali.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan jaringan");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setActionLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      const cleanUsername = username.trim().toLowerCase();
      const cleanPhone = phone.trim();
      const cleanFullName = fullName.trim() || cleanUsername;

      if (!cleanEmail || !cleanPassword || !cleanUsername) {
        setErrorMessage("Lengkapi email, username, dan password");
        setActionLoading(false);
        return;
      }

      if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
        setErrorMessage("Username hanya boleh huruf, angka, dan underscore (3-20 karakter)");
        setActionLoading(false);
        return;
      }

      if (cleanPassword.length < 6) {
        setErrorMessage("Password minimal 6 karakter");
        setActionLoading(false);
        return;
      }

      // Register via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            username: cleanUsername,
            full_name: cleanFullName,
            phone: cleanPhone,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || "Pendaftaran gagal. Coba lagi bentar ya.");
        setActionLoading(false);
        return;
      }

      if (data?.user) {
        // Backup sync profile to members table
        await fetch("/api/member/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: data.user.id,
            email: cleanEmail,
            username: cleanUsername,
            full_name: cleanFullName,
            phone: cleanPhone,
          }),
        });

        setSessionUser(data.user);
        await fetchProfile(data.user.id);
        setSuccessMessage("Pendaftaran akun member berhasil!");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan saat pendaftaran");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setActionLoading(true);
    await supabase.auth.signOut();
    setSessionUser(null);
    setProfile(null);
    setActionLoading(false);
  };

  const handleSendForgotPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setForgotError("Alamat email wajib diisi");
      return;
    }

    setIsSendingForgot(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/member`,
      });
      if (error) throw error;
      setForgotSuccess("Tautan pemulihan kata sandi telah dikirim ke email lu. Silakan periksa kotak masuk atau spam.");
    } catch (err: any) {
      setForgotError(err?.message || "Gagal mengirim tautan pemulihan kata sandi");
    } finally {
      setIsSendingForgot(false);
    }
  };

  const handleUpdateRecoveryPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    const cleanPass = newRecoveryPassword.trim();
    if (cleanPass.length < 6) {
      setRecoveryError("Password baru minimal 6 karakter");
      return;
    }
    if (cleanPass !== confirmRecoveryPassword.trim()) {
      setRecoveryError("Konfirmasi password tidak cocok");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: cleanPass,
      });
      if (error) throw error;
      setRecoverySuccess("Password akun berhasil diubah. Lu sudah dapat menggunakannya.");
      setTimeout(() => {
        setIsRecoveryMode(false);
        setNewRecoveryPassword("");
        setConfirmRecoveryPassword("");
      }, 2000);
    } catch (err: any) {
      setRecoveryError(err?.message || "Gagal memperbarui password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-nvidia-green border-t-transparent animate-spin" />
          <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Memuat Akun...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-nvidia-green selection:text-black py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-nvidia-green/[0.04] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Navigation Breadcrumb / Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-hairline">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center">
              <Gamepad2 className="text-nvidia-green" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase">Portal Member GC-Net</h1>
              <p className="text-[11px] text-zinc-400">Akun pemain resmi warnet & integrasi billing</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-zinc-400 hover:text-white transition flex items-center gap-1.5 uppercase tracking-wider px-3 py-1.5 rounded bg-white/[0.03] border border-hairline"
          >
            ← Booking PC
          </Link>
        </div>

        {sessionUser ? (
          /* ── LOGGED IN: MEMBER DASHBOARD ── */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Kartu Member Digital */}
            <div className="md:col-span-1 space-y-4">
              <div className="relative rounded-2xl bg-gradient-to-br from-zinc-900 via-black to-zinc-950 border border-nvidia-green/40 p-6 shadow-[0_0_30px_rgba(118,185,0,0.15)] overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-nvidia-green/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-nvidia-green bg-nvidia-green/10 px-2 py-0.5 rounded border border-nvidia-green/20">
                    GC MEMBER
                  </span>
                  <Sparkles size={16} className="text-nvidia-green animate-pulse" />
                </div>

                <div className="mb-6">
                  <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider block">Nickname Akun</span>
                  <span className="text-2xl font-black text-white tracking-tight block">
                    {profile?.username || sessionUser.email?.split("@")[0]}
                  </span>
                  <span className="text-xs text-zinc-400 block mt-0.5">
                    {profile?.full_name || sessionUser.email}
                  </span>
                </div>

                <div className="pt-4 border-t border-hairline flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[9px] uppercase text-zinc-400 font-bold block">Saldo Deposit</span>
                    <span className="text-lg font-black text-nvidia-green">
                      Rp {(profile?.balance || 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase text-zinc-400 font-bold block">Status Billing</span>
                    <span className="text-[11px] font-bold text-white uppercase">
                      {profile?.gc_user_id ? "Terhubung PC" : "Siap Booking"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-hairline space-y-2.5">
                <Link
                  href="/"
                  className="w-full py-2.5 px-4 rounded-lg bg-nvidia-green text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white transition shadow-[0_0_15px_rgba(118,185,0,0.3)]"
                >
                  <span>Mulai Booking PC</span>
                  <ArrowRight size={14} />
                </Link>

                <button
                  onClick={handleLogout}
                  disabled={actionLoading}
                  className="w-full py-2 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                >
                  <LogOut size={14} />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>

            {/* Detail Akun & Riwayat */}
            <div className="md:col-span-2 space-y-4">
              <div className="p-6 rounded-2xl bg-zinc-950 border border-hairline">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={16} className="text-nvidia-green" />
                    Informasi Akun Terdaftar
                  </h3>
                  <button
                    onClick={openEditModal}
                    className="px-3 py-1.5 rounded-lg bg-[#181a20] hover:bg-[#232630] border border-hairline text-xs font-bold text-zinc-300 hover:text-white uppercase tracking-wider flex items-center gap-1.5 transition"
                  >
                    <Pencil size={13} className="text-nvidia-green" />
                    <span>Ubah Data Diri</span>
                  </button>
                </div>

                {!profile?.phone && (
                  <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-amber-300">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>Nomor WhatsApp belum diatur. Lengkapi agar OP bisa mengonfirmasi antrean.</span>
                    </div>
                    <button
                      onClick={openEditModal}
                      className="px-2.5 py-1 rounded bg-amber-500 text-black font-bold uppercase text-[10px] tracking-wider shrink-0 hover:bg-white transition"
                    >
                      Atur Sekarang
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-black/50 border border-hairline">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Email Terhubung</span>
                    <span className="text-white font-medium break-all">{sessionUser.email}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/50 border border-hairline">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Nomor WhatsApp / HP</span>
                    <span className="text-white font-medium">{profile?.phone || "Belum diatur"}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/50 border border-hairline">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">ID Sistem Billing (GC)</span>
                    <span className="text-zinc-400 font-mono text-[11px]">{profile?.gc_user_id || "Sinkronisasi otomatis saat sesi aktif"}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/50 border border-hairline">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Waktu Bergabung</span>
                    <span className="text-white font-medium">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Banner Info Keamanan */}
              <div className="p-4 rounded-xl bg-nvidia-green/[0.04] border border-nvidia-green/20 flex items-start gap-3">
                <ShieldCheck size={18} className="text-nvidia-green shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">Akun Lu Terverifikasi</span>
                  Saat melakukan pemesanan di halaman booking, username lu otomatis terkunci sebagai identitas pemain di PC tujuan.
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── NOT LOGGED IN: AUTH FORM (LOGIN / REGISTER) ── */
          <div className="max-w-md mx-auto">
            <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950 border border-hairline shadow-2xl relative">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-black border border-hairline mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                    authMode === "login"
                      ? "bg-nvidia-green text-black shadow-[0_0_12px_rgba(118,185,0,0.3)]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Masuk Akun
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                    authMode === "register"
                      ? "bg-nvidia-green text-black shadow-[0_0_12px_rgba(118,185,0,0.3)]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Daftar Baru
                </button>
              </div>

              {/* Feedback Alerts */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="mb-4 p-3 rounded-lg bg-nvidia-green/10 border border-nvidia-green/30 text-nvidia-green text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-4 text-xs">
                {authMode === "register" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Username Billing (Nickname)
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          required
                          placeholder="contoh: pro_gamer123"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black border border-hairline text-white placeholder:text-zinc-600 focus:outline-none focus:border-nvidia-green transition"
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 block mt-1">
                        Huruf, angka, atau underscore (3-20 karakter). Digunakan saat login di PC.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Nama Lengkap (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Nama asli atau panggilan"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-black border border-hairline text-white placeholder:text-zinc-600 focus:outline-none focus:border-nvidia-green transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Nomor WhatsApp / HP
                      </label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="tel"
                          placeholder="0812xxxxxxxx"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black border border-hairline text-white placeholder:text-zinc-600 focus:outline-none focus:border-nvidia-green transition"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email"
                      required
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black border border-hairline text-white placeholder:text-zinc-600 focus:outline-none focus:border-nvidia-green transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Password Akun
                    </label>
                    {authMode === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email);
                          setForgotError(null);
                          setForgotSuccess(null);
                          setShowForgotModal(true);
                        }}
                        className="text-[11px] text-nvidia-green hover:underline font-semibold"
                      >
                        Lupa Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-black border border-hairline text-white placeholder:text-zinc-600 focus:outline-none focus:border-nvidia-green transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-nvidia-green text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white transition shadow-[0_0_20px_rgba(118,185,0,0.3)] active:scale-[0.99]"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : authMode === "login" ? (
                    <>
                      <span>Masuk ke Akun</span>
                      <ArrowRight size={14} />
                    </>
                  ) : (
                    <>
                      <span>Daftar Sekarang</span>
                      <Sparkles size={14} />
                    </>
                  )}
                </button>
              </form>

              {/* Elegant Divider */}
              <div className="relative flex items-center justify-center my-5">
                <div className="border-t border-hairline w-full"></div>
                <span className="bg-zinc-950 px-3 text-[10px] font-bold tracking-widest text-zinc-400 uppercase shrink-0">
                  Atau Lebih Cepat
                </span>
                <div className="border-t border-hairline w-full"></div>
              </div>

              {/* Google 1-Click Login Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || actionLoading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-3 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>{googleLoading ? "Menghubungkan Google..." : "Lanjut dengan Google"}</span>
              </button>

              <div className="mt-5 pt-4 border-t border-hairline text-center">
                <p className="text-[11px] text-zinc-400">
                  {authMode === "login" ? "Belum punya akun member?" : "Sudah punya akun?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === "login" ? "register" : "login");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-nvidia-green font-bold hover:underline ml-1"
                  >
                    {authMode === "login" ? "Daftar di sini" : "Login di sini"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL ONBOARDING / UBAH DATA DIRI ── */}
        <AnimatePresence>
          {showProfileModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-zinc-950 border border-hairline rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-nvidia-green/15 blur-3xl rounded-full pointer-events-none" />

                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center text-nvidia-green shrink-0">
                    <Gamepad2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                      {isFirstTimeSetup ? "Lengkapi Identitas Member" : "Ubah Data Diri Member"}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {isFirstTimeSetup
                        ? "Atur nickname gaming dan nomor WhatsApp lu untuk sistem billing warnet"
                        : "Perbarui identitas akun pemain GC-Net lu"}
                    </p>
                  </div>
                </div>

                {modalError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Nickname Gaming (IGN)
                    </label>
                    <div className="relative">
                      <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                      <input
                        type="text"
                        value={modalUsername}
                        onChange={(e) => setModalUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        placeholder="contoh: mindzevo, alucard_pro"
                        className="w-full bg-black/60 border border-hairline focus:border-nvidia-green pl-9 pr-3 py-2.5 rounded-lg text-xs font-bold text-white outline-none transition placeholder:text-zinc-500"
                        maxLength={20}
                        required
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 block mt-1">
                      Hanya huruf kecil, angka, dan garis bawah (3-20 karakter). Tampil di PC warnet.
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Nama Lengkap
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                      <input
                        type="text"
                        value={modalFullName}
                        onChange={(e) => setModalFullName(e.target.value)}
                        placeholder="Nama asli lu"
                        className="w-full bg-black/60 border border-hairline focus:border-nvidia-green pl-9 pr-3 py-2.5 rounded-lg text-xs font-semibold text-white outline-none transition placeholder:text-zinc-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Nomor WhatsApp / HP
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                      <input
                        type="tel"
                        value={modalPhone}
                        onChange={(e) => setModalPhone(e.target.value)}
                        placeholder="081234567890"
                        className="w-full bg-black/60 border border-hairline focus:border-nvidia-green pl-9 pr-3 py-2.5 rounded-lg text-xs font-bold text-white outline-none transition placeholder:text-zinc-500"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 block mt-1">
                      OP warnet akan memanggil atau konfirmasi giliran booking via nomor ini.
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    {isFirstTimeSetup ? (
                      <button
                        type="button"
                        onClick={() => setShowProfileModal(false)}
                        className="px-4 py-2.5 rounded-lg border border-hairline text-zinc-400 hover:text-white text-xs font-bold uppercase transition"
                      >
                        Nanti Saja
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowProfileModal(false)}
                        className="px-4 py-2.5 rounded-lg border border-hairline text-zinc-400 hover:text-white text-xs font-bold uppercase transition"
                      >
                        Batal
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="px-5 py-2.5 rounded-lg bg-nvidia-green hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(118,185,0,0.3)] flex items-center gap-2"
                    >
                      {modalLoading ? (
                        <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      ) : (
                        <span>Simpan Data</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL LUPA PASSWORD */}
        <AnimatePresence>
          {showForgotModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 1 }}
                className="w-full max-w-md bg-zinc-950 border border-hairline rounded-2xl p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-nvidia-green/10 border border-nvidia-green/30 text-nvidia-green flex items-center justify-center">
                      <Key size={16} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Pemulihan Password</h3>
                      <p className="text-xs text-zinc-400">Kirim tautan reset kata sandi ke email akun</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    aria-label="Tutup modal pemulihan kata sandi"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                  >
                    <X size={16} />
                  </button>
                </div>

                {forgotError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotSuccess && (
                  <div className="p-3 rounded-lg bg-nvidia-green/10 border border-nvidia-green/30 text-nvidia-green text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>{forgotSuccess}</span>
                  </div>
                )}

                {!forgotSuccess ? (
                  <form onSubmit={handleSendForgotPasswordEmail} className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                        Alamat Email Akun
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="nama@email.com"
                          className="w-full bg-black border border-hairline focus:border-nvidia-green pl-9 pr-3 py-2.5 rounded-lg text-xs font-semibold text-white outline-none transition placeholder:text-zinc-600"
                          required
                        />
                      </div>
                      <span className="text-[11px] text-zinc-500 block mt-1.5">
                        Tautan khusus untuk menyetel ulang password akan dikirim ke alamat email ini.
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline/60">
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(false)}
                        className="px-4 py-2.5 rounded-lg border border-hairline text-zinc-400 hover:text-white text-xs font-bold transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingForgot}
                        className="px-5 py-2.5 rounded-lg bg-nvidia-green hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(118,185,0,0.3)] flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSendingForgot ? (
                          <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                        ) : (
                          <>
                            <span>Kirim Tautan</span>
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-5 py-2.5 rounded-lg bg-surface-soft hover:bg-white/10 text-white text-xs font-bold transition"
                    >
                      Tutup
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL SETEL ULANG PASSWORD DARI LINK RECOVERY */}
        <AnimatePresence>
          {isRecoveryMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 1 }}
                className="w-full max-w-md bg-zinc-950 border border-nvidia-green/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(118,185,0,0.15)] space-y-4"
              >
                <div className="flex items-center gap-3 border-b border-hairline/60 pb-3">
                  <div className="w-9 h-9 rounded-lg bg-nvidia-green/15 border border-nvidia-green/30 text-nvidia-green flex items-center justify-center">
                    <Key size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Buat Password Baru</h3>
                    <p className="text-xs text-zinc-400">Atur kata sandi baru untuk akun GC-Net lu</p>
                  </div>
                </div>

                {recoveryError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                {recoverySuccess && (
                  <div className="p-3 rounded-lg bg-nvidia-green/10 border border-nvidia-green/30 text-nvidia-green text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>{recoverySuccess}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateRecoveryPassword} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Password Baru
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                      <input
                        type={showRecoveryPassword ? "text" : "password"}
                        value={newRecoveryPassword}
                        onChange={(e) => setNewRecoveryPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-black border border-hairline focus:border-nvidia-green pl-9 pr-9 py-2.5 rounded-lg text-xs font-semibold text-white outline-none transition placeholder:text-zinc-600"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoveryPassword(!showRecoveryPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        {showRecoveryPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Ulangi Password Baru
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                      <input
                        type={showRecoveryPassword ? "text" : "password"}
                        value={confirmRecoveryPassword}
                        onChange={(e) => setConfirmRecoveryPassword(e.target.value)}
                        placeholder="Ulangi kata sandi di atas"
                        className="w-full bg-black border border-hairline focus:border-nvidia-green pl-9 pr-9 py-2.5 rounded-lg text-xs font-semibold text-white outline-none transition placeholder:text-zinc-600"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="w-full py-3 rounded-lg bg-nvidia-green hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(118,185,0,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isUpdatingPassword ? (
                        <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      ) : (
                        <span>Simpan Password & Masuk</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
