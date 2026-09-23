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
  ChevronLeft,
  ChevronRight,
  Monitor,
  Gift,
  Headphones,
  LogIn,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import FloatingChatMessenger from "@/components/chat/FloatingChatMessenger";

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
      title: "Starter",
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
      title: "Scout",
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
      title: "Striker",
      badgeBg: "bg-yellow-500/20",
      badgeText: "text-yellow-300",
      badgeBorder: "border-yellow-500/40",
      min: 150000,
      max: 350000,
      nextTier: "PLATINUM",
      nextThreshold: 350000,
      perks: [
        "Akses bilik PC VIP",
        "Badge rank di layar PC",
        "Prioritas antrean kasir"
      ]
    };
  }

  if (safeBalance <= 700000) {
    return {
      name: "PLATINUM",
      title: "Elite",
      badgeBg: "bg-cyan-500/20",
      badgeText: "text-cyan-300",
      badgeBorder: "border-cyan-500/40",
      min: 350000,
      max: 700000,
      nextTier: "DIAMOND",
      nextThreshold: 700000,
      perks: [
        "Prioritas penuh booking PC",
        "Akses bilik PC VIP",
        "Layanan kasir prioritas"
      ]
    };
  }

  return {
    name: "DIAMOND",
    title: "Champion",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/40",
    min: 700000,
    max: 1000000,
    nextTier: null,
    nextThreshold: null,
    perks: [
      "Akses bebas seluruh workstation PC",
      "Layanan prioritas operator kasir",
      "Badge champion eksklusif",
      "Prioritas antrean utama"
    ]
  };
}

interface RankRoadmapItem {
  name: string;
  title: string;
  threshold: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const ALL_RANKS: RankRoadmapItem[] = [
  { name: "BRONZE", title: "Starter", threshold: 0, badgeBg: "bg-amber-500/15", badgeText: "text-amber-300", badgeBorder: "border-amber-500/30" },
  { name: "SILVER", title: "Scout", threshold: 50000, badgeBg: "bg-slate-300/15", badgeText: "text-slate-200", badgeBorder: "border-slate-300/30" },
  { name: "GOLD", title: "Striker", threshold: 150000, badgeBg: "bg-yellow-500/15", badgeText: "text-yellow-300", badgeBorder: "border-yellow-500/30" },
  { name: "PLATINUM", title: "Elite", threshold: 350000, badgeBg: "bg-cyan-500/15", badgeText: "text-cyan-300", badgeBorder: "border-cyan-500/30" },
  { name: "DIAMOND", title: "Champion", threshold: 700000, badgeBg: "bg-emerald-500/15", badgeText: "text-emerald-300", badgeBorder: "border-emerald-500/30" },
];

interface DailyQuestItem {
  id: string;
  tag: string;
  title: string;
  desc: string;
  icon: any;
  status: "completed" | "in_progress";
  progressCurrent: number;
  progressMax: number;
  rewardExp: number;
  theme: {
    accent: string;
    bgGradient: string;
    border: string;
    borderActive: string;
    glow: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    iconBg: string;
    iconText: string;
    barColor: string;
    tagColor: string;
  };
}

const DAILY_QUESTS: DailyQuestItem[] = [
  {
    id: "quest-1",
    tag: "SELESAI",
    title: "Login Harian",
    desc: "Masuk ke akun member dan aktifkan sesi bermain hari ini.",
    icon: CheckCircle2,
    status: "completed",
    progressCurrent: 1,
    progressMax: 1,
    rewardExp: 50,
    theme: {
      accent: "text-nvidia-green",
      bgGradient: "from-emerald-950/40 via-zinc-900 to-zinc-950",
      border: "border-emerald-500/30",
      borderActive: "border-nvidia-green shadow-[0_0_25px_rgba(118,185,0,0.25)]",
      glow: "bg-emerald-500/20",
      badgeBg: "bg-nvidia-green/20",
      badgeText: "text-nvidia-green",
      badgeBorder: "border-nvidia-green/40",
      iconBg: "bg-emerald-500/20",
      iconText: "text-nvidia-green",
      barColor: "bg-nvidia-green",
      tagColor: "text-nvidia-green",
    }
  },
  {
    id: "quest-2",
    tag: "TANTANGAN",
    title: "Top Up Saldo",
    desc: "Isi ulang saldo deposit minimal Rp 20.000 langsung di kasir.",
    icon: Zap,
    status: "in_progress",
    progressCurrent: 0,
    progressMax: 1,
    rewardExp: 150,
    theme: {
      accent: "text-amber-400",
      bgGradient: "from-amber-950/30 via-zinc-900 to-zinc-950",
      border: "border-amber-500/30",
      borderActive: "border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.25)]",
      glow: "bg-amber-500/20",
      badgeBg: "bg-amber-500/15",
      badgeText: "text-amber-300",
      badgeBorder: "border-amber-500/30",
      iconBg: "bg-amber-500/15",
      iconText: "text-amber-400",
      barColor: "bg-amber-400",
      tagColor: "text-amber-300",
    }
  },
  {
    id: "quest-3",
    tag: "PAKET MALAM",
    title: "Sesi Begadang",
    desc: "Pesan paket billing malam warnet mulai pukul 21.00 WIB ke atas.",
    icon: Flame,
    status: "in_progress",
    progressCurrent: 0,
    progressMax: 1,
    rewardExp: 200,
    theme: {
      accent: "text-cyan-400",
      bgGradient: "from-cyan-950/30 via-zinc-900 to-zinc-950",
      border: "border-cyan-500/30",
      borderActive: "border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.25)]",
      glow: "bg-cyan-500/20",
      badgeBg: "bg-cyan-500/15",
      badgeText: "text-cyan-300",
      badgeBorder: "border-cyan-500/30",
      iconBg: "bg-cyan-500/15",
      iconText: "text-cyan-400",
      barColor: "bg-cyan-400",
      tagColor: "text-cyan-300",
    }
  }
];

export default function MemberPage() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [bookings, setBookings] = useState<MemberBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Active Dashboard Tab & 3D Transition Direction
  const [activeTab, setActiveTab] = useState<"level" | "history" | "quests" | "profile">("quests");
  const [tabDirection, setTabDirection] = useState<number>(1);

  const DASHBOARD_TABS = [
    { id: "quests", label: "Misi Warnet" },
    { id: "level", label: "Pangkat & Benefit" },
    { id: "history", label: "Riwayat Booking" },
    { id: "profile", label: "Info Akun" },
  ] as const;

  const handleTabChange = (newTab: "level" | "history" | "quests" | "profile") => {
    if (newTab === activeTab) return;
    const currentIndex = DASHBOARD_TABS.findIndex((t) => t.id === activeTab);
    const newIndex = DASHBOARD_TABS.findIndex((t) => t.id === newTab);
    setTabDirection(newIndex > currentIndex ? 1 : -1);
    setActiveTab(newTab);
  };

  // 3D Quest Carousel Active Index
  const [activeQuestIndex, setActiveQuestIndex] = useState(0);

  const handlePrevQuest = () => {
    setActiveQuestIndex((prev) => (prev > 0 ? prev - 1 : DAILY_QUESTS.length - 1));
  };

  const handleNextQuest = () => {
    setActiveQuestIndex((prev) => (prev < DAILY_QUESTS.length - 1 ? prev + 1 : 0));
  };

  // 3D Card Interactive Tilt State
  const [cardTilt, setCardTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -(y / (rect.height / 2)) * 6;
    const rotateY = (x / (rect.width / 2)) * 6;
    const glareX = ((e.clientX - rect.left) / rect.width) * 100;
    const glareY = ((e.clientY - rect.top) / rect.height) * 100;
    setCardTilt({ rotateX, rotateY, glareX, glareY });
  };

  const handleCardMouseLeave = () => {
    setCardTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

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

  // Floating Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);

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

  // Dynamic Calculation: PC Jagoan & Paket Andalan dari riwayat booking
  const pcCounts: Record<string, number> = {};
  const paketCounts: Record<string, number> = {};
  bookings.forEach((b) => {
    if (b.pcs?.name) pcCounts[b.pcs.name] = (pcCounts[b.pcs.name] || 0) + 1;
    if (b.pakets?.name) paketCounts[b.pakets.name] = (paketCounts[b.pakets.name] || 0) + 1;
  });

  let favoritePc = "Belum Ada";
  let maxPcCount = 0;
  Object.entries(pcCounts).forEach(([name, count]) => {
    if (count > maxPcCount) {
      maxPcCount = count;
      favoritePc = name;
    }
  });

  let favoritePaket = "Belum Ada";
  let maxPaketCount = 0;
  Object.entries(paketCounts).forEach(([name, count]) => {
    if (count > maxPaketCount) {
      maxPaketCount = count;
      favoritePaket = name;
    }
  });

  return (
    <div className="min-h-screen bg-black text-white selection:bg-nvidia-green selection:text-black py-8 px-4 sm:px-6 lg:px-10 relative flex flex-col">
      
      {/* Container Lebar Nyaman untuk Monitor Standar maupun Ultrawide 21:9 */}
      <div className="w-full max-w-7xl mx-auto space-y-6 flex-1 flex flex-col">
        
        {/* Navigation Breadcrumb & Header */}
        <header className="flex items-center justify-between pb-5 border-b border-white/10 flex-wrap gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0 shadow-sm">
              <Gamepad2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-white">Portal Member GC-Net</h1>
              </div>
              <p className="text-sm text-zinc-300 font-medium mt-0.5">Akun member dan saldo deposit GC-Net</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            {sessionUser && (
              <button
                type="button"
                onClick={() => setShowTopupInfoModal(true)}
                className="text-xs sm:text-sm font-bold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/15 transition flex items-center gap-2 uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-sm"
              >
                <CreditCard size={15} className="text-nvidia-green" />
                <span>Isi Saldo</span>
              </button>
            )}
            <Link
              href="/"
              className="text-xs sm:text-sm font-black text-black bg-nvidia-green hover:bg-white transition flex items-center gap-2 uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Booking PC</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </header>

        {sessionUser ? (
          /* ── LOGGED IN: 2-TIER COHESIVE DASHBOARD ── */
          <div className="space-y-6 flex-1 flex flex-col">
            
            {/* ── TINGKAT 1: PANGGUNG KOKPIT GAMER (EQUAL HEIGHT BALANCED SPLIT) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch shrink-0">
              
              {/* PANEL KIRI: KARTU MEMBER VIP 3D (5 KOLOM) */}
              <div 
                className="lg:col-span-5 relative rounded-3xl p-[1px] group transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_22px_55px_-10px_rgba(0,0,0,0.9),0_0_35px_rgba(118,185,0,0.18)] flex flex-col min-h-[490px] sm:min-h-[510px]"
                style={{ perspective: "1000px" }}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                {/* Static Base Border */}
                <div className="absolute inset-0 rounded-3xl bg-white/10 pointer-events-none" />

                {/* Dynamic Motion Spotlight Border: Kilau Hijau HANYA Menyala Mengikuti Arah Kursor/Motion */}
                <div 
                  className="absolute inset-0 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(320px circle at ${cardTilt.glareX}% ${cardTilt.glareY}%, rgba(118, 185, 0, 0.95), rgba(118, 185, 0, 0.2) 45%, transparent 70%)`,
                  }}
                />

                {/* Kartu Utama Berlatar Hitam Solid (Proporsional & Elegan) */}
                <div className="relative w-full h-full rounded-[23px] bg-zinc-950 p-6 sm:p-7 overflow-hidden flex flex-col justify-between">
                  {/* Lapisan Kaca Depan: Kilau Mouse Hover Murni Abu-abu Kaca Transparan Di Permukaan */}
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 rounded-[23px] overflow-hidden"
                    style={{
                      background: `radial-gradient(400px circle at ${cardTilt.glareX}% ${cardTilt.glareY}%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 45%, transparent 70%)`,
                    }}
                  />

                  {/* 3D Tilting Inner Card Wrapper */}
                  <div 
                    className="h-full flex flex-col justify-between space-y-4 transition-transform duration-100 ease-out relative z-30"
                    style={{
                      transform: `rotateX(${cardTilt.rotateX}deg) rotateY(${cardTilt.rotateY}deg)`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                  {/* Header Kartu: Sim Chip & Status Rank Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-7 rounded bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 p-0.5 flex items-center justify-center shrink-0 shadow-sm">
                        <div className="w-full h-full border border-amber-950/40 rounded-[2px] grid grid-cols-2 gap-0.5 p-0.5 opacity-80">
                          <div className="border-r border-b border-amber-950/40" />
                          <div className="border-b border-amber-950/40" />
                          <div className="border-r border-amber-950/40" />
                          <div />
                        </div>
                      </div>
                      <span className="text-xs font-mono tracking-widest text-zinc-300 uppercase font-bold">
                        GC MEMBER ID
                      </span>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${currentTier.badgeBg} ${currentTier.badgeText} ${currentTier.badgeBorder} shadow-sm`}>
                      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                      <span className="font-mono font-bold tracking-wider text-xs uppercase">{currentTier.name}</span>
                    </div>
                  </div>

                  {/* Nickname & Identitas Akun (Hero Player Treatment) */}
                  <div className="flex items-center gap-3.5 pt-1">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/20 flex items-center justify-center text-white font-black text-2xl shrink-0 shadow-md ring-1 ring-white/10">
                      {(profile?.username?.[0] || sessionUser.email?.[0] || "G").toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase truncate">
                          {profile?.username || sessionUser.email?.split("@")[0]}
                        </h2>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-nvidia-green/15 border border-nvidia-green/30 text-nvidia-green text-xs font-bold tracking-wide shrink-0">
                          <CheckCircle2 size={13} className="text-nvidia-green shrink-0" />
                          <span>Verified</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 truncate">
                        <span className="text-xs sm:text-sm text-zinc-200 font-bold">
                          {currentTier.title}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <p className="text-xs sm:text-sm text-zinc-400 font-medium truncate">
                          {profile?.full_name || sessionUser.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Saldo Deposit */}
                  <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-4 sm:p-5 backdrop-blur-sm">
                    {/* Baris Atas Saldo: Label & ID Member */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs uppercase text-zinc-400 font-bold tracking-wider">
                        Saldo Deposit
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopyMemberId(memberCode)}
                        title="Salin ID Member"
                        className="px-2.5 py-1 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1.5 shrink-0 active:scale-95"
                      >
                        <span className="font-mono font-bold text-xs text-zinc-200">{memberCode}</span>
                        {copiedId ? (
                          <Check size={12} className="text-nvidia-green" />
                        ) : (
                          <Copy size={12} className="text-zinc-400" />
                        )}
                      </button>
                    </div>

                    {/* Nilai Saldo Hero Gold */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-black text-amber-400 font-mono tracking-wider">
                        IDR
                      </span>
                      <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(251,191,36,0.3)]">
                        {currentBalance.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* HUD Progres Rank Member: Proporsional & Seamless */}
                  <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-4 backdrop-blur-sm space-y-2.5 relative overflow-hidden group/rank">
                    <div className="absolute inset-0 bg-gradient-to-r from-nvidia-green/5 via-cyan-400/5 to-transparent opacity-0 group-hover/rank:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Header Progress: Label Rank & Persentase */}
                    <div className="flex items-center justify-between text-xs relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                          Rank {currentTier.name}
                        </span>
                        {currentTier.nextTier && (
                          <span className="text-xs text-zinc-400 font-medium">
                            menuju {currentTier.nextTier}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-black text-white text-sm">
                        {progressPercent}%
                      </span>
                    </div>

                    {/* Track Bar Animasi Luminous Shimmer */}
                    <div className="w-full h-2.5 rounded-full bg-black/80 border border-white/10 p-0.5 overflow-hidden relative z-10">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-nvidia-green via-emerald-400 to-cyan-400 transition-all duration-700 relative overflow-hidden shadow-[0_0_10px_rgba(118,185,0,0.4)]"
                        style={{ width: `${Math.max(4, progressPercent)}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
                      </div>
                    </div>

                    {/* Footer Threshold: IDR Current & Target */}
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-mono relative z-10">
                      <span>IDR {currentBalance.toLocaleString("id-ID")}</span>
                      {currentTier.nextTier ? (
                        <span className="text-zinc-300 font-medium">
                          Isi IDR {remainingToNext.toLocaleString("id-ID")} lagi
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold">Pangkat Tertinggi</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* PANEL KANAN: PANEL COMMAND HUD GAMER (7 KOLOM) */}
            <div className="lg:col-span-7 rounded-3xl bg-zinc-950 border border-white/15 p-6 sm:p-7 shadow-xl flex flex-col justify-between relative overflow-hidden group min-h-[490px] sm:min-h-[510px]">
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-nvidia-green/10 rounded-full blur-3xl pointer-events-none group-hover:bg-nvidia-green/15 transition-all duration-500" />

              {/* Header HUD */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shadow-sm">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wider">
                      Status & Aktivitas Member
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium">
                      Ringkasan preferensi bermain di GC-Net
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-nvidia-green animate-pulse" />
                  <span className="text-xs font-mono font-bold text-zinc-300 uppercase">
                    10 Unit Aktif
                  </span>
                </div>
              </div>

              {/* Grid 4 Kartu Interaktif Beranimasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-4 relative z-10 flex-1 content-center">
                {/* 1. PC Jagoan */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="p-4 sm:p-4.5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900/90 border border-white/10 hover:border-emerald-500/40 transition-all duration-200 shadow-sm space-y-2 cursor-default group/card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Monitor size={16} />
                      </div>
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        PC Jagoan
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Favorit
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono tracking-tight pt-0.5">
                    {favoritePc}
                  </div>
                  <p className="text-xs text-zinc-400 font-medium">
                    Meja gaming yang paling sering lu pesan
                  </p>
                </motion.div>

                {/* 2. Paket Andalan */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="p-4 sm:p-4.5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900/90 border border-white/10 hover:border-amber-500/40 transition-all duration-200 shadow-sm space-y-2 cursor-default group/card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Clock size={16} />
                      </div>
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Paket Andalan
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      Billing
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white truncate tracking-tight pt-0.5">
                    {favoritePaket}
                  </div>
                  <p className="text-xs text-zinc-400 font-medium truncate">
                    Pilihan paket main yang paling rutin lu ambil
                  </p>
                </motion.div>

                {/* 3. Privilese Pangkat */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="p-4 sm:p-4.5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900/90 border border-white/10 hover:border-cyan-500/40 transition-all duration-200 shadow-sm space-y-2 cursor-default group/card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <ShieldCheck size={16} />
                      </div>
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Privilese {currentTier.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                      {currentTier.title}
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-white tracking-tight pt-0.5 truncate">
                    {currentTier.perks?.[0] || "Akses standard billing"}
                  </div>
                  <p className="text-xs text-zinc-400 font-medium truncate">
                    Hak istimewa aktif member pangkat {currentTier.name}
                  </p>
                </motion.div>

                {/* 4. Akses Chat Operator Kasir */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsChatOpen(true)}
                  className="p-4 sm:p-4.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-nvidia-green/40 hover:border-nvidia-green text-left transition-all duration-200 shadow-md space-y-2 flex flex-col justify-between group/chat cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-nvidia-green/15 border border-nvidia-green/30 flex items-center justify-center text-nvidia-green">
                        <Headphones size={16} className="group-hover/chat:rotate-12 transition-transform duration-300" />
                      </div>
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Chat Operator Kasir
                      </span>
                    </div>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-nvidia-green" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between w-full pt-0.5">
                    <span className="text-sm sm:text-base font-black text-white uppercase tracking-wide group-hover/chat:text-nvidia-green transition-colors">
                      Buka Pesan Kasir
                    </span>
                    <ArrowRight size={16} className="text-zinc-400 group-hover/chat:text-nvidia-green group-hover/chat:translate-x-1 transition-all" />
                  </div>
                  <p className="text-xs text-zinc-400 font-medium">
                    Bantuan cepat seputar PC dan pesanan
                  </p>
                </motion.button>
              </div>

              {/* Footer Mini HUD */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-zinc-400 font-mono relative z-10">
                <span>Member ID: {memberCode}</span>
                <span className="text-zinc-300 font-medium">Total Booking: {bookings.length} Pesanan</span>
              </div>
            </div>

          </div>

          {/* ── TINGKAT 2: PANGGUNG TAB HUB AKTIVITAS LEBAR PENUH (FUL KE BAWAH & 3D GESER) ── */}
          <div className="rounded-3xl bg-zinc-950 border border-white/15 p-5 sm:p-6 shadow-xl flex-1 flex flex-col justify-between min-h-[460px] sm:min-h-[520px]">
            
            {/* Header Tab Terintegrasi dengan Animasi Sliding Pill */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-white/10 overflow-x-auto relative shrink-0">
              {DASHBOARD_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative flex-1 py-2.5 px-3 text-xs sm:text-sm font-black uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap z-10 cursor-pointer ${
                      isActive ? "text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-nvidia-green rounded-lg shadow-md z-[-1]"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Konten Tab dengan Animasi Geser 3D Berperspektif */}
            <div className="flex-1 flex flex-col relative overflow-hidden mt-4" style={{ perspective: "1200px" }}>
              <AnimatePresence mode="wait" custom={tabDirection}>
                <motion.div
                  key={activeTab}
                  custom={tabDirection}
                  variants={{
                    enter: (dir: number) => ({
                      x: dir > 0 ? "40%" : "-40%",
                      rotateY: dir > 0 ? 25 : -25,
                      opacity: 0,
                      scale: 0.94,
                      filter: "blur(2px)",
                    }),
                    center: {
                      x: 0,
                      rotateY: 0,
                      opacity: 1,
                      scale: 1,
                      filter: "blur(0px)",
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 28,
                        mass: 0.7,
                      },
                    },
                    exit: (dir: number) => ({
                      x: dir > 0 ? "-40%" : "40%",
                      rotateY: dir > 0 ? -25 : 25,
                      opacity: 0,
                      scale: 0.94,
                      filter: "blur(2px)",
                      transition: {
                        duration: 0.2,
                        ease: "easeInOut",
                      },
                    }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  style={{ transformStyle: "preserve-3d" }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    const threshold = 50;
                    const currentIndex = DASHBOARD_TABS.findIndex((t) => t.id === activeTab);
                    if (info.offset.x < -threshold && currentIndex < DASHBOARD_TABS.length - 1) {
                      handleTabChange(DASHBOARD_TABS[currentIndex + 1].id);
                    } else if (info.offset.x > threshold && currentIndex > 0) {
                      handleTabChange(DASHBOARD_TABS[currentIndex - 1].id);
                    }
                  }}
                  className="flex-1 flex flex-col justify-between w-full select-none"
                >
                
                {/* TAB 1: PANGKAT & BENEFIT */}
                {activeTab === "level" && (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    {/* Header Pangkat Tanpa Kata Tier */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0 shadow-sm">
                          <Trophy size={18} />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                            Pangkat Akun
                          </h3>
                          <p className="text-xs text-zinc-400 font-medium">
                            Kumpulkan saldo deposit untuk naik pangkat dan buka prioritas PC
                          </p>
                        </div>
                      </div>

                      <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${currentTier.badgeBg} ${currentTier.badgeText} ${currentTier.badgeBorder} tracking-wider`}>
                        {currentTier.name}
                      </span>
                    </div>

                    {/* Tangga Pangkat Gamer: Seamless & Spacious */}
                    <div className="space-y-2 flex-1 flex flex-col justify-center">
                      <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider block">
                        Daftar Tingkatan Pangkat
                      </span>
                      <div className="space-y-2">
                        {ALL_RANKS.map((rank, idx) => {
                          const isCurrent = currentTier.name === rank.name;
                          const isUnlocked = currentBalance >= rank.threshold;
                          return (
                            <div 
                              key={idx}
                              className={`p-3 px-4 rounded-xl border transition flex items-center justify-between gap-3 ${
                                isCurrent
                                  ? "bg-zinc-900 border-nvidia-green/50 shadow-[0_0_20px_rgba(118,185,0,0.14)]"
                                  : isUnlocked
                                  ? "bg-zinc-950/60 border-white/10 hover:border-white/20"
                                  : "bg-zinc-950/30 border-white/5 opacity-55"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${rank.badgeBg} ${rank.badgeText} ${rank.badgeBorder} tracking-wider shrink-0`}>
                                  {rank.name}
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-white truncate">
                                  {rank.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs sm:text-sm font-mono text-zinc-400">
                                  {rank.threshold === 0 ? "Akun Baru" : `IDR ${rank.threshold.toLocaleString("id-ID")}`}
                                </span>
                                {isCurrent ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-nvidia-green/15 text-nvidia-green text-[10px] font-bold border border-nvidia-green/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-nvidia-green animate-pulse" />
                                    <span>Aktif</span>
                                  </span>
                                ) : isUnlocked ? (
                                  <span className="text-emerald-400 text-xs flex items-center gap-1 font-bold">
                                    <Check size={13} />
                                    <span className="text-[10px] hidden sm:inline">Terbuka</span>
                                  </span>
                                ) : (
                                  <span className="text-zinc-500 text-[10px] font-bold uppercase">
                                    Terkunci
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ringkasan Booking Member: Seamless */}
                    <div className="flex items-center justify-between p-3.5 px-4 rounded-xl bg-zinc-900/60 border border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                          <Flame size={15} />
                        </div>
                        <span className="text-xs font-bold uppercase text-zinc-300 tracking-wider">
                          Total Booking Selesai
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5 font-mono">
                        <span className="text-base sm:text-lg font-black text-white">{bookings.length}</span>
                        <span className="text-xs text-zinc-400 font-medium">Pesanan</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MISI WARNET */}
                {activeTab === "quests" && (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0">
                          <Gift size={18} />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                            Misi Harian
                          </h3>
                          <p className="text-xs text-zinc-300 font-medium">
                            Selesaikan misi harian untuk mengumpulkan EXP akun
                          </p>
                        </div>
                      </div>

                      <span className="hidden sm:inline-flex text-[11px] font-mono font-bold text-zinc-400 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10">
                        RESET 24 JAM
                      </span>
                    </div>

                    {/* 3D Quest Coverflow Carousel Stage: Fulin Ke Bawah */}
                    <div className="relative w-full flex-1 min-h-[290px] sm:min-h-[330px] flex items-center justify-center overflow-hidden rounded-2xl bg-zinc-950/40 border border-white/5" style={{ perspective: "1000px" }}>
                      {/* Dynamic Atmospheric Glow */}
                      <div 
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] ${DAILY_QUESTS[activeQuestIndex].theme.glow} blur-[90px] rounded-full pointer-events-none transition-colors duration-700`} 
                      />

                      {/* Nav Button Left */}
                      <button
                        type="button"
                        onClick={handlePrevQuest}
                        aria-label="Misi Sebelumnya"
                        className="absolute left-3 z-40 w-10 h-10 rounded-xl bg-black/60 hover:bg-zinc-800 border border-white/15 text-white flex items-center justify-center transition shadow-lg active:scale-95"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      {/* Nav Button Right */}
                      <button
                        type="button"
                        onClick={handleNextQuest}
                        aria-label="Misi Selanjutnya"
                        className="absolute right-3 z-40 w-10 h-10 rounded-xl bg-black/60 hover:bg-zinc-800 border border-white/15 text-white flex items-center justify-center transition shadow-lg active:scale-95"
                      >
                        <ChevronRight size={20} />
                      </button>

                      {/* 3D Track */}
                      <div className="relative w-full h-full flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
                        <AnimatePresence initial={false}>
                          {DAILY_QUESTS.map((quest, index) => {
                            const offset = index - activeQuestIndex;
                            const isActive = offset === 0;
                            const IconComponent = quest.icon;

                            // 3D placement logic
                            const x = offset * 230;
                            const rotateY = offset * -28;
                            const scale = isActive ? 1.05 : 0.86;
                            const zIndex = isActive ? 30 : 10;
                            const opacity = isActive ? 1 : 0.45;

                            return (
                              <motion.div
                                key={quest.id}
                                onClick={() => setActiveQuestIndex(index)}
                                className={`absolute w-[280px] sm:w-[320px] p-5 sm:p-6 rounded-3xl bg-gradient-to-b ${quest.theme.bgGradient} border ${isActive ? quest.theme.borderActive : quest.theme.border} cursor-pointer transition-colors duration-300 shadow-2xl flex flex-col justify-between select-none`}
                                style={{
                                  zIndex,
                                  transformOrigin: "center center",
                                }}
                                animate={{
                                  x,
                                  rotateY,
                                  scale,
                                  opacity,
                                  rotateZ: isActive ? 0 : offset * -2,
                                }}
                                transition={{
                                  type: "spring",
                                  stiffness: 260,
                                  damping: 24,
                                }}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className={`w-10 h-10 rounded-2xl ${quest.theme.iconBg} border border-white/10 flex items-center justify-center ${quest.theme.iconText} shrink-0 shadow-inner`}>
                                      <IconComponent size={20} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${quest.theme.badgeBg} ${quest.theme.badgeText} border ${quest.theme.badgeBorder} tracking-wider`}>
                                      {quest.tag}
                                    </span>
                                  </div>

                                  <h4 className="text-base sm:text-lg font-black text-white mb-1.5">
                                    {quest.title}
                                  </h4>
                                  <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                                    {quest.desc}
                                  </p>
                                </div>

                                <div className="mt-4 pt-3.5 border-t border-white/10 space-y-2.5">
                                  <div className="flex items-center justify-between text-xs font-mono">
                                    <span className="text-zinc-400 font-medium">Progres</span>
                                    <span className={`${quest.theme.accent} font-bold`}>
                                      {quest.progressCurrent} / {quest.progressMax}
                                    </span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden p-0.5">
                                    <div
                                      className={`h-full rounded-full ${quest.theme.barColor} transition-all duration-500`}
                                      style={{ width: `${(quest.progressCurrent / quest.progressMax) * 100}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">Hadiah</span>
                                    <span className={`text-xs font-mono font-black ${quest.theme.tagColor} ${quest.theme.badgeBg} px-2.5 py-0.5 rounded-md border ${quest.theme.badgeBorder}`}>
                                      +{quest.rewardExp} EXP
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: RIWAYAT BOOKING */}
                {activeTab === "history" && (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0">
                          <Clock size={18} />
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
                      <div className="py-16 text-center border border-dashed border-white/15 rounded-2xl flex-1 flex flex-col items-center justify-center">
                        <Monitor className="mx-auto text-zinc-600 mb-3" size={36} />
                        <p className="text-sm font-bold text-zinc-300 uppercase">Belum ada riwayat booking</p>
                        <p className="text-xs text-zinc-400 mt-1 mb-4">
                          Pesan PC favorit lu sekarang dan nikmati kecepatan gaming premium
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
                      <div className="space-y-3 flex-1 max-h-[380px] overflow-y-auto pr-1">
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
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center text-nvidia-green shrink-0">
                        <ShieldCheck size={18} />
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 flex-1 content-center">
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
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={openEditModal}
                          className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition"
                        >
                          <Pencil size={14} className="text-cyan-400 shrink-0" />
                          <span>Ubah Profil</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(sessionUser.email || "");
                            setForgotError(null);
                            setForgotSuccess(null);
                            setShowForgotModal(true);
                          }}
                          className="text-xs sm:text-sm text-zinc-300 hover:text-nvidia-green font-bold flex items-center gap-2 transition"
                        >
                          <Key size={15} />
                          <span>Ganti Password</span>
                        </button>
                      </div>

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

                </motion.div>
              </AnimatePresence>
            </div>

          </div>

        </div>
        ) : (
          /* ── NOT LOGGED IN: SEAMLESS MASTER COCKPIT SHOWCASE & AUTH TERMINAL ── */
          <div className="flex-1 flex flex-col justify-center py-4 lg:py-8 max-w-6xl mx-auto w-full">
            <div className="relative rounded-[32px] p-[1px] bg-gradient-to-b from-white/15 via-white/5 to-white/10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9),0_0_50px_rgba(118,185,0,0.06)] overflow-hidden">
              {/* Ambient Glow */}
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-nvidia-green/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative rounded-[31px] bg-zinc-950/85 backdrop-blur-2xl grid grid-cols-1 lg:grid-cols-12 items-stretch divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                
                {/* PANEL KIRI: SHOWCASE SISTEM PANGKAT & BENEFIT BISNIS MEMBER */}
                <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6 sm:space-y-8 bg-zinc-950/40">
                  {/* Header Tagline & Badges */}
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-nvidia-green/10 border border-nvidia-green/30 text-nvidia-green text-xs font-black uppercase tracking-wider">
                      <ShieldCheck size={14} className="shrink-0" />
                      <span>Sistem Billing & Keanggotaan Member GC-Net</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                      Akses Billing Member Cepat, Praktis & Terintegrasi
                    </h2>
                    <p className="text-sm sm:text-base text-zinc-400 font-medium max-w-xl leading-relaxed">
                      Sistem keanggotaan warnet GC-Net dengan tier level gamer terpadu. Akun memiliki masa aktif berkala dan potongan biaya pembuka sesi (startup fee) saat login workstation PC, dengan perpanjangan mudah saat top up di kasir.
                    </p>
                  </div>

                  {/* Kartu Member VIP Preview (Sesuai Desain Asli Dashboard Member) */}
                  <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-yellow-500/40 via-nvidia-green/20 to-transparent max-w-lg shadow-[0_15px_35px_-10px_rgba(0,0,0,0.8),0_0_25px_rgba(234,179,8,0.12)]">
                    <div className="relative rounded-[23px] bg-zinc-950/95 backdrop-blur-md p-5 sm:p-6 overflow-hidden space-y-4">
                      {/* Background Tech Watermark */}
                      <div className="absolute -right-6 -bottom-6 text-white/[0.03] pointer-events-none select-none">
                        <Gamepad2 size={160} />
                      </div>

                      {/* Header Kartu: Sim Chip Emas & Badge Pangkat Gold Striker */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-7 rounded bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 p-0.5 flex items-center justify-center shrink-0 shadow-sm">
                            <div className="w-full h-full border border-amber-950/40 rounded-[2px] grid grid-cols-2 gap-0.5 p-0.5 opacity-80">
                              <div className="border-r border-b border-amber-950/40" />
                              <div className="border-b border-amber-950/40" />
                              <div className="border-r border-amber-950/40" />
                              <div />
                            </div>
                          </div>
                          <span className="text-xs font-mono tracking-widest text-zinc-300 uppercase font-bold">
                            GC MEMBER ID
                          </span>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1 rounded-full border bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                          <span className="font-mono font-bold tracking-wider text-xs uppercase">GOLD</span>
                        </div>
                      </div>

                      {/* Identitas Player Preview */}
                      <div className="flex items-center gap-3.5 pt-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/20 flex items-center justify-center text-white font-black text-xl shrink-0 shadow-md">
                          G
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase truncate">
                              PRO_GAMER_GC
                            </h3>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-nvidia-green/15 border border-nvidia-green/30 text-nvidia-green text-[11px] font-bold shrink-0">
                              <CheckCircle2 size={12} />
                              <span>Verified</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs">
                            <span className="text-yellow-400 font-bold">Striker</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-400">Member Aktif Workstation GC-Net</span>
                          </div>
                        </div>
                      </div>

                      {/* Mini HUD Saldo, Masa Aktif & Startup Fee */}
                      <div className="rounded-2xl bg-zinc-900/80 border border-white/10 p-3.5 sm:p-4 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">Simulasi Saldo</span>
                          <span className="font-mono font-bold text-zinc-300 text-[11px]">ID: GC-7749-VIP</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono">Rp 250.000</span>
                          <span className="text-[11px] text-zinc-400 font-medium">Rank Striker Aktif</span>
                        </div>

                        {/* Info Masa Aktif & Biaya Awal */}
                        <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Biaya Login (Startup)</span>
                            <span className="text-white font-mono font-bold">Rp 2.000 / Sesi</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Masa Aktif Akun</span>
                            <span className="text-nvidia-green font-mono font-bold">30 Hari Perpanjangan</span>
                          </div>
                        </div>

                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] text-zinc-400 font-bold uppercase">
                            <span>Sistem EXP Pangkat Billing</span>
                            <span className="text-nvidia-green font-mono text-[10px]">Integrasi GC-Hub</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-gradient-to-r from-yellow-500 to-nvidia-green rounded-full w-[65%]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Strip 5 Pangkat Member (Roadmap Tier Gamer) */}
                  <div className="space-y-2.5 max-w-xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-400 uppercase tracking-wider text-[11px]">
                        Tingkatan Pangkat Gamer
                      </span>
                      <span className="text-[11px] text-zinc-500 font-medium">Akumulasi EXP Sesi & Keaktifan Main</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {ALL_RANKS.map((rank, idx) => {
                        const tierLabels = ["Tier I", "Tier II", "Tier III", "Tier IV", "Tier V"];
                        return (
                          <div
                            key={idx}
                            className={`p-2 sm:p-2.5 rounded-xl border text-center transition ${
                              rank.name === "GOLD"
                                ? "bg-zinc-900 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/30"
                                : "bg-zinc-950/60 border-white/10"
                            }`}
                          >
                            <div className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${rank.badgeText}`}>
                              {rank.name}
                            </div>
                            <div className="text-[10px] sm:text-xs font-bold text-white mt-0.5 truncate">
                              {rank.title}
                            </div>
                            <div className="text-[9px] font-mono text-zinc-400 mt-1 truncate">
                              {tierLabels[idx]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4 Feature Highlight Bento Grid (Fitur Nyata Bebas Janji Palsu) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/60 border border-white/10 hover:border-yellow-500/40 transition-colors flex items-start gap-3.5 group">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 text-yellow-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Zap size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Tarif Khusus Member</h4>
                        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Tarif billing per jam lebih hemat dan terjangkau dibanding biaya sewa tamu personal.</p>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/60 border border-white/10 hover:border-cyan-500/40 transition-colors flex items-start gap-3.5 group">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Monitor size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Login Otomatis Workstation</h4>
                        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Buka kunci bilik PC langsung di layar client menggunakan username akun tanpa antre kasir.</p>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/60 border border-white/10 hover:border-nvidia-green/40 transition-colors flex items-start gap-3.5 group">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 text-nvidia-green flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Clock size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Masa Aktif Akun</h4>
                        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Akun memiliki periode aktif 30 hari yang otomatis diperpanjang saat isi ulang saldo deposit.</p>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/60 border border-white/10 hover:border-emerald-500/40 transition-colors flex items-start gap-3.5 group">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Biaya Awal (Startup Fee)</h4>
                        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Dikenakan saldo minimal pembuka sesi Rp 2.000 saat login pertama kali di workstation PC.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PANEL KANAN: AUTH TERMINAL */}
                <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-zinc-900/30">
                  <div className="space-y-6 max-w-md mx-auto w-full">
                    {/* Header Terminal Card */}
                    <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 text-nvidia-green flex items-center justify-center shrink-0 shadow-sm">
                        {authMode === "login" ? <LogIn size={20} /> : <UserPlus size={20} />}
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                          {authMode === "login" ? "Masuk Portal Member" : "Registrasi Member"}
                        </h3>
                        <p className="text-xs text-zinc-400 font-medium">
                          {authMode === "login" ? "Gunakan email atau username terdaftar lu" : "Aktivasi akun untuk billing workstation warnet"}
                        </p>
                      </div>
                    </div>

                    {/* Tab Selector */}
                    <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-zinc-900/90 border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        className={`py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                          authMode === "login"
                            ? "bg-nvidia-green text-black font-black shadow-md"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <LogIn size={15} />
                        <span>Masuk Akun</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("register");
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        className={`py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                          authMode === "register"
                            ? "bg-nvidia-green text-black font-black shadow-md"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <UserPlus size={15} />
                        <span>Daftar Baru</span>
                      </button>
                    </div>

                    {/* Feedback Alerts */}
                    {errorMessage && (
                      <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-center gap-2.5">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}
                    {successMessage && (
                      <div className="p-4 rounded-xl bg-nvidia-green/15 border border-nvidia-green/30 text-nvidia-green text-xs sm:text-sm flex items-center gap-2.5">
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
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green focus:ring-1 focus:ring-nvidia-green/40 transition font-medium"
                              />
                            </div>
                            <span className="text-[11px] text-zinc-400 block mt-1">
                              Huruf, angka, atau underscore 3 sampai 20 karakter untuk login PC.
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                              Nama Lengkap
                            </label>
                            <input
                              type="text"
                              placeholder="Nama asli atau nama panggilan"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green focus:ring-1 focus:ring-nvidia-green/40 transition font-medium"
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
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green focus:ring-1 focus:ring-nvidia-green/40 transition font-medium"
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
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green focus:ring-1 focus:ring-nvidia-green/40 transition font-medium"
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
                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-nvidia-green focus:ring-1 focus:ring-nvidia-green/40 transition font-medium"
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
                        className="w-full mt-4 py-3.5 px-4 rounded-xl bg-nvidia-green text-black font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white transition shadow-[0_4px_20px_rgba(118,185,0,0.3)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.3)] active:scale-[0.99] disabled:opacity-50"
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
                    <div className="relative flex items-center justify-center my-5">
                      <div className="border-t border-white/10 w-full" />
                      <span className="bg-zinc-950 px-3 text-[11px] font-bold tracking-widest text-zinc-400 uppercase shrink-0">
                        Atau Lanjut Instan
                      </span>
                      <div className="border-t border-white/10 w-full" />
                    </div>

                    {/* Google 1-Click Login Button */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={googleLoading || actionLoading}
                      className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group"
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

                    <div className="pt-4 border-t border-white/10 text-center">
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
                      Isi saldo deposit akun untuk booking PC gaming
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

        {/* ── FLOATING CHAT MESSENGER (Facebook style dock on desktop, bottom sheet on mobile) ── */}
        {sessionUser && (
          <FloatingChatMessenger
            currentUser={{
              id: sessionUser.id,
              name: profile?.username || sessionUser.email?.split("@")[0] || "Member"
            }}
            isOpen={isChatOpen}
            onOpenChange={setIsChatOpen}
          />
        )}
      </div>
    </div>
  );
}
