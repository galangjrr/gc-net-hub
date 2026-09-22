"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, ChevronRight, X, 
  Cpu, Gamepad2, Layers, Zap, HardDrive, 
  Monitor, Keyboard, Mouse, Headphones, 
  ChevronDown, ArrowRight, Sparkles 
} from "lucide-react";
import type { PC } from "@/lib/db";

interface PCCarouselProps {
  pcs: PC[];
  onSelectPc?: (pcId: string) => void;
}

const THEMES = [
  {
    glow: "bg-[#76b900]/10", 
    border: "border-[#76b900]", 
    border50: "border-[#76b900]/50",
    border30: "border-[#76b900]/30",
    text: "text-[#76b900]",
    text70: "text-[#76b900]/70",
    bg: "bg-[#76b900]",
    bgLight: "bg-[#76b900]/15",
    shadow: "shadow-[0_0_15px_rgba(118,185,0,0.2)]",
    shadowHover: "group-hover:shadow-[0_0_60px_rgba(118,185,0,0.3)]",
    hoverBorder: "hover:border-[#76b900]",
    hoverBg: "hover:bg-[#76b900]"
  },
  {
    glow: "bg-cyan-500/10", 
    border: "border-cyan-500", 
    border50: "border-cyan-500/50",
    border30: "border-cyan-500/30",
    text: "text-cyan-500",
    text70: "text-cyan-500/70",
    bg: "bg-cyan-500",
    bgLight: "bg-cyan-500/15",
    shadow: "shadow-[0_0_15px_rgba(6,182,212,0.2)]",
    shadowHover: "group-hover:shadow-[0_0_60px_rgba(6,182,212,0.3)]",
    hoverBorder: "hover:border-cyan-500",
    hoverBg: "hover:bg-cyan-500"
  },
  {
    glow: "bg-purple-500/10", 
    border: "border-purple-500", 
    border50: "border-purple-500/50",
    border30: "border-purple-500/30",
    text: "text-purple-500",
    text70: "text-purple-500/70",
    bg: "bg-purple-500",
    bgLight: "bg-purple-500/15",
    shadow: "shadow-[0_0_15px_rgba(168,85,247,0.2)]",
    shadowHover: "group-hover:shadow-[0_0_60px_rgba(168,85,247,0.3)]",
    hoverBorder: "hover:border-purple-500",
    hoverBg: "hover:bg-purple-500"
  },
  {
    glow: "bg-orange-500/10", 
    border: "border-orange-500", 
    border50: "border-orange-500/50",
    border30: "border-orange-500/30",
    text: "text-orange-500",
    text70: "text-orange-500/70",
    bg: "bg-orange-500",
    bgLight: "bg-orange-500/15",
    shadow: "shadow-[0_0_15px_rgba(249,115,22,0.2)]",
    shadowHover: "group-hover:shadow-[0_0_60px_rgba(249,115,22,0.3)]",
    hoverBorder: "hover:border-orange-500",
    hoverBg: "hover:bg-orange-500"
  },
  {
    glow: "bg-rose-500/10", 
    border: "border-rose-500", 
    border50: "border-rose-500/50",
    border30: "border-rose-500/30",
    text: "text-rose-500",
    text70: "text-rose-500/70",
    bg: "bg-rose-500",
    bgLight: "bg-rose-500/15",
    shadow: "shadow-[0_0_15px_rgba(244,63,94,0.2)]",
    shadowHover: "group-hover:shadow-[0_0_60px_rgba(244,63,94,0.3)]",
    hoverBorder: "hover:border-rose-500",
    hoverBg: "hover:bg-rose-500"
  }
];

export default function PCCarousel({ pcs, onSelectPc }: PCCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSpecs, setShowSpecs] = useState(false);
  const [expandedAbility, setExpandedAbility] = useState<string | null>(null);
  const [currentAbilityIndex, setCurrentAbilityIndex] = useState(4); // Start in middle
  const [isMobile, setIsMobile] = useState(false);
  const [specCategory, setSpecCategory] = useState<'all' | 'core' | 'gear'>('all');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, pcs.length - 1));
    setShowSpecs(false);
    setExpandedAbility(null);
    setCurrentAbilityIndex(4);
    setSpecCategory('all');
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    setShowSpecs(false);
    setExpandedAbility(null);
    setCurrentAbilityIndex(4);
    setSpecCategory('all');
  };

  if (!pcs || pcs.length === 0) return null;

  const activeTheme = THEMES[currentIndex % THEMES.length];
  const activePc = pcs[currentIndex];
  const s = activePc?.specs || { cpu: "-", gpu: "-", monitor: "-", keyboard: "-", mouse: "-", headset: "-" };

  const getSpecMeta = (title: string) => {
    switch (title) {
      case "PROCESSOR":
        return { icon: Cpu, color: "text-amber-400", border: "border-amber-500/40", bg: "bg-amber-500/15", tag: "CPU CORE", category: "core" };
      case "GRAPHICS":
        return { icon: Gamepad2, color: "text-emerald-400", border: "border-emerald-500/40", bg: "bg-emerald-500/15", tag: "VGA GAMING", category: "core" };
      case "MAINBOARD":
        return { icon: Layers, color: "text-blue-400", border: "border-blue-500/40", bg: "bg-blue-500/15", tag: "LOGIC BOARD", category: "core" };
      case "MEMORY":
        return { icon: Zap, color: "text-purple-400", border: "border-purple-500/40", bg: "bg-purple-500/15", tag: "DUAL CHANNEL", category: "core" };
      case "STORAGE":
        return { icon: HardDrive, color: "text-cyan-400", border: "border-cyan-500/40", bg: "bg-cyan-500/15", tag: "ULTRA SSD", category: "core" };
      case "DISPLAY":
        return { icon: Monitor, color: "text-cyan-300", border: "border-cyan-400/40", bg: "bg-cyan-500/20", tag: "240Hz PRO", category: "gear" };
      case "KEYBOARD":
        return { icon: Keyboard, color: "text-rose-400", border: "border-rose-500/40", bg: "bg-rose-500/15", tag: "MECHANICAL", category: "gear" };
      case "MOUSE":
        return { icon: Mouse, color: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/15", tag: "RGB SENSOR", category: "gear" };
      case "HEADSET":
        return { icon: Headphones, color: "text-indigo-400", border: "border-indigo-500/40", bg: "bg-indigo-500/15", tag: "7.1 SURROUND", category: "gear" };
      default:
        return { icon: Cpu, color: "text-zinc-400", border: "border-zinc-700", bg: "bg-zinc-800", tag: "HARDWARE", category: "core" };
    }
  };

  const activePcSpecs = [
    { title: "PROCESSOR", value: s.cpu, desc: "Otak utama komputasi game. Menjamin FPS stabil saat pertarungan ramai tanpa stutter." },
    { title: "GRAPHICS", value: s.gpu, desc: "Kartu grafis gaming bertenaga tinggi untuk visual tajam dan frame rate mulus maksimal." },
    { title: "MAINBOARD", value: s.mainboard || "-", desc: "Papan induk stabil penyuplai daya konsisten ke seluruh komponen hardware." },
    { title: "MEMORY", value: s.ram || "-", desc: "RAM kecepatan tinggi multi channel agar multitasking dan loading asset game lancar." },
    { title: "STORAGE", value: s.storage || "-", desc: "SSD ultra cepat, boot game dan loading map selesai dalam hitungan detik." },
    { title: "DISPLAY", value: s.monitor, desc: "Monitor esports refresh rate tinggi, gerakan musuh terlihat sangat mulus dan responsif." },
    { title: "KEYBOARD", value: s.keyboard, desc: "Keyboard mechanical presisi dengan respon instan untuk eksekusi kombo tanpa delay." },
    { title: "MOUSE", value: s.mouse, desc: "Mouse gaming sensor akurat, bidikan crosshair konsisten dan mantap." },
    { title: "HEADSET", value: s.headset, desc: "Headset gaming audio surround jernih, deteksi arah langkah kaki musuh lebih akurat." },
  ];

  return (
    <div className="relative w-full max-w-[1200px] mx-auto h-[700px] md:h-[700px] flex items-center justify-center perspective-[1200px] overflow-hidden">
      
      {/* Background Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] ${activeTheme.glow} blur-[120px] rounded-full pointer-events-none transition-colors duration-1000`} />

      {/* Navigation Buttons */}
      <button 
        onClick={handlePrev}
        disabled={currentIndex === 0}
        className={`absolute left-4 md:left-12 z-50 w-12 h-12 flex items-center justify-center rounded-[2px] border transition-all 
          ${currentIndex === 0 
            ? "bg-black/20 border-white/10 text-white/20 cursor-not-allowed" 
            : `bg-black/50 ${activeTheme.border50} ${activeTheme.text} ${activeTheme.hoverBg} hover:text-black`}`}
      >
        <ChevronLeft size={24} />
      </button>
      <button 
        onClick={handleNext}
        disabled={currentIndex === pcs.length - 1}
        className={`absolute right-4 md:right-12 z-50 w-12 h-12 flex items-center justify-center rounded-[2px] border transition-all 
          ${currentIndex === pcs.length - 1 
            ? "bg-black/20 border-white/10 text-white/20 cursor-not-allowed" 
            : `bg-black/50 ${activeTheme.border50} ${activeTheme.text} ${activeTheme.hoverBg} hover:text-black`}`}
      >
        <ChevronRight size={24} />
      </button>

      {/* Carousel Track */}
      <div className="relative w-full h-full flex items-center justify-center transform-style-3d">
        <AnimatePresence initial={false}>
          {pcs.map((pc, index) => {
            let offset = index - currentIndex;
            const isActive = offset === 0;
            const isVisible = Math.abs(offset) <= 2; 

            if (!isVisible) return null;

            const theme = THEMES[index % THEMES.length];
            
            // Heroic Positioning Logic
            const offsetX = isMobile ? 140 : 280;
            const x = offset * offsetX; 
            const y = isActive ? 0 : Math.abs(offset) * 20; // Inactive sits lower
            const rotateY = offset * -40; // Dramatic turn
            const rotateX = isActive ? 0 : 10; // Inactive leans back slightly
            const rotateZ = isActive ? 0 : offset * -3; // Inactive tilts away
            const scale = isActive ? 1.15 : 0.85 - Math.abs(offset) * 0.1; 
            const zIndex = 50 - Math.abs(offset) * 10;
            const opacity = isActive ? 1 : 0.4 - Math.abs(offset) * 0.15;
            
            const s = pc.specs || { cpu: "-", gpu: "-", monitor: "-", keyboard: "-", mouse: "-", headset: "-" };
            const pcSpecsData = [
              { title: "PROCESSOR", value: s.cpu, desc: "Main CPU Power." },
              { title: "GRAPHICS", value: s.gpu, desc: "VGA Rendering." },
              { title: "MAINBOARD", value: s.mainboard || "-", desc: "System Logic." },
              { title: "MEMORY", value: s.ram || "-", desc: "System RAM." },
              { title: "STORAGE", value: s.storage || "-", desc: "System Drive." },
              { title: "DISPLAY", value: s.monitor, desc: "Screen Refresh." },
              { title: "KEYBOARD", value: s.keyboard, desc: "Mechanical typing." },
              { title: "MOUSE", value: s.mouse, desc: "Precision aim." },
              { title: "HEADSET", value: s.headset, desc: "Clear audio." },
            ];

            // Unique Hero Effects when becoming Active
            let heroAnimate: any, heroTransition: any;
            switch (index % 10) {
              case 0: // Cyber-kinetic Slam
                heroAnimate = isActive ? { scale: [1.3, 0.9, 1], y: [-50, 10, 0] } : { scale: 1, y: 0 };
                heroTransition = { duration: 0.5, ease: "backOut" };
                break;
              case 1: // Glitch RGB
                heroAnimate = isActive ? { skewX: [20, -20, 0], filter: ["hue-rotate(90deg)", "hue-rotate(-90deg)", "hue-rotate(0deg)"] } : { skewX: 0, filter: "hue-rotate(0deg)" };
                heroTransition = { duration: 0.4, ease: "linear" };
                break;
              case 2: // Magnetic Plasma
                heroAnimate = isActive ? { borderRadius: ["50%", "10%", "0%"], scale: [0.8, 1.1, 1] } : { borderRadius: "0%", scale: 1 };
                heroTransition = { duration: 0.6, ease: "easeInOut" };
                break;
              case 3: // Hologram Shimmer
                heroAnimate = isActive ? { opacity: [0.2, 1], scaleY: [0.5, 1.1, 1] } : { opacity: 1, scaleY: 1 };
                heroTransition = { duration: 0.5, ease: "circOut" };
                break;
              case 4: // Glass Shatter (Rotate snap)
                heroAnimate = isActive ? { rotateZ: [45, -15, 0], scale: [0.5, 1.1, 1] } : { rotateZ: 0, scale: 1 };
                heroTransition = { duration: 0.5, ease: "backOut" };
                break;
              case 5: // Data Cascade (Flicker)
                heroAnimate = isActive ? { opacity: [0, 1, 0, 1, 1], scale: [0.9, 1] } : { opacity: 1, scale: 1 };
                heroTransition = { duration: 0.6 };
                break;
              case 6: // Hydraulic Lock-in
                heroAnimate = isActive ? { scale: [0.8, 1.1, 1], y: [20, -10, 0] } : { scale: 1, y: 0 };
                heroTransition = { type: "tween", ease: "circOut", duration: 0.4 };
                break;
              case 7: // Neon Outline Drop
                heroAnimate = isActive ? { y: [-50, 0], filter: ["drop-shadow(0 0 50px white)", "drop-shadow(0 0 0px white)"] } : { y: 0 };
                heroTransition = { duration: 0.5, ease: "easeOut" };
                break;
              case 8: // Echo Trail (Slide blur)
                heroAnimate = isActive ? { x: [-100, 0], filter: ["blur(20px)", "blur(0px)"] } : { x: 0, filter: "blur(0px)" };
                heroTransition = { duration: 0.5, ease: "easeOut" };
                break;
              case 9: // Reactor Core Overload
              default:
                heroAnimate = isActive ? { scale: [1.5, 1], filter: ["brightness(3)", "brightness(1)"] } : { scale: 1, filter: "brightness(1)" };
                heroTransition = { duration: 0.6, ease: "easeOut" };
                break;
            }

            return (
              <motion.div
                key={pc.id}
                className="absolute origin-center"
                initial={false}
                animate={{
                  x,
                  y,
                  rotateX,
                  rotateY,
                  rotateZ,
                  scale,
                  zIndex,
                  opacity,
                }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 25,
                  mass: 1.1,
                }}
                style={{
                  transformStyle: "preserve-3d",
                }}
                onClick={() => {
                  if (!isActive) {
                    setCurrentIndex(index);
                    setShowSpecs(false);
                    setExpandedAbility(null);
                  }
                }}
              >
                {/* Continuous Floating Container for Active Hero — CSS animation */}
                <div
                  className={`w-full h-full flex items-center justify-center ${isActive ? 'animate-card-float' : ''}`}
                >
                  {/* Central PC Card with Unique Entrance Effect */}
                  <motion.div 
                    animate={heroAnimate}
                    transition={heroTransition}
                    className={`relative w-64 h-64 md:w-80 md:h-80 group ${!isActive ? "cursor-pointer" : ""}`}
                  >
                    
                    {/* Breathing Aura for Active Hero */}
                    {isActive && (
                      <motion.div 
                        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className={`absolute inset-0 rounded-full blur-[60px] -z-10 ${theme.glow}`}
                      />
                    )}

                    <div className={`absolute inset-0 border ${theme.border30} bg-black/50 backdrop-blur-sm rounded-[2px] ${theme.shadow} ${theme.shadowHover} transition-shadow duration-500`} />
                    
                    {/* Corner Borders */}
                    <div className={`absolute -top-3 -right-3 w-10 h-10 border-t-2 border-r-2 ${theme.border} transition-colors`} />
                    <div className={`absolute -bottom-3 -left-3 w-10 h-10 border-b-2 border-l-2 ${theme.border} transition-colors`} />
                    
                    {/* Hero Character Image — dynamic per PC */}
                    <motion.img 
                      src={pc.image || "/hero.png"}
                      alt={pc.name}
                      animate={{
                        scale: isActive ? 1.15 : 0.9,
                        y: isActive ? -15 : 0,
                        filter: isActive ? "grayscale(0%) drop-shadow(0 0 15px rgba(255,255,255,0.3))" : "grayscale(100%) drop-shadow(0 0 0px rgba(0,0,0,0))"
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-full h-full object-cover p-6 mix-blend-screen opacity-90 relative z-20 pointer-events-none" 
                    />
                    
                    {/* Hero Name Badge */}
                    <motion.div 
                      animate={{
                        y: isActive ? 10 : 0,
                        scale: isActive ? 1.05 : 1
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-lg font-bold tracking-tight text-white tracking-widest whitespace-nowrap bg-black px-6 py-1.5 border ${theme.border50} ${theme.shadow} transition-colors z-30`}
                    >
                      {pc.name}
                    </motion.div>

                    {/* SCAN ABILITIES Action Button */}
                    <AnimatePresence mode="wait">
                      {isActive && (
                        <motion.button
                          key="scan-btn"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (showSpecs) {
                              setShowSpecs(false);
                              setExpandedAbility(null);
                            } else {
                              setShowSpecs(true);
                              setCurrentAbilityIndex(Math.floor(pcSpecsData.length / 2));
                            }
                          }}
                          className={`absolute bottom-4 md:bottom-12 left-1/2 -translate-x-1/2 z-30 px-6 py-2 w-max whitespace-nowrap bg-black/80 backdrop-blur-md border-2 ${showSpecs ? 'border-error text-error hover:bg-error hover:text-white' : `${theme.border} ${theme.text} ${theme.hoverBg} hover:text-black`} tracking-tight font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,0,0,0.6)]`}
                        >
                          {showSpecs ? "[ CLOSE ABILITIES ]" : "[ SCAN ABILITIES ]"}
                        </motion.button>
                      )}
                    </AnimatePresence>

                  {/* Transformer Pop-out Specifications (Desktop Only) */}
                  <AnimatePresence>
                    {isActive && showSpecs && !isMobile && (
                      <div className="absolute inset-0 pointer-events-none z-30" style={{ transformStyle: "preserve-3d", transform: "rotateX(15deg)" }}>
                        {pcSpecsData.map((spec, i) => {
                          // HUD Layout for 9 Specs (4 Left, 5 Right)
                          const desktopLayout = [
                            { x: -380, y: -160 }, // 0: PROCESSOR
                            { x: -380, y: -50 },  // 1: GRAPHICS
                            { x: -380, y: 60 },   // 2: MAINBOARD
                            { x: -380, y: 170 },  // 3: MEMORY
                            { x: 380, y: -215 },  // 4: STORAGE
                            { x: 380, y: -105 },  // 5: DISPLAY
                            { x: 380, y: 5 },     // 6: KEYBOARD
                            { x: 380, y: 115 },   // 7: MOUSE
                            { x: 380, y: 225 },   // 8: HEADSET
                          ];

                          const popX = desktopLayout[i % desktopLayout.length].x;
                          const popY = desktopLayout[i % desktopLayout.length].y;
                          const popZ = 0; 
                          const rotY = i < 4 ? 15 : -15; // Inward tilt for HUD feel
                          const rotX = 0; 

                          const isExpanded = expandedAbility === spec.title;
                          const baseOpacity = 1;
                          const baseScale = isExpanded ? 1.2 : 1;
                          const zIndexFinal = isExpanded ? 100 : 50;
                          
                          // Determine 1 of 10 unique effects based on PC index
                          const pcIndex = index;
                          let initial: any, animate: any, exit: any, transition: any;
                          
                          switch (pcIndex % 10) {
                            case 0: // Cyber-kinetic Slam
                              initial = { opacity: 0, y: -100, scale: 1.5 };
                              animate = { filter: "blur(0px)" };
                              exit = { opacity: 0, y: -100, scale: 1.5 };
                              transition = { type: "spring", bounce: 0.7, delay: i * 0.1 };
                              break;
                            case 1: // Glitch RGB
                              initial = { opacity: 0, x: popX, y: popY, skewX: 20, filter: "hue-rotate(90deg)" };
                              animate = { skewX: 0, filter: "hue-rotate(0deg)" };
                              exit = { opacity: 0, x: popX, y: popY, skewX: 20, filter: "hue-rotate(90deg)" };
                              transition = { type: "spring", stiffness: 400, delay: i * 0.05 };
                              break;
                            case 2: // Magnetic Plasma
                              initial = { opacity: 0, x: 0, y: 0, scale: 0, borderRadius: "100%" };
                              animate = { borderRadius: "0%" };
                              exit = { opacity: 0, x: 0, y: 0, scale: 0, borderRadius: "100%" };
                              transition = { type: "spring", damping: 10, delay: i * 0.15 };
                              break;
                            case 3: // Hologram Shimmer
                              initial = { opacity: 0, x: popX, y: popY, scaleY: 0 };
                              animate = { scaleY: 1 };
                              exit = { opacity: 0, x: popX, y: popY, scaleY: 0 };
                              transition = { duration: 0.4, ease: "circOut", delay: i * 0.1 };
                              break;
                            case 4: // Glass Shatter
                              initial = { opacity: 0, x: popX + 50, y: popY - 50, rotateZ: 45, scale: 0.2 };
                              animate = { rotateZ: 0 };
                              exit = { opacity: 0, x: popX + 50, y: popY - 50, rotateZ: 45, scale: 0.2 };
                              transition = { type: "spring", stiffness: 300, delay: i * 0.08 };
                              break;
                            case 5: // Data Cascade (Flicker)
                              initial = { opacity: 0, x: popX, y: popY };
                              animate = { opacity: [0, 1, 0, 1, baseOpacity] };
                              exit = { opacity: 0, x: popX, y: popY };
                              transition = { duration: 0.5, delay: i * 0.1 };
                              break;
                            case 6: // Hydraulic Lock-in
                              initial = { opacity: 0, x: 0, y: 0 };
                              animate = {};
                              exit = { opacity: 0, x: 0, y: 0 };
                              transition = { type: "tween", ease: "circOut", duration: 0.4, delay: i * 0.1 };
                              break;
                            case 7: // Neon Outline Drop
                              initial = { opacity: 0, x: popX, y: -100, filter: "drop-shadow(0 0 50px white)" };
                              animate = { filter: "drop-shadow(0 0 0px white)" };
                              exit = { opacity: 0, x: popX, y: -100, filter: "drop-shadow(0 0 50px white)" };
                              transition = { type: "spring", damping: 15, delay: i * 0.1 };
                              break;
                            case 8: // Echo Trail
                              initial = { opacity: 0, x: popX - 100, y: popY, filter: "blur(20px)" };
                              animate = { filter: "blur(0px)" };
                              exit = { opacity: 0, x: popX - 100, y: popY, filter: "blur(20px)" };
                              transition = { type: "spring", mass: 2, delay: i * 0.1 };
                              break;
                            case 9: // Reactor Core Overload
                            default:
                              initial = { opacity: 0, x: popX, y: popY, scale: 2, filter: "brightness(3)" };
                              animate = { filter: "brightness(1)" };
                              exit = { opacity: 0, x: popX, y: popY, scale: 2, filter: "brightness(3)" };
                              transition = { type: "spring", stiffness: 200, delay: i * 0.1 };
                              break;
                          }

                          // Merge core layout props
                          animate = {
                            ...animate,
                            x: popX,
                            y: popY,
                            scale: animate.scale !== undefined ? animate.scale : baseScale,
                            opacity: Array.isArray(animate.opacity) ? animate.opacity : baseOpacity,
                          };

                          return (
                            <motion.div
                              key={spec.title}
                              initial={{ ...initial, z: popZ, rotateX: rotX, rotateY: rotY, zIndex: zIndexFinal }}
                              animate={{ ...animate, z: popZ, rotateX: rotX, rotateY: rotY, zIndex: zIndexFinal }}
                              exit={{ ...exit, z: popZ, rotateX: rotX, rotateY: rotY, zIndex: 0 }}
                              transition={transition}
                              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-[70px] md:w-[240px] md:h-[90px] cursor-pointer pointer-events-auto group perspective-[1000px] hover:z-50 ${isExpanded ? 'z-50' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (currentAbilityIndex !== i) {
                                  setCurrentAbilityIndex(i);
                                  setExpandedAbility(null);
                                } else {
                                  setExpandedAbility(isExpanded ? null : spec.title);
                                }
                              }}
                            >
                              {/* Jetpack Hover Effect Container — CSS animation */}
                              <div
                                className="w-full h-full relative animate-spec-float"
                                style={{ '--float-duration': `${3 + (i * 0.2)}s`, '--float-delay': `${i * 0.1}s` } as React.CSSProperties}
                              >
                                {/* 3D Flipping Container */}
                                <motion.div 
                                  className="w-full h-full relative"
                                  animate={{ rotateX: isExpanded ? 180 : 0 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                  style={{ transformStyle: "preserve-3d" }}
                                >
                                  {/* Front Side: Basic Stat */}
                                  <div 
                                    className={`absolute inset-0 nvidia-card p-2 md:p-4 bg-surface-dark/95 backdrop-blur-md border border-hairline ${theme.hoverBorder} transition-colors flex flex-col justify-center shadow-lg overflow-hidden`}
                                    style={{ backfaceVisibility: "hidden" }}
                                  >
                                    {/* Holographic Scan Line — CSS animation */}
                                    <div 
                                      className={`absolute left-0 right-0 h-[2px] ${theme.glow} shadow-[0_0_8px_currentColor] z-10 pointer-events-none opacity-60 animate-holo-scan`}
                                      style={{ '--scan-duration': `${1.5 + (i * 0.2)}s` } as React.CSSProperties}
                                    />
                                    {/* Digital Grid */}
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
                                    
                                    <div className="flex justify-between items-start relative z-20">
                                      <span className={`text-[9px] md:text-[10px] uppercase font-bold tracking-tight tracking-widest ${theme.text}`}>
                                        {spec.title}
                                      </span>
                                      <span className={`text-[8px] md:text-[9px] border ${theme.border} ${theme.text} px-1.5 py-0.5 uppercase`}>
                                        CLICK
                                      </span>
                                    </div>
                                    <h3 className="text-white font-bold tracking-tight text-[11px] md:text-sm mt-1 mb-2 leading-tight">
                                      {spec.value}
                                    </h3>
                                  </div>
                                
                                {/* Back Side: Detailed Ability Info */}
                                  <div 
                                    className={`absolute inset-0 nvidia-card p-3 bg-black/95 backdrop-blur-md border ${theme.border} transition-colors flex flex-col justify-center items-center text-center shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden`}
                                    style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
                                  >
                                  {/* Holographic Scan Line — CSS animation */}
                                  <div 
                                    className={`absolute left-0 right-0 h-[2px] ${theme.glow} shadow-[0_0_8px_currentColor] z-10 pointer-events-none opacity-60 animate-holo-scan`}
                                    style={{ '--scan-duration': `${1.5 + (i * 0.2)}s`, '--scan-delay': '0.5s' } as React.CSSProperties}
                                  />
                                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />

                                  <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest tracking-tight mb-2 relative z-20`}>-- {spec.title} DATA --</p>
                                  <p className="text-[10px] text-white/80 tracking-tight uppercase leading-relaxed relative z-20">{spec.desc}</p>
                                </div>
                              </motion.div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </AnimatePresence>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Mobile Dedicated Cyberpunk Spec HUD Sheet */}
      <AnimatePresence>
        {isMobile && showSpecs && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className={`absolute inset-2 sm:inset-4 z-[60] rounded-2xl bg-[#090a0e]/95 backdrop-blur-2xl border ${activeTheme.border50} p-3.5 sm:p-4 flex flex-col shadow-[0_12px_60px_rgba(0,0,0,0.95)] overflow-hidden`}
          >
            {/* Tech Corner Brackets */}
            <div className={`absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 ${activeTheme.border} opacity-70 pointer-events-none`} />
            <div className={`absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 ${activeTheme.border} opacity-70 pointer-events-none`} />
            <div className={`absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 ${activeTheme.border} opacity-70 pointer-events-none`} />
            <div className={`absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 ${activeTheme.border} opacity-70 pointer-events-none`} />

            {/* Background Ambient Glow & Cyber Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />
            <div className={`absolute -top-12 -right-12 w-36 h-36 ${activeTheme.glow} rounded-full blur-2xl pointer-events-none`} />

            {/* Header Section */}
            <div className="flex items-center justify-between pb-2.5 border-b border-hairline relative z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl ${activeTheme.bgLight} border ${activeTheme.border50} flex items-center justify-center shrink-0`}>
                  <Sparkles size={16} className={activeTheme.text} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${activeTheme.text}`}>
                      SPECIFICATION HUD
                    </span>
                    <span className="text-[10px] text-zinc-600">•</span>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">ONLINE</span>
                    </div>
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-tight truncate">
                    {activePc?.name}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpecs(false);
                  setExpandedAbility(null);
                }}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white/70 hover:text-white border border-hairline flex items-center justify-center transition shrink-0 ml-2"
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Telemetry Highlights */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 pb-1 relative z-10 shrink-0">
              <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-hairline flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-mono text-zinc-400 uppercase">GPU TIER</span>
                <span className="text-[10px] font-extrabold text-emerald-400 tracking-tight">HIGH FPS</span>
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-hairline flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-mono text-zinc-400 uppercase">MONITOR</span>
                <span className="text-[10px] font-extrabold text-cyan-400 tracking-tight">240Hz PRO</span>
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-hairline flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-mono text-zinc-400 uppercase">AUDIO</span>
                <span className="text-[10px] font-extrabold text-purple-400 tracking-tight">SURROUND 7.1</span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 py-1.5 relative z-10 shrink-0">
              <button
                type="button"
                onClick={() => setSpecCategory('all')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                  specCategory === 'all'
                    ? `${activeTheme.bg} text-black font-black shadow-[0_0_12px_rgba(255,255,255,0.2)]`
                    : 'bg-white/5 text-zinc-400 hover:text-white border border-hairline'
                }`}
              >
                Semua (9)
              </button>
              <button
                type="button"
                onClick={() => setSpecCategory('core')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                  specCategory === 'core'
                    ? `${activeTheme.bg} text-black font-black shadow-[0_0_12px_rgba(255,255,255,0.2)]`
                    : 'bg-white/5 text-zinc-400 hover:text-white border border-hairline'
                }`}
              >
                Mesin PC (5)
              </button>
              <button
                type="button"
                onClick={() => setSpecCategory('gear')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                  specCategory === 'gear'
                    ? `${activeTheme.bg} text-black font-black shadow-[0_0_12px_rgba(255,255,255,0.2)]`
                    : 'bg-white/5 text-zinc-400 hover:text-white border border-hairline'
                }`}
              >
                Monitor & Gear (4)
              </button>
            </div>

            {/* Scrollable Specs List */}
            <div className="flex-1 overflow-y-auto py-1 space-y-2 pr-1 relative z-10">
              {activePcSpecs
                .filter((spec) => {
                  const meta = getSpecMeta(spec.title);
                  if (specCategory === 'core') return meta.category === 'core';
                  if (specCategory === 'gear') return meta.category === 'gear';
                  return true;
                })
                .map((spec) => {
                  const meta = getSpecMeta(spec.title);
                  const IconComponent = meta.icon;
                  const isExpanded = expandedAbility === spec.title;
                  return (
                    <div
                      key={spec.title}
                      onClick={() => setExpandedAbility(isExpanded ? null : spec.title)}
                      className={`p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer border ${
                        isExpanded
                          ? `${meta.border} bg-white/[0.06] shadow-[0_0_15px_rgba(0,0,0,0.6)]`
                          : "bg-[#111319]/90 border-white/[0.06] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.border} ${meta.bg} ${meta.color} shadow-sm`}>
                          <IconComponent size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${meta.color}`}>
                              {spec.title}
                            </span>
                            <span className={`text-[8px] sm:text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${meta.border} ${meta.color} bg-black/50 shrink-0`}>
                              {meta.tag}
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-white leading-snug break-words">
                            {spec.value}
                          </div>
                        </div>
                        <div className="pt-1 text-zinc-500 shrink-0">
                          <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-2.5 pt-2 border-t border-hairline overflow-hidden"
                          >
                            <div className="flex items-start gap-2 bg-white/[0.02] p-2 rounded-lg border border-hairline">
                              <div className={`w-1 h-3 rounded-full ${meta.color.replace('text-', 'bg-')} shrink-0 mt-0.5`} />
                              <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                                {spec.desc}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-2.5 border-t border-hairline relative z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpecs(false);
                  setExpandedAbility(null);
                }}
                className="py-2.5 px-4 rounded-xl border border-hairline hover:bg-white/10 active:scale-95 text-white/70 hover:text-white font-bold text-xs uppercase tracking-wider transition shrink-0"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpecs(false);
                  setExpandedAbility(null);
                  if (onSelectPc && activePc) {
                    onSelectPc(activePc.id);
                  }
                }}
                className="flex-1 py-2.5 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition bg-nvidia-green hover:bg-white active:scale-95 text-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(118,185,0,0.35)] truncate"
              >
                <span className="truncate">Booking {activePc?.name}</span>
                <ArrowRight size={14} className="shrink-0" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
