"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";

export default function GameIcons({ isMobile }: { isMobile: boolean }) {
  const [pingPong, setPingPong] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const interval = setInterval(() => setPingPong(p => !p), 1500);
    return () => clearInterval(interval);
  }, [isMobile]);

  const games = [
    {
      name: "ROBLOX",
      iconNode: (active: boolean) => (
        <svg viewBox="0 0 120 120" className={`w-7 h-7 md:w-8 md:h-8 transition-all duration-700 relative z-10 ${active ? 'opacity-100 drop-shadow-[0_0_20px_rgba(0,162,255,1)] fill-[#00A2FF]' : 'opacity-60 md:group-hover:opacity-100 md:group-hover:drop-shadow-[0_0_20px_rgba(0,162,255,1)] fill-white md:group-hover:fill-[#00A2FF]'}`}>
          <path className={`transition-transform duration-700 ${active ? 'translate-x-0 translate-y-0' : '-translate-x-[15px] -translate-y-[15px] md:group-hover:translate-x-0 md:group-hover:translate-y-0'}`} d="M25.5,0L120,25.3l-10.2,38.2L53.4,48.4l-2.9,10.8L12.4,49L25.5,0z" />
          <path className={`transition-transform duration-700 ${active ? 'translate-x-0 translate-y-0' : 'translate-x-[15px] translate-y-[15px] md:group-hover:translate-x-0 md:group-hover:translate-y-0'}`} d="M94.6,119.9L0.1,94.6l10.2-38.2l56.3,15.1l2.9-10.8l38.2,10.2L94.6,119.9z" />
        </svg>
      )
    },
    {
      name: "POINT BLANK",
      iconNode: (active: boolean) => (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <style>{`
            @keyframes pbFlashFilter {
              0% { 
                filter: invert(100%) sepia(100%) hue-rotate(190deg) saturate(5) brightness(4) drop-shadow(0 0 40px white);
                transform: scale(1.1);
              }
              15% { 
                filter: invert(100%) sepia(100%) hue-rotate(190deg) saturate(5) brightness(1.5) drop-shadow(0 0 10px #00A2FF);
                transform: scale(0.9) translateY(4px);
              }
              100% { 
                filter: invert(100%) sepia(100%) hue-rotate(190deg) saturate(5) brightness(1.2) drop-shadow(0 0 15px #00A2FF);
                transform: scale(1) translateY(0);
              }
            }
            .pb-anim-force {
              animation: pbFlashFilter 0.5s ease-out forwards !important;
            }
            .group:hover .pb-animated-flash {
              animation: pbFlashFilter 0.5s ease-out forwards !important;
            }
          `}</style>
          <div className={`absolute inset-0 w-full h-full z-10 pb-animated-flash ${active ? 'pb-anim-force' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/PB.svg" alt="POINT BLANK Left" className={`absolute w-full h-full object-contain p-2 transition-all ease-out mix-blend-screen invert ${active ? 'duration-500 opacity-100 translate-x-0 translate-y-0' : 'duration-700 opacity-0 -translate-x-2 -translate-y-1 md:opacity-60 md:group-hover:duration-500 md:group-hover:opacity-100 md:group-hover:translate-x-0 md:group-hover:translate-y-0'}`} style={{ clipPath: 'polygon(0 0, 54% 0, 49% 100%, 0 100%)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/PB.svg" alt="POINT BLANK Right" className={`absolute w-full h-full object-contain p-2 transition-all ease-out mix-blend-screen invert ${active ? 'duration-500 opacity-100 translate-x-0 translate-y-0' : 'duration-700 opacity-0 translate-x-2 translate-y-1 md:opacity-60 md:group-hover:duration-500 md:group-hover:opacity-100 md:group-hover:translate-x-0 md:group-hover:translate-y-0'}`} style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 45% 100%)' }} />
          </div>
          <div className={`absolute bottom-2 w-8 h-[2px] transition-all duration-700 z-20 ${active ? 'bg-nvidia-green shadow-[0_0_10px_rgba(118,185,0,1)] scale-x-150' : 'bg-white/40 md:group-hover:bg-nvidia-green md:group-hover:shadow-[0_0_10px_rgba(118,185,0,1)] md:group-hover:scale-x-150'}`} />
        </div>
      )
    },
    {
      name: "VALORANT",
      iconNode: (active: boolean) => (
        <svg viewBox="243 4 515 423" className={`w-7 h-7 md:w-8 md:h-8 transition-all duration-700 relative z-10 ${active ? 'opacity-100 drop-shadow-[0_0_20px_rgba(255,70,85,1)] fill-[#FF4655]' : 'opacity-60 md:group-hover:opacity-100 md:group-hover:drop-shadow-[0_0_20px_rgba(255,70,85,1)] fill-white md:group-hover:fill-[#FF4655]'}`}>
          <path className={`transition-transform duration-700 ${active ? 'translate-x-0 translate-y-0' : '-translate-x-[40px] -translate-y-[40px] md:group-hover:translate-x-0 md:group-hover:translate-y-0'}`} d="M 245.44 4.65 C 248.61 2.76 250.63 6.58 252.34 8.59 C 362.37 146.24 472.53 283.79 582.55 421.44 C 584.81 423.40 583.10 427.59 580.05 427.14 C 527.37 427.20 474.68 427.16 422.00 427.16 C 417.78 427.21 413.74 425.11 411.15 421.82 C 356.49 353.53 301.86 285.21 247.20 216.91 C 244.88 214.15 243.68 210.58 243.83 206.99 C 243.83 141.01 243.85 75.02 243.81 9.04 C 243.84 7.48 243.78 5.46 245.44 4.65 Z" />
          <path className={`transition-transform duration-700 ${active ? 'translate-x-0 translate-y-0' : 'translate-x-[40px] -translate-y-[40px] md:group-hover:translate-x-0 md:group-hover:translate-y-0'}`} d="M 754.32 4.33 C 756.57 3.48 759.05 5.56 758.72 7.92 C 758.80 73.93 758.71 139.94 758.76 205.95 C 758.91 209.69 758.09 213.56 755.66 216.50 C 739.05 237.28 722.42 258.05 705.81 278.82 C 703.04 282.42 698.51 284.41 693.98 284.18 C 641.65 284.13 589.31 284.21 536.98 284.14 C 533.89 284.62 532.13 280.45 534.41 278.44 C 606.98 187.65 679.61 96.89 752.22 6.12 C 752.77 5.34 753.47 4.74 754.32 4.33 Z" />
        </svg>
      )
    }
  ];

  return (
    <>
      {games.map((game, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 20 }}
          className="group flex flex-col items-center gap-4 w-20 md:w-28"
        >
          <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-b from-white/10 to-black/50 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-700 ease-out cursor-crosshair overflow-hidden md:group-hover:border-nvidia-green md:group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0_40px_rgba(118,185,0,0.5)] md:group-hover:-translate-y-4 md:group-hover:scale-110 ${pingPong && isMobile ? 'border-nvidia-green shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0_40px_rgba(118,185,0,0.5)] -translate-y-4 scale-110' : ''}`}>
            <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_150%,rgba(118,185,0,0.4),transparent_70%)] transition-opacity duration-700 opacity-0 md:group-hover:opacity-100 ${pingPong && isMobile ? 'opacity-100' : ''}`} />
            {game.iconNode(pingPong && isMobile)}
          </div>
          <span className={`tracking-tight text-[10px] md:text-xs font-bold uppercase tracking-widest text-center transition-all duration-700 text-white/30 md:group-hover:text-nvidia-green md:group-hover:drop-shadow-[0_0_8px_rgba(118,185,0,0.8)] ${pingPong && isMobile ? 'text-nvidia-green drop-shadow-[0_0_8px_rgba(118,185,0,0.8)]' : ''}`}>
            {game.name}
          </span>
        </motion.div>
      ))}
    </>
  );
}
