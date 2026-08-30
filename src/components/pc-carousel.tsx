"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PC } from "@/lib/db";

interface PCCarouselProps {
  pcs: PC[];
}

const THEMES = [
  {
    glow: "bg-[#76b900]/10", 
    border: "border-[#76b900]", 
    border50: "border-[#76b900]/50",
    border30: "border-[#76b900]/30",
    text: "text-[#76b900]",
    text70: "text-[#76b900]/70",
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
    shadow: "shadow-[0_0_15px_rgba(244,63,94,0.2)]",
    shadowHover: "group-hover:shadow-[0_0_60px_rgba(244,63,94,0.3)]",
    hoverBorder: "hover:border-rose-500",
    hoverBg: "hover:bg-rose-500"
  }
];

export default function PCCarousel({ pcs }: PCCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSpecs, setShowSpecs] = useState(false);
  const [expandedAbility, setExpandedAbility] = useState<string | null>(null);
  const [currentAbilityIndex, setCurrentAbilityIndex] = useState(4); // Start in middle
  const [isMobile, setIsMobile] = useState(false);

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
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    setShowSpecs(false);
    setExpandedAbility(null);
    setCurrentAbilityIndex(4);
  };

  if (!pcs || pcs.length === 0) return null;

  const activeTheme = THEMES[currentIndex % THEMES.length];

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

                  {/* Transformer Pop-out Specifications */}
                  <AnimatePresence>
                    {isActive && showSpecs && (
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

                          const desktopPopX = desktopLayout[i % desktopLayout.length].x;
                          const desktopPopY = desktopLayout[i % desktopLayout.length].y;
                          const desktopPopZ = 0; 
                          const desktopRotY = i < 4 ? 15 : -15; // Inward tilt for HUD feel
                          const desktopRotX = 0; 

                          let popX, popY;
                          if (isMobile) {
                            if (i < 4) {
                              popX = i % 2 === 0 ? -95 : 95;
                              popY = -225 + Math.floor(i / 2) * 70; 
                            } else {
                              const botI = i - 4; 
                              if (botI < 4) {
                                popX = botI % 2 === 0 ? -95 : 95;
                                popY = 145 + Math.floor(botI / 2) * 70; 
                              } else {
                                popX = 0;
                                popY = 145 + 2 * 70; // 285px - fits comfortably
                              }
                            }
                          } else {
                            popX = desktopPopX;
                            popY = desktopPopY;
                          }

                          const popZ = isMobile ? 0 : desktopPopZ; 
                          const rotY = isMobile ? 0 : desktopRotY;
                          const rotX = isMobile ? 0 : desktopRotX;
                          
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
    </div>
  );
}
