"use client";

import { motion } from "motion/react";
import { Sparkles, Bell } from "lucide-react";

export default function MemberPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="text-center relative z-10 max-w-md">
        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
          className="w-20 h-20 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8"
        >
          <Sparkles size={32} className="text-cyan-400 animate-float" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl md:text-4xl font-medium tracking-tight mb-4"
        >
          Member Portal
          <br />
          <span className="text-gradient">Coming Soon</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm text-zinc-500 mb-8 leading-relaxed"
        >
          Pendaftaran member, request game, top-up saldo, dan loyalty rewards sedang dalam pengembangan.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            onClick={() => alert("Mock: Notifikasi akan dikirim saat fitur ini siap.")}
            className="glass-panel px-6 py-3 rounded-xl text-sm font-medium hover:bg-white/[0.08] active:scale-[0.97] transition-all inline-flex items-center gap-2"
          >
            <Bell size={16} className="text-cyan-400" />
            Notify Me
          </button>
        </motion.div>

        {/* Feature Preview Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-2 mt-10"
        >
          {["Saldo Digital", "Request Game", "Loyalty Rewards", "Booking History"].map((feature) => (
            <span
              key={feature}
              className="text-[11px] text-zinc-600 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full"
            >
              {feature}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
