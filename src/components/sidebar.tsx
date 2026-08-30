"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Database, Desktop, ChartLineUp, Monitor, Package, Sliders, BookOpenText, List, X, SignOut, LockKey, ShieldCheck } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";

const NAV_ITEMS = [
  { href: "/data-booking", label: "ANTREAN", icon: Database, admin: true },
  { href: "/kasir", label: "KASIR", icon: ShoppingCart, admin: true },
  { href: "/data-pc", label: "DATA PC & SPEK", icon: Monitor, admin: true },
  { href: "/log", label: "LOG AKTIVITAS", icon: BookOpenText, admin: true },
  { href: "/rekap", label: "REKAP & POOLING", icon: ChartLineUp, admin: true },
  { href: "/paket-billing", label: "PAKET BOOKING", icon: Sliders, admin: true },
  { href: "/stok-kasir", label: "STOK KASIR", icon: Package, admin: true },
  { href: "/admin/accounts", label: "AKUN STAFF", icon: ShieldCheck, admin: true },
  { href: "/", label: "PORTAL DEPAN", icon: Desktop, admin: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if unlocked
    const checkAuth = () => {
      if (document.cookie.includes("admin_unlocked=true")) {
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
      }
    };

    checkAuth();
    // Re-check periodically (30s is plenty for session auth)
    const interval = setInterval(checkAuth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    document.cookie = "admin_unlocked=; path=/; max-age=0";
    document.cookie = "admin_forever=; path=/; max-age=0";
    setIsUnlocked(false);
    window.location.href = "/";
  };

  // Ensure hydration mismatch doesn't happen by rendering default on server
  const visibleNavs = !mounted ? NAV_ITEMS.filter(item => !item.admin) : NAV_ITEMS.filter(item => !item.admin || isUnlocked);

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-nvidia-green sticky top-0 z-50 shadow-[0_4px_20px_rgba(118,185,0,0.3)]">
        {/* Logo left-aligned */}
        <div className="w-16"></div>
        {/* Hamburger right-aligned */}
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-black hover:text-black/70 z-10 p-1.5"
        >
          {mobileOpen ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
        </button>
      </div>

      <div className="flex z-40">
        {/* Desktop Sidebar (Left) */}
        <div className="hidden md:flex w-64 flex-col border-r border-hairline bg-surface-dark shrink-0 fixed h-screen overflow-y-auto">
          
          <div className="p-6 border-b border-hairline mb-4 flex justify-center">
            <Link href="/" className="flex flex-col items-center justify-center group my-10 w-40">
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
            </Link>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {visibleNavs.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[2px] text-xs tracking-tight font-bold tracking-wider uppercase transition-all ${
                    isActive
                      ? "bg-nvidia-green text-black shadow-[0_0_15px_rgba(118,185,0,0.2)]"
                      : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <item.icon size={18} weight={isActive ? "fill" : "regular"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>


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
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-[2px] text-xs tracking-tight font-bold tracking-wider uppercase transition-all ${
                        isActive
                          ? "bg-nvidia-green text-black shadow-[0_0_15px_rgba(118,185,0,0.2)]"
                          : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <item.icon size={18} weight={isActive ? "fill" : "regular"} />
                      {item.label}
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
                      <SignOut size={18} />
                      LOGOUT ADMIN
                    </button>
                  ) : (
                    <Link
                      href="/"
                      onClick={() => setMobileOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-[2px] text-xs tracking-tight font-bold tracking-wider uppercase text-nvidia-green hover:bg-nvidia-green/10 transition-all"
                    >
                      <LockKey size={18} />
                      LOGIN ADMIN
                    </Link>
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
