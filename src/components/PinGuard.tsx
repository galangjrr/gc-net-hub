"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { LockKey, CheckCircle } from "@phosphor-icons/react";

export default function PinGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unlocked, setUnlocked] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  useEffect(() => {
    if (document.cookie.includes("admin_unlocked=true")) {
      setUnlocked(true);
      // Refresh the session if it's not a forever cookie
      if (!document.cookie.includes("admin_forever=true")) {
        document.cookie = "admin_unlocked=true; path=/; max-age=43200";
      }
    } else {
      setUnlocked(false);
    }
  }, [pathname]);

  const handleUnlock = async () => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, rememberMe }),
      });
      if (res.ok) {
        setUnlocked(true);
        setError(false);
      } else {
        setError(true);
        setPassword("");
      }
    } catch (err) {
      setError(true);
      setPassword("");
    }
  };

  // Only lock if not on the main portal page or specs page
  if (pathname === "/" || pathname === "/specs" || unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex-1 min-h-screen bg-surface-dark flex items-center justify-center p-4">
      <div className="nvidia-card p-8 w-full max-w-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-5">
          <LockKey size={120} weight="fill" />
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
              {rememberMe && <CheckCircle size={12} weight="bold" className="text-black" />}
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
