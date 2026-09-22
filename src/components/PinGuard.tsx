"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Lock, Check } from "lucide-react";

export default function PinGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unlocked, setUnlocked] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Halaman publik bebas akses tanpa perlu periksa sesi OP
    if (pathname === "/" || pathname === "/specs" || pathname === "/member") {
      setCheckingAuth(false);
      return;
    }

    async function verifySession() {
      try {
        const res = await fetch("/api/auth/verify");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUnlocked(true);
          } else {
            setUnlocked(false);
            document.cookie = "admin_unlocked=; path=/; max-age=0";
          }
        } else {
          setUnlocked(false);
          document.cookie = "admin_unlocked=; path=/; max-age=0";
        }
      } catch {
        setUnlocked(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    verifySession();
  }, [pathname]);

  const handleUnlock = async () => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe }),
      });
      if (res.ok) {
        setUnlocked(true);
        setError(false);
        if (pathname === "/" || pathname === "/login") {
          window.location.href = "/data-booking";
        }
      } else {
        setError(true);
        setPassword("");
      }
    } catch (err) {
      setError(true);
      setPassword("");
    }
  };

  // Halaman publik langsung render
  if (pathname === "/" || pathname === "/specs" || pathname === "/member") {
    return <>{children}</>;
  }

  // Loading indicator saat verifikasi kriptografis sedang berjalan
  if (checkingAuth) {
    return (
      <div className="flex-1 min-h-screen bg-surface-dark flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-nvidia-green border-t-transparent animate-spin" />
          <span className="text-xs text-zinc-400 font-medium">Memverifikasi Otoritas Sesi...</span>
        </div>
      </div>
    );
  }

  // Jika sudah terverifikasi secara sah oleh server
  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex-1 min-h-screen bg-surface-dark flex items-center justify-center p-4">
      <div className="nvidia-card p-8 w-full max-w-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-5">
          <Lock size={120} />
        </div>
        <div className="nvidia-corner"></div>
        <h2 className="text-xl font-bold tracking-tight text-white mb-2 uppercase">Akses Terkunci</h2>
        <p className="text-xs tracking-tight text-white/50 mb-6 uppercase">Masukkan Username & Password</p>
        
        <div className="space-y-4 relative z-10">
          <input 
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            className={`w-full bg-surface-dark border p-3 tracking-tight rounded-[2px] outline-none transition-colors ${error ? 'border-error text-error' : 'border-hairline text-white focus:border-nvidia-green'}`}
          />
          <input 
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleUnlock()}
            placeholder="Password"
            className={`w-full bg-surface-dark border p-3 tracking-tight rounded-[2px] outline-none transition-colors ${error ? 'border-error text-error' : 'border-hairline text-white focus:border-nvidia-green'}`}
          />
          <label className="flex items-center gap-2 cursor-pointer mt-2 group">
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'border-nvidia-green bg-nvidia-green' : 'border-hairline bg-surface-dark group-hover:border-nvidia-green'}`}>
              {rememberMe && <Check size={12} className="text-black" />}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
            />
            <span className="text-xs tracking-tight text-white/50 group-hover:text-white transition-colors uppercase">Biarkan saya tetap masuk</span>
          </label>
          {error && <p className="text-[10px] text-error font-bold tracking-tight uppercase text-center mt-2">Username/Password Salah!</p>}
          <button 
            onClick={handleUnlock}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-nvidia-green/10 border border-nvidia-green/50 text-nvidia-green hover:bg-nvidia-green hover:text-black hover:shadow-[0_0_20px_rgba(118,185,0,0.6)] rounded-[2px] transition-all tracking-tight font-bold text-sm uppercase tracking-widest group mt-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75 group-hover:bg-black"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-nvidia-green group-hover:bg-black"></span>
            </span>
            Buka Kunci
          </button>
        </div>
      </div>
    </div>
  );
}
