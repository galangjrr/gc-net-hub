"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Database, TrendingUp, Monitor, Package, Sliders, Menu, X, LogOut, Lock, ShieldCheck, Smartphone, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  { href: "/companion", label: "GC HUB MOBILE", icon: Smartphone, admin: true },
  { href: "/data-booking", label: "ANTREAN", icon: Database, admin: true },
  { href: "/kasir", label: "KASIR", icon: ShoppingCart, admin: true },
  { href: "/data-pc", label: "DATA PC & SPEK", icon: Monitor, admin: true },
  { href: "/rekap", label: "REKAP & POOLING", icon: TrendingUp, admin: true },
  { href: "/paket-billing", label: "PAKET BOOKING", icon: Sliders, admin: true },
  { href: "/stok-kasir", label: "STOK KASIR", icon: Package, admin: true },
  { href: "/admin/accounts", label: "AKUN STAFF", icon: ShieldCheck, admin: true },
  { href: "/", label: "PORTAL DEPAN", icon: Monitor, admin: false },
  { href: "/member", label: "PORTAL MEMBER", icon: User, admin: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [memberUser, setMemberUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleSecretTrigger = () => {
    const now = Date.now();
    if (now - lastClickTime < 700) {
      const next = clickCount + 1;
      if (next >= 3) {
        setClickCount(0);
        window.location.href = "/login";
      } else {
        setClickCount(next);
      }
    } else {
      setClickCount(1);
    }
    setLastClickTime(now);
  };

  useEffect(() => {
    setMounted(true);
    // Verifikasi sesi OP secara kriptografis ke server
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/verify");
        if (res.ok) {
          const data = await res.json();
          setIsUnlocked(Boolean(data.authenticated));
        } else {
          setIsUnlocked(false);
        }
      } catch {
        setIsUnlocked(false);
      }
    };

    const fetchPending = async () => {
      try {
        const res = await fetch("/api/data", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const count = (data?.bookings || []).filter((b: any) => b.status === "pending").length;
          setPendingCount(count);
        }
      } catch (_) {}
    };

    checkAuth();
    fetchPending();

    // Check member session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setMemberUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setMemberUser(session?.user || null);
    });

    const interval = setInterval(() => {
      checkAuth();
      fetchPending();
    }, 10000);

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (_) {}
    document.cookie = "admin_unlocked=; path=/; max-age=0";
    document.cookie = "admin_forever=; path=/; max-age=0";
    setIsUnlocked(false);
    window.location.href = "/";
  };

  // Ensure hydration mismatch doesn't happen by rendering default on server
  const visibleNavs = !mounted ? NAV_ITEMS.filter(item => !item.admin) : NAV_ITEMS.filter(item => !item.admin || isUnlocked);

  const memberDisplayName = memberUser?.user_metadata?.username || memberUser?.email?.split("@")[0] || "Member";

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-nvidia-green sticky top-0 z-50 shadow-[0_4px_20px_rgba(118,185,0,0.3)]">
        {/* Brand left with secret trigger */}
        <div 
          onClick={handleSecretTrigger} 
          className="flex items-center gap-2 text-black font-black tracking-tight text-sm uppercase cursor-pointer select-none active:opacity-80"
          title="GC NET"
        >
          <span>GC NET HUB</span>
        </div>
        {/* Quick action + Hamburger */}
        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <button 
              onClick={handleLogout}
              className="px-3 py-1 bg-black/10 hover:bg-black text-black hover:text-white border border-black/20 text-[10px] font-bold uppercase rounded transition"
            >
              LOGOUT OP
            </button>
          ) : (
            <Link
              href="/member"
              className="px-2.5 py-1 bg-black text-white text-[10px] font-bold uppercase rounded shadow-sm hover:bg-black/80 transition flex items-center gap-1.5"
            >
              <User size={12} className="text-nvidia-green" />
              <span>{memberUser ? `@${memberDisplayName}` : "MEMBER"}</span>
            </Link>
          )}
          <button 
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-black hover:text-black/70 z-10 p-1.5"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div className="flex z-40">
        {/* Desktop Sidebar (Left) */}
        <div className="hidden md:flex w-64 flex-col border-r border-hairline bg-surface-dark shrink-0 fixed h-screen overflow-y-auto">
          
          <div className="p-6 border-b border-hairline mb-4 flex justify-center">
            <div 
              onClick={handleSecretTrigger} 
              className="flex flex-col items-center justify-center group my-10 w-40 cursor-pointer select-none"
              title="GC-Net Warnet"
            >
              <div className="relative w-full aspect-square flex items-center justify-center">
                <motion.img 
                  src="/logo/GC Master Logo.svg" 
                  alt="GC Net Logo" 
                  className="absolute w-full h-auto scale-[1.5] opacity-100 transition-opacity duration-500" 
                  style={{ filter: "invert(1) drop-shadow(0 0 20px rgba(118,185,0,0.8))" }}
                />
                <motion.img 
                  src="/logo/GC Net Master Logo.svg" 
                  alt="GC Net Master Logo" 
                  className="absolute w-full h-auto scale-[1.5] opacity-0 [clip-path:circle(20%_at_50%_50%)] group-hover:opacity-100 group-hover:[clip-path:circle(150%_at_50%_50%)] transition-all duration-500 ease-out" 
                  style={{ filter: "invert(1) drop-shadow(0 0 20px rgba(118,185,0,0.8))" }}
                />
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {visibleNavs.map((item) => {
              const isActive = pathname === item.href;
              const isBookingTab = item.href === "/data-booking";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-[2px] text-xs tracking-tight font-bold tracking-wider uppercase transition-all ${
                    isActive
                      ? "bg-nvidia-green text-black shadow-[0_0_15px_rgba(118,185,0,0.2)]"
                      : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} />
                    {item.label}
                  </div>
                  {isBookingTab && pendingCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Auth Footer */}
          <div className="p-4 border-t border-hairline mt-auto">
            {isUnlocked ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[2px] text-xs font-bold uppercase tracking-wider text-error hover:bg-error/10 border border-error/20 transition-all"
              >
                <LogOut size={16} />
                LOGOUT OP
              </button>
            ) : (
              <div 
                onClick={handleSecretTrigger} 
                className="text-center text-[10px] text-zinc-600 hover:text-zinc-400 cursor-pointer select-none transition py-2 font-mono"
                title="GC-Net Gaming Warnet System"
              >
                GC-NET v2.4
              </div>
            )}
          </div>

        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="md:hidden fixed inset-0 top-[65px] bg-surface-dark z-40 border-t border-hairline overflow-y-auto"
            >
              <div className="px-6 py-4 space-y-2 flex flex-col min-h-[calc(100vh-65px)]">
                {visibleNavs.map((item) => {
                  const isActive = pathname === item.href;
                  const isBookingTab = item.href === "/data-booking";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-[2px] text-xs tracking-tight font-bold tracking-wider uppercase transition-all ${
                        isActive
                          ? "bg-nvidia-green text-black shadow-[0_0_15px_rgba(118,185,0,0.2)]"
                          : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} />
                        {item.label}
                      </div>
                      {isBookingTab && pendingCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
                
                <div className="flex-1"></div>

                {/* Mobile Auth Button */}
                <div className="border-t border-hairline pt-4 mt-2">
                  {isUnlocked ? (
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-[2px] text-xs tracking-tight font-bold tracking-wider uppercase text-error hover:bg-error/10 transition-all"
                    >
                      <LogOut size={18} />
                      LOGOUT OP
                    </button>
                  ) : (
                    <div 
                      onClick={() => {
                        setMobileOpen(false);
                        handleSecretTrigger();
                      }}
                      className="text-center text-[10px] text-zinc-600 hover:text-zinc-400 cursor-pointer select-none transition py-2 font-mono"
                    >
                      GC-NET v2.4
                    </div>
                  )}
                </div>


              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Placeholder for desktop to push content */}
        <div className="hidden md:block w-64 shrink-0"></div>
      </div>
    </>
  );
}
