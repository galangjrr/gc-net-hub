"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export default function AuthButton() {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut rahasia OP: Ctrl + Shift + O atau Ctrl + Shift + L
      if (e.ctrlKey && e.shiftKey && (e.key === "O" || e.key === "o" || e.key === "L" || e.key === "l")) {
        e.preventDefault();
        setShowLogin(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe: true })
      });
      if (res.ok) {
        setShowLogin(false);
        window.location.href = "/data-booking";
      } else {
        setLoginError(true);
        setPassword("");
      }
    } catch (err) {
      setLoginError(true);
      setPassword("");
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* Tombol melayang di pojok kanan atas dihapus (Opsi 2). Akses Member Portal ada di Sidebar. */}

      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-hairline p-8 max-w-sm w-full relative"
            >
              <button 
                onClick={() => { setShowLogin(false); setLoginError(false); setUsername(""); setPassword(""); }}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-xl font-bold tracking-tight text-white mb-2 uppercase">Login Admin</h2>
              <p className="text-xs text-white/50 tracking-tight mb-6 uppercase tracking-wider">Akses menu kasir & manajemen</p>
              
              <div className="space-y-4">
                <input 
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className={`w-full bg-surface-dark border p-3 tracking-tight rounded-[2px] outline-none transition-colors ${loginError ? 'border-error text-error' : 'border-hairline text-white focus:border-nvidia-green'}`}
                />
                <input 
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  className={`w-full bg-surface-dark border p-3 tracking-tight rounded-[2px] outline-none transition-colors ${loginError ? 'border-error text-error' : 'border-hairline text-white focus:border-nvidia-green'}`}
                />
                {loginError && <p className="text-[10px] text-error font-bold tracking-tight uppercase text-center">Username/Password Salah!</p>}
                <button 
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-nvidia-green/10 border border-nvidia-green/50 text-nvidia-green hover:bg-nvidia-green hover:text-black hover:shadow-[0_0_20px_rgba(118,185,0,0.6)] rounded-[2px] transition-all tracking-tight font-bold text-sm uppercase tracking-widest group mt-2"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75 group-hover:bg-black"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-nvidia-green group-hover:bg-black"></span>
                  </span>
                  MASUK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
