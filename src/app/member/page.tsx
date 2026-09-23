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
  Key,
  Trophy,
  Zap,
  Flame,
  Award,
  Copy,
  Check,
  ChevronRight,
  Monitor,
  Gift
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

interface MemberBooking {
  id: string;
  pc_id: string;
  paket_id: string;
  player_name: string;
  status: string;
  created_at: string;
  pcs?: { name: string; type: string };
  pakets?: { name: string; price: number; duration_hours: number };
}

interface TierConfig {
  name: string;
  title: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  min: number;
  max: number;
  nextTier: string | null;
  nextThreshold: number | null;
  perks: string[];
}

function calculateTier(balance: number): TierConfig {
  const safeBalance = Math.max(0, balance || 0);

  if (safeBalance <= 50000) {
    return {
      name: "BRONZE",
      title: "Rookie Warnet",
      badgeBg: "bg-amber-500/20",
      badgeText: "text-amber-300",
      badgeBorder: "border-amber-500/40",
      min: 0,
      max: 50000,
      nextTier: "SILVER",
      nextThreshold: 50000,
      perks: [
        "Akses standard billing",
        "Booking PC online",
        "Simpan sisa durasi main"
      ]
    };
  }

  if (safeBalance <= 150000) {
    return {
      name: "SILVER",
      title: "Cyber Scout",
      badgeBg: "bg-slate-300/20",
      badgeText: "text-slate-100",
      badgeBorder: "border-slate-300/40",
      min: 50000,
      max: 150000,
      nextTier: "GOLD",
      nextThreshold: 150000,
      perks: [
        "Bebas antrean kasir",
        "Notifikasi WhatsApp giliran",
        "Prioritas PC standard"
      ]
    };
  }

  if (safeBalance <= 350000) {
    return {
      name: "GOLD",
      title: "Esports Striker",
      badgeBg: "bg-yellow-500/20",
      badgeText: "text-yellow-300",
      badgeBorder: "border-yellow-500/40",
      min: 150000,
      max: 350000,
      nextTier: "PLATINUM",
      nextThreshold: 350000,
      perks: [
        "Akses bilik VIP room",
        "Diskon lima persen fnb",
        "Badge striker di layar PC"
      ]
    };
  }

  if (safeBalance <= 700000) {
    return {
      name: "PLATINUM",
      title: "Warnet Veteran",
      badgeBg: "bg-cyan-500/20",
      badgeText: "text-cyan-300",
      badgeBorder: "border-cyan-500/40",
      min: 350000,
      max: 700000,
      nextTier: "DIAMOND",
      nextThreshold: 700000,
      perks: [
        "Prioritas penuh VIP booking",
        "Diskon sepuluh persen fnb",
        "Minuman sachet gratis tiap sesi"
      ]
    };
  }

  return {
    name: "DIAMOND",
    title: "Sultan Cyber",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/40",
    min: 700000,
    max: 1000000,
    nextTier: null,
    nextThreshold: null,
    perks: [
      "Akses bebas seluruh PC sultan",
      "Layanan prioritas kasir operator",
      "Diskon lima belas persen fnb",
      "Badge sultan eksklusif"
    ]
  };
}

export default function MemberPage() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [bookings, setBookings] = useState<MemberBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Active Dashboard Tab
  const [activeTab, setActiveTab] = useState<"level" | "history" | "quests" | "profile">("level");

  // Copy Member ID State
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyMemberId = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

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

  // Topup Info Modal State
  const [showTopupInfoModal, setShowTopupInfoModal] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Password Recovery Mode State
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newRecoveryPassword, setNewRecoveryPassword] = useState("");
  const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  // Profile Setup / Edit Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalUsername, setModalUsername] = useState("");
  const [modalFullName, setModalFullName] = useState("");
  const [modalPhone, setModalPhone] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);

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
        setBookings([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const res = await fetch(`/api/member/profile?user_id=${userId}`);
      const data = await res.json();
      if (res.ok && data.member) {
        setProfile(data.member);
        fetchBookings(data.member.id, data.member.username);

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

  const fetchBookings = async (memberId: string, username: string) => {
    try {
      const res = await fetch(`/api/member/bookings?member_id=${memberId}&player_name=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (res.ok && data.bookings) {
        setBookings(data.bookings);
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
        setModalError("Nomor WhatsApp wajib diisi agar operator warnet bisa mengonfirmasi antrean booking");
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
        setSuccessMessage("Login berhasil. Selamat datang kembali.");
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
        setErrorMessage("Username hanya boleh huruf, angka, dan garis bawah 3 sampai 20 karakter");
        setActionLoading(false);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            username: cleanUsername,
            full_name: cleanFullName,
            phone: cleanPhone,
          }
        }
      });

      if (signUpError) {
        setErrorMessage(signUpError.message || "Gagal melakukan pendaftaran akun");
        setActionLoading(false);
        return;
      }

      if (signUpData.user) {
        const profileRes = await fetch("/api/member/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: signUpData.user.id,
            email: cleanEmail,
            username: cleanUsername,
            phone: cleanPhone,
            full_name: cleanFullName,
          }),
        });

        const profileData = await profileRes.json();
        if (!profileRes.ok) {
          setErrorMessage(profileData.error || "Gagal inisialisasi profil");
          setActionLoading(false);
          return;
        }

        setSessionUser(signUpData.user);
        setProfile(profileData.member);
        setSuccessMessage("Pendaftaran berhasil. Akun member aktif.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan pendaftaran");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setActionLoading(true);
    await supabase.auth.signOut();
    setSessionUser(null);
    setProfile(null);
    setBookings([]);
    setActionLoading(false);
  };

  const handleSendForgotPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setForgotError("Masukkan alamat email terdaftar");
      return;
    }

    setIsSendingForgot(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/member`,
      });

      if (error) {
        setForgotError(error.message || "Gagal mengirim email reset password");
      } else {
        setForgotSuccess("Tautan pemulihan kata sandi telah dikirim ke email. Cek folder inbox atau spam.");
      }
    } catch (err: any) {
      setForgotError(err?.message || "Terjadi kesalahan koneksi");
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
          <div className="w-10 h-10 rounded-full border-3 border-nvidia-green border-t-transparent animate-spin" />
          <span className="text-sm text-zinc-300 uppercase tracking-widest font-black">Memuat Akun</span>
        </div>
      </div>
    );
  }

  // Tier info calculation
  const currentBalance = profile?.balance || 0;
  const currentTier = calculateTier(currentBalance);
  
  // Progress calculations
  let progressPercent = 100;
  let remainingToNext = 0;
  if (currentTier.nextThreshold) {
    const range = currentTier.nextThreshold - currentTier.min;
    const gained = currentBalance - currentTier.min;
    progressPercent = Math.min(100, Math.max(5, Math.round((gained / range) * 100)));
    remainingToNext = Math.max(0, currentTier.nextThreshold - currentBalance);
  }

  // Virtual member code
  const memberCode = `GC-${(profile?.username || "PLAYER").toUpperCase().slice(0, 10)}`;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-nvidia-green selection:text-black py-8 px-4 sm:px-6 lg:px-10 relative">
      
      {/* Container Lebar Nyaman untuk Monitor Standar maupun Ultrawide 21:9 */}
      <div className="w-full max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb & Header */}
        <header className="flex items-center justify-between pb-5 border-b border-white/10 flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0 shadow-sm">
              <Gamepad2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-white">Portal Member GC-Net</h1>
                <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-nvidia-green/15 text-nvidia-green border border-nvidia-green/30 tracking-wider">
                  Live Billing
                </span>
              </div>
              <p className="text-sm text-zinc-300 font-medium mt-0.5">Identitas esports dan integrasi saldo warnet</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-black text-black bg-nvidia-green hover:bg-white transition flex items-center gap-2 uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md"
            >
              <span>Booking PC</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </header>

        {sessionUser ? (
          /* ── LOGGED IN: UNIFIED 2-PANEL COHESIVE DASHBOARD ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* PANEL KIRI: SATU KESATUAN KARTU MEMBER, DOMPET & AKSI CEPAT */}
            <div className="lg:col-span-5 rounded-3xl bg-zinc-950 border border-white/15 p-6 sm:p-7 flex flex-col justify-between shadow-xl space-y-6">
              
              {/* Bagian Atas Kartu */}
              <div className="space-y-6">
                {/* Header Kartu: Sim Chip & Status Online */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-7 rounded-md bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 p-0.5 flex items-center justify-center shrink-0 shadow-sm">
                      <div className="w-full h-full border border-amber-950/40 rounded-[2px] grid grid-cols-2 gap-0.5 p-0.5 opacity-80">
                        <div className="border-r border-b border-amber-950/40" />
                        <div className="border-b border-amber-950/40" />
                        <div className="border-r border-amber-950/40" />
                        <div />
                      </div>
                    </div>
                    <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase font-black">
                      GC ESPORTS ID
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-nvidia-green animate-pulse" />
                    <span className="font-mono font-bold tracking-wider text-[11px]">ONLINE</span>
                  </div>
                </div>

                {/* Nickname & Identitas Akun (Hero Player Treatment) */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/20 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shrink-0 shadow-lg ring-1 ring-white/10">
                    {(profile?.username?.[0] || sessionUser.email?.[0] || "G").toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${currentTier.badgeBg} ${currentTier.badgeText} ${currentTier.badgeBorder} tracking-widest`}>
                        {currentTier.name}
                      </span>
                      <span className="text-xs text-zinc-400 font-bold truncate">
                        {currentTier.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase truncate">
                        {profile?.username || sessionUser.email?.split("@")[0]}
                      </h2>
                      <CheckCircle2 size={20} className="text-nvidia-green shrink-0" />
                    </div>

                    <p className="text-xs text-zinc-400 font-medium truncate mt-0.5">
                      {profile?.full_name || sessionUser.email}
                    </p>
                  </div>
                </div>

                {/* Saldo Deposit & Status Billing Terpadu (Seamless Wallet Ribbon) */}
                <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 sm:p-5 space-y-3.5 backdrop-blur-sm">
                  {/* Baris Atas Saldo: Label & ID Member */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CreditCard size={15} className="text-nvidia-green shrink-0" />
                      <span className="text-[11px] uppercase text-zinc-400 font-black tracking-wider">
                        Saldo Deposit Tersedia
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyMemberId(memberCode)}
                      title="Salin ID Member"
                      className="px-2.5 py-1 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1.5 shrink-0 active:scale-95"
                    >
                      <span className="font-mono font-bold text-[11px] text-zinc-200">{memberCode}</span>
                      {copiedId ? (
                        <Check size={12} className="text-nvidia-green" />
                      ) : (
                        <Copy size={12} className="text-zinc-400" />
                      )}
                    </button>
                  </div>

                  {/* Nilai Saldo Hero */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg sm:text-xl font-black text-nvidia-green">Rp</span>
                    <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                      {currentBalance.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {/* Status Integrasi Billing Live (Seamless Footer) */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-[11px] font-semibold text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-nvidia-green" />
                      <span>Koneksi Billing Warnet</span>
                    </div>
                    <span className="font-mono font-bold text-nvidia-green text-[10px] tracking-wider uppercase">
                      {profile?.gc_user_id ? "Sesi Aktif di Komputer" : "Siap Bermain"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aksi Cepat Terintegrasi (Proporsional & Ramping) */}
              <div className="space-y-2.5 pt-2">
                <Link
                  href="/"
                  className="w-full py-2.5 px-4 rounded-xl bg-nvidia-green hover:bg-white text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Gamepad2 size={16} />
                  <span>Pesan Bilik PC Sekarang</span>
                  <ArrowRight size={14} />
                </Link>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTopupInfoModal(true)}
                    className="py-2 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <CreditCard size={14} className="text-nvidia-green shrink-0" />
                    <span>Isi Saldo Kasir</span>
                  </button>

                  <button
                    type="button"
                    onClick={openEditModal}
                    className="py-2 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Pencil size={14} className="text-cyan-400 shrink-0" />
                    <span>Ubah Profil</span>
                  </button>
                </div>
              </div>

            </div>

            {/* PANEL KANAN: SATU KESATUAN HUB AKTIVITAS, LEVEL & RIWAYAT */}
            <div className="lg:col-span-7 rounded-3xl bg-zinc-950 border border-white/15 p-6 sm:p-7 flex flex-col justify-between shadow-xl space-y-6">
              
              {/* Header Tab Terintegrasi */}
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900 border border-white/10 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("level")}
                  className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl transition whitespace-nowrap ${
                    activeTab === "level"
                      ? "bg-nvidia-green text-black shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Pangkat & Benefit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("quests")}
                  className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl transition whitespace-nowrap ${
                    activeTab === "quests"
                      ? "bg-nvidia-green text-black shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Misi Warnet
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl transition whitespace-nowrap ${
                    activeTab === "history"
                      ? "bg-nvidia-green text-black shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Riwayat Booking
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl transition whitespace-nowrap ${
                    activeTab === "profile"
                      ? "bg-nvidia-green text-black shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Info Akun
                </button>
              </div>

              {/* Konten Tab yang Terisi Penuh */}
              <div className="flex-1 flex flex-col justify-between">
                
                {/* TAB 1: PANGKAT & BENEFIT */}
                {activeTab === "level" && (
                  <div className="space-y-6">
                    {/* Header Pangkat */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0">
                          <Trophy size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-wide">
                            Level Peringkat Gamer
                          </h3>
                          <p className="text-xs sm:text-sm text-zinc-300 font-medium">
                            Akumulasi saldo deposit membuka benefit dan prioritas bilik
                          </p>
                        </div>
                      </div>

                      <span className={`text-xs sm:text-sm font-black uppercase px-4 py-1.5 rounded-full border ${currentTier.badgeBg} ${currentTier.badgeText} ${currentTier.badgeBorder} tracking-wider`}>
                        Tier {currentTier.name}
                      </span>
                    </div>

                    {/* Progress Bar HUD */}
                    <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-zinc-200 font-bold">Progres Menuju Rank Berikutnya</span>
                        <span className="font-mono font-black text-white text-sm sm:text-base">{progressPercent}%</span>
                      </div>

                      <div className="w-full h-3.5 rounded-full bg-black border border-white/15 p-0.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-nvidia-green to-cyan-400 transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-300 font-mono font-medium">
                        <span>Rp {currentBalance.toLocaleString("id-ID")}</span>
                        {currentTier.nextTier ? (
                          <span>
                            Isi Rp {remainingToNext.toLocaleString("id-ID")} lagi menuju {currentTier.nextTier}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-black">Pangkat Tertinggi Tercapai</span>
                        )}
                      </div>
                    </div>

                    {/* Daftar Keuntungan Pangkat */}
                    <div>
                      <span className="text-xs uppercase font-black text-zinc-400 tracking-wider block mb-3">
                        Privilese Pangkat {currentTier.name} Lu
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {currentTier.perks.map((perk, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-zinc-900 border border-white/10 flex items-center gap-2.5 text-xs sm:text-sm">
                            <Check size={16} className="text-nvidia-green shrink-0" />
                            <span className="text-zinc-200 font-bold leading-snug">{perk}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2 Info Ringkas (Bukan 4 kotak redundan) */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Flame size={16} className="text-amber-400" />
                          <span className="text-xs font-bold uppercase">Total Booking</span>
                        </div>
                        <span className="text-sm font-black text-white font-mono">{bookings.length} Pesanan</span>
                      </div>

                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <ShieldCheck size={16} className="text-emerald-400" />
                          <span className="text-xs font-bold uppercase">Status Akun</span>
                        </div>
                        <span className="text-sm font-black text-emerald-400 uppercase">Resmi</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MISI WARNET */}
                {activeTab === "quests" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0">
                          <Gift size={20} />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                            Misi Harian Pemain
                          </h3>
                          <p className="text-xs text-zinc-300 font-medium">
                            Selesaikan tantangan warnet untuk menambah keaktifan dan EXP akun
                          </p>
                        </div>
                      </div>

                      <span className="hidden sm:inline-flex text-[11px] font-mono font-bold text-zinc-400 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10">
                        RESET TIAP 24 JAM
                      </span>
                    </div>

                    {/* Grid Quest Cards yang Menarik & Bergaya Gamifikasi */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* Quest 1: Check-in Harian (Selesai) */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-emerald-950/20 via-zinc-900 to-zinc-950 border border-emerald-500/30 flex flex-col justify-between hover:border-emerald-500/60 transition shadow-sm">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-nvidia-green shrink-0">
                              <CheckCircle2 size={18} />
                            </div>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-nvidia-green/20 text-nvidia-green border border-nvidia-green/40 tracking-wider">
                              Selesai
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-white mb-1">
                            Login Harian Portal
                          </h4>
                          <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                            Masuk ke portal member dan aktifkan sesi bermain hari ini.
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-zinc-400 font-medium">Progres Misi</span>
                            <span className="text-nvidia-green font-bold">1 / 1</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="w-full h-full bg-nvidia-green rounded-full" />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-zinc-400">Hadiah</span>
                            <span className="text-xs font-mono font-black text-nvidia-green bg-nvidia-green/10 px-2 py-0.5 rounded border border-nvidia-green/20">
                              +50 EXP
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quest 2: Amunisi Deposit (Tantangan Aktif) */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-950/15 via-zinc-900 to-zinc-950 border border-amber-500/25 flex flex-col justify-between hover:border-amber-500/50 transition shadow-sm">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                              <Zap size={18} />
                            </div>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 tracking-wider">
                              Tantangan
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-white mb-1">
                            Amunisi Saldo Kasir
                          </h4>
                          <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                            Top up deposit minimal Rp 20.000 langsung di meja operator kasir.
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-zinc-400 font-medium">Progres Misi</span>
                            <span className="text-amber-400 font-bold">0 / 1</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="w-0 h-full bg-amber-400 rounded-full" />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-zinc-400">Hadiah</span>
                            <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              +150 EXP
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quest 3: Sultan Midnight (Event Malam) */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-cyan-950/15 via-zinc-900 to-zinc-950 border border-cyan-500/25 flex flex-col justify-between hover:border-cyan-500/50 transition shadow-sm">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                              <Flame size={18} />
                            </div>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 tracking-wider">
                              Event Malam
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-white mb-1">
                            Sultan Begadang
                          </h4>
                          <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                            Pesan paket billing malam warnet mulai pukul 21.00 WIB ke atas.
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-zinc-400 font-medium">Progres Misi</span>
                            <span className="text-cyan-400 font-bold">0 / 1</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="w-0 h-full bg-cyan-400 rounded-full" />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-zinc-400">Hadiah</span>
                            <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              +200 EXP
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: RIWAYAT BOOKING */}
                {activeTab === "history" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0">
                          <Clock size={20} />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                            Riwayat Pemesanan PC
                          </h3>
                          <p className="text-xs text-zinc-300 font-medium">
                            Daftar tiket dan status antrean bermain lu di GC-Net
                          </p>
                        </div>
                      </div>

                      <Link
                        href="/"
                        className="text-xs font-bold text-nvidia-green hover:underline flex items-center gap-1.5"
                      >
                        <span>Pesan PC Baru</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>

                    {bookings.length === 0 ? (
                      <div className="py-16 text-center border border-dashed border-white/15 rounded-2xl">
                        <Monitor className="mx-auto text-zinc-600 mb-3" size={36} />
                        <p className="text-sm font-bold text-zinc-300 uppercase">Belum ada riwayat booking</p>
                        <p className="text-xs text-zinc-400 mt-1 mb-5">
                          Pesan bilik PC favorit lu sekarang dan nikmati kecepatan warnet
                        </p>
                        <Link
                          href="/"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nvidia-green text-black font-bold text-xs uppercase tracking-wider hover:bg-white transition"
                        >
                          <span>Pilih PC Sekarang</span>
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                        {bookings.map((b) => (
                          <div
                            key={b.id}
                            className="p-4 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-between flex-wrap gap-3 hover:border-zinc-600 transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center text-white font-mono font-bold text-xs shrink-0">
                                {b.pc_id}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-white">
                                    {b.pcs?.name || b.pc_id}
                                  </span>
                                  <span className="text-xs font-mono text-zinc-400 font-bold">
                                    {b.id}
                                  </span>
                                </div>
                                <span className="text-xs text-zinc-300 font-medium block mt-0.5">
                                  {b.pakets?.name || b.paket_id} • {b.pakets?.duration_hours ? `${b.pakets.duration_hours} Jam` : "Paket Standar"}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border block ${
                                b.status === "active"
                                  ? "bg-nvidia-green/15 text-nvidia-green border-nvidia-green/30"
                                  : b.status === "pending"
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : b.status === "completed"
                                  ? "bg-zinc-800 text-zinc-200 border-zinc-700"
                                  : "bg-red-500/15 text-red-300 border-red-500/30"
                              }`}>
                                {b.status === "active"
                                  ? "Sesi Berjalan"
                                  : b.status === "pending"
                                  ? "Menunggu OP"
                                  : b.status === "completed"
                                  ? "Selesai"
                                  : "Dibatalkan"}
                              </span>
                              <span className="text-xs text-zinc-400 font-mono mt-1 block">
                                {new Date(b.created_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: INFO AKUN & KEAMANAN */}
                {activeTab === "profile" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                          Informasi Akun Terdaftar
                        </h3>
                        <p className="text-xs text-zinc-300 font-medium">
                          Data identitas dan keamanan akun pemain
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
                        <span className="text-xs text-zinc-400 uppercase font-black block mb-1">Email Terhubung</span>
                        <span className="text-sm text-white font-bold break-all">{sessionUser.email}</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
                        <span className="text-xs text-zinc-400 uppercase font-black block mb-1">Nomor WhatsApp</span>
                        <span className="text-sm text-white font-bold">{profile?.phone || "Belum diatur"}</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
                        <span className="text-xs text-zinc-400 uppercase font-black block mb-1">Kode Kartu Billing</span>
                        <span className="text-zinc-200 font-mono text-sm font-bold">{memberCode}</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
                        <span className="text-xs text-zinc-400 uppercase font-black block mb-1">Waktu Pendaftaran</span>
                        <span className="text-sm text-white font-bold">
                          {profile?.created_at
                            ? new Date(profile.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                            : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(sessionUser.email || "");
                          setForgotError(null);
                          setForgotSuccess(null);
                          setShowForgotModal(true);
                        }}
                        className="text-xs sm:text-sm text-nvidia-green hover:underline font-bold flex items-center gap-2"
                      >
                        <Key size={16} />
                        <span>Ganti Password</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition"
                      >
                        <LogOut size={14} />
                        <span>Keluar Akun</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        ) : (
          /* ── NOT LOGGED IN: AUTH FORM (LOGIN / REGISTER) ── */
          <div className="max-w-lg mx-auto">
            <div className="p-8 sm:p-10 rounded-3xl bg-zinc-950 border border-white/15 shadow-2xl relative">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-zinc-900 border border-white/10 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${
                    authMode === "login"
                      ? "bg-nvidia-green text-black shadow-md"
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
                  className={`py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${
                    authMode === "register"
                      ? "bg-nvidia-green text-black shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Daftar Baru
                </button>
              </div>

              {/* Feedback Alerts */}
              {errorMessage && (
                <div className="mb-5 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-center gap-2.5">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="mb-5 p-4 rounded-xl bg-nvidia-green/15 border border-nvidia-green/30 text-nvidia-green text-xs sm:text-sm flex items-center gap-2.5">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-4 text-xs sm:text-sm">
                {authMode === "register" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                        Username Billing (IGN)
                      </label>
                      <div className="relative">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          required
                          placeholder="contoh: pro_gamer123"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green transition font-medium"
                        />
                      </div>
                      <span className="text-xs text-zinc-400 block mt-1">
                        Huruf, angka, atau underscore 3 sampai 20 karakter. Digunakan saat login di PC.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        placeholder="Nama asli atau panggilan"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green transition font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                        Nomor WhatsApp
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="tel"
                          placeholder="0812xxxxxxxx"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green transition font-medium"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      required
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green transition font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
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
                        className="text-xs text-nvidia-green hover:underline font-bold"
                      >
                        Lupa Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green transition font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full mt-3 py-3.5 px-4 rounded-xl bg-nvidia-green text-black font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white transition shadow-md active:scale-[0.99]"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : authMode === "login" ? (
                    <>
                      <span>Masuk ke Akun</span>
                      <ArrowRight size={16} />
                    </>
                  ) : (
                    <>
                      <span>Daftar Sekarang</span>
                      <Sparkles size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-white/10 w-full"></div>
                <span className="bg-zinc-950 px-3 text-xs font-bold tracking-widest text-zinc-400 uppercase shrink-0">
                  Atau Lebih Cepat
                </span>
                <div className="border-t border-white/10 w-full"></div>
              </div>

              {/* Google 1-Click Login Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || actionLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-black font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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

              <div className="mt-6 pt-5 border-t border-white/10 text-center">
                <p className="text-xs sm:text-sm text-zinc-300 font-medium">
                  {authMode === "login" ? "Belum punya akun member?" : "Sudah punya akun?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === "login" ? "register" : "login");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-nvidia-green font-black hover:underline ml-1"
                  >
                    {authMode === "login" ? "Daftar di sini" : "Login di sini"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL PANDUAN TOP UP KASIR ── */}
        <AnimatePresence>
          {showTopupInfoModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-zinc-950 border border-white/15 rounded-3xl p-7 sm:p-8 max-w-md w-full shadow-2xl relative"
              >
                <button
                  type="button"
                  onClick={() => setShowTopupInfoModal(false)}
                  className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                      Cara Top Up Saldo Kasir
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-300">
                      Isi saldo deposit akun untuk memesan bilik PC warnet
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs sm:text-sm text-zinc-200 mb-6">
                  <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-nvidia-green/20 text-nvidia-green font-black flex items-center justify-center shrink-0 text-xs">
                      1
                    </div>
                    <div>
                      <span className="font-black text-white block mb-0.5">Kunjungi Meja Operator</span>
                      Datangi kasir warnet dan sebutkan nickname akun ({profile?.username || "nama"}) atau kode ID {memberCode}.
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-nvidia-green/20 text-nvidia-green font-black flex items-center justify-center shrink-0 text-xs">
                      2
                    </div>
                    <div>
                      <span className="font-black text-white block mb-0.5">Pilih Nominal Pengisian</span>
                      Minimal top up Rp 5.000 dan maksimal saldo akun dibatasi Rp 1.000.000 demi keamanan.
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-nvidia-green/20 text-nvidia-green font-black flex items-center justify-center shrink-0 text-xs">
                      3
                    </div>
                    <div>
                      <span className="font-black text-white block mb-0.5">Saldo Masuk Seketika</span>
                      Operator akan memproses pembayaran tunai atau QRIS, dan saldo langsung bertambah di portal member ini.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCopyMemberId(memberCode)}
                    className="flex-1 py-3.5 rounded-xl bg-nvidia-green hover:bg-white text-black font-black text-xs sm:text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
                  >
                    {copiedId ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedId ? "ID Tersalin" : "Salin ID Member"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTopupInfoModal(false)}
                    className="px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition border border-white/10"
                  >
                    Mengerti
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MODAL UBAH DATA DIRI ── */}
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
                className="bg-zinc-950 border border-white/15 rounded-3xl p-7 sm:p-8 max-w-md w-full shadow-2xl relative"
              >
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0">
                    <Gamepad2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                      {isFirstTimeSetup ? "Lengkapi Identitas Member" : "Ubah Data Diri Member"}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-300">
                      {isFirstTimeSetup
                        ? "Atur nickname gaming dan nomor WhatsApp lu untuk sistem billing warnet"
                        : "Perbarui identitas akun pemain GC-Net lu"}
                    </p>
                  </div>
                </div>

                {modalError && (
                  <div className="mb-4 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Nickname Gaming (IGN)
                    </label>
                    <div className="relative">
                      <Gamepad2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type="text"
                        value={modalUsername}
                        onChange={(e) => setModalUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        placeholder="contoh: mindzevo, alucard_pro"
                        className="w-full bg-zinc-900 border border-white/10 focus:border-nvidia-green pl-10 pr-4 py-3 rounded-xl text-xs sm:text-sm font-bold text-white outline-none transition placeholder:text-zinc-500"
                        maxLength={20}
                        required
                      />
                    </div>
                    <span className="text-xs text-zinc-400 block mt-1">
                      Hanya huruf kecil, angka, dan garis bawah 3 sampai 20 karakter. Tampil di PC warnet.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Nama Lengkap
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type="text"
                        value={modalFullName}
                        onChange={(e) => setModalFullName(e.target.value)}
                        placeholder="Nama asli lu"
                        className="w-full bg-zinc-900 border border-white/10 focus:border-nvidia-green pl-10 pr-4 py-3 rounded-xl text-xs sm:text-sm font-bold text-white outline-none transition placeholder:text-zinc-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Nomor WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type="tel"
                        value={modalPhone}
                        onChange={(e) => setModalPhone(e.target.value)}
                        placeholder="081234567890"
                        className="w-full bg-zinc-900 border border-white/10 focus:border-nvidia-green pl-10 pr-4 py-3 rounded-xl text-xs sm:text-sm font-bold text-white outline-none transition placeholder:text-zinc-500"
                        required
                      />
                    </div>
                    <span className="text-xs text-zinc-400 block mt-1">
                      Operator warnet akan memanggil atau konfirmasi antrean via nomor ini.
                    </span>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3">
                    {isFirstTimeSetup ? (
                      <button
                        type="button"
                        onClick={() => setShowProfileModal(false)}
                        className="px-5 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-xs sm:text-sm font-bold uppercase transition"
                      >
                        Nanti Saja
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowProfileModal(false)}
                        className="px-5 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-xs sm:text-sm font-bold uppercase transition"
                      >
                        Batal
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="px-6 py-3 rounded-xl bg-nvidia-green hover:bg-white text-black font-black text-xs sm:text-sm uppercase tracking-wider transition shadow-md flex items-center gap-2"
                    >
                      {modalLoading ? (
                        <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
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

        {/* ── MODAL LUPA PASSWORD ── */}
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
                className="w-full max-w-md bg-zinc-950 border border-white/15 rounded-3xl p-7 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/15 text-nvidia-green flex items-center justify-center">
                      <Key size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Pemulihan Password</h3>
                      <p className="text-xs text-zinc-300">Kirim tautan reset kata sandi ke email akun</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </div>

                {forgotError && (
                  <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotSuccess && (
                  <div className="p-4 rounded-xl bg-nvidia-green/15 border border-nvidia-green/30 text-nvidia-green text-xs sm:text-sm flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{forgotSuccess}</span>
                  </div>
                )}

                {!forgotSuccess ? (
                  <form onSubmit={handleSendForgotPasswordEmail} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                        Alamat Email Akun
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="nama@email.com"
                          className="w-full bg-zinc-900 border border-white/10 focus:border-nvidia-green pl-10 pr-4 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white outline-none transition placeholder:text-zinc-500"
                          required
                        />
                      </div>
                      <span className="text-xs text-zinc-400 block mt-1.5">
                        Tautan khusus untuk menyetel ulang password akan dikirim ke alamat email ini.
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(false)}
                        className="px-5 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-xs sm:text-sm font-bold transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingForgot}
                        className="px-6 py-3 rounded-xl bg-nvidia-green hover:bg-white text-black font-black text-xs sm:text-sm uppercase tracking-wider transition shadow-md flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSendingForgot ? (
                          <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                        ) : (
                          <>
                            <span>Kirim Tautan</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold transition border border-white/10"
                    >
                      Tutup
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MODAL SETEL ULANG PASSWORD DARI LINK RECOVERY ── */}
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
                className="w-full max-w-md bg-zinc-950 border border-white/15 rounded-3xl p-7 shadow-2xl space-y-5"
              >
                <div className="flex items-center gap-3.5 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/15 text-nvidia-green flex items-center justify-center">
                    <Key size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Buat Password Baru</h3>
                    <p className="text-xs text-zinc-300">Atur kata sandi baru untuk akun GC-Net lu</p>
                  </div>
                </div>

                {recoveryError && (
                  <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                {recoverySuccess && (
                  <div className="p-4 rounded-xl bg-nvidia-green/15 border border-nvidia-green/30 text-nvidia-green text-xs sm:text-sm flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{recoverySuccess}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateRecoveryPassword} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Password Baru
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type={showRecoveryPassword ? "text" : "password"}
                        value={newRecoveryPassword}
                        onChange={(e) => setNewRecoveryPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-zinc-900 border border-white/10 focus:border-nvidia-green pl-10 pr-10 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white outline-none transition placeholder:text-zinc-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoveryPassword(!showRecoveryPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                      >
                        {showRecoveryPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Ulangi Password Baru
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type={showRecoveryPassword ? "text" : "password"}
                        value={confirmRecoveryPassword}
                        onChange={(e) => setConfirmRecoveryPassword(e.target.value)}
                        placeholder="Ulangi kata sandi di atas"
                        className="w-full bg-zinc-900 border border-white/10 focus:border-nvidia-green pl-10 pr-10 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white outline-none transition placeholder:text-zinc-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="w-full py-3.5 rounded-xl bg-nvidia-green hover:bg-white text-black font-black text-xs sm:text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isUpdatingPassword ? (
                        <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
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
