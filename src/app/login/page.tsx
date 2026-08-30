"use client";

import { useState, useEffect } from "react";
import { LockKey, ShieldCheck, CheckCircle, ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import { motion } from "motion/react";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // If already logged in, redirect straight to /data-booking
    if (document.cookie.includes("admin_unlocked=true")) {
      window.location.href = "/data-booking";
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Username dan Password wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          rememberMe
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = "/data-booking";
      } else {
        setErrorMsg(data.error || "Username atau Password salah!");
        setPassword("");
        setLoading(false);
      }
    } catch (_) {
      setErrorMsg("Gagal terhubung ke server. Coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-nvidia-green/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-surface border border-hairline p-6 sm:p-8 rounded-xl shadow-2xl relative z-10 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center mx-auto text-nvidia-green">
            <LockKey size={24} weight="duotone" />
          </div>
          <h1 className="text-xl font-bold uppercase tracking-tight text-white">Login Admin & Kasir</h1>
          <p className="text-xs text-white/50 uppercase tracking-wider">
            Masukkan akun staff untuk akses antrean & kasir
          </p>
        </div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-error/10 border border-error/30 text-error text-xs rounded font-bold text-center uppercase tracking-wide"
          >
            {errorMsg}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username akun staff"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              className="w-full bg-surface-dark border border-hairline p-3 rounded text-sm text-white focus:border-nvidia-green outline-none tracking-tight transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full bg-surface-dark border border-hairline p-3 pr-10 rounded text-sm text-white focus:border-nvidia-green outline-none tracking-tight transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer py-1 group">
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                rememberMe
                  ? "border-nvidia-green bg-nvidia-green text-black"
                  : "border-hairline bg-surface-dark group-hover:border-nvidia-green"
              }`}
            >
              {rememberMe && <CheckCircle size={14} weight="bold" />}
            </div>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="hidden"
            />
            <span className="text-xs text-white/60 group-hover:text-white uppercase tracking-wider transition">
              Ingat sesi login ini
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-nvidia-green text-black hover:bg-[#88d600] disabled:opacity-50 rounded font-bold text-xs uppercase tracking-widest transition shadow-[0_0_20px_rgba(118,185,0,0.3)] mt-4"
          >
            {loading ? (
              <span className="animate-pulse">Memverifikasi...</span>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight size={16} weight="bold" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-hairline">
          <Link
            href="/"
            className="text-[11px] text-white/40 hover:text-nvidia-green uppercase tracking-wider transition"
          >
            Kembali ke Portal Depan
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
