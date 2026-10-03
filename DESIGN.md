# GC Net Hub — Design System Blueprint (DESIGN.md)

## 1. Visual Atmosphere & Philosophy
- **Vibe:** Cyber-tactical gaming hub, clean precision, and compact esports information density.
- **Density Level:** Cockpit Balanced (Scale 7/10). Dense enough to show critical information on one screen, but clean and legible.
- **Form Factor Rule:** Anti-gigantic. Interfaces must look like a high-end desktop web app and sleek mobile web app, not an oversized touchscreen kiosk.

## 2. Color Calibration
- **Base Background:** `#090a0c` (Obsidian Dark, never pure `#000000`)
- **Surface Dark:** `#0f1013` (Primary card surface)
- **Surface Soft:** `#15161b` (Secondary card surface / inputs)
- **Surface Hover / Highlight:** `#1d1f26`
- **Hairline Border:** `rgba(255, 255, 255, 0.08)` / `#23252c`
- **Hairline Focus / Active:** `rgba(255, 255, 255, 0.16)`
- **Primary Accent (Nvidia Green):** `#76b900`
- **Accent Glow:** `rgba(118, 185, 0, 0.18)` (subtle ambient, no blinding neon)
- **Semantic Status:**
  - Active / Success: `#76b900`
  - Pending / Warning: `#f59e0b` (Amber-500)
  - Expired / Danger: `#ef4444` (Red-500)
  - Scheduled / Slot: `#a855f7` (Purple-500)
  - Info / Layered: `#06b6d4` (Cyan-500)

## 3. Typography Architecture
- **Display / Heading Font:** `var(--font-sans)` (Plus Jakarta Sans), weights 600, 700, 800.
- **Data / Timer / Number Font:** `var(--font-geist-mono)` (Geist Mono), `tabular-nums`.
- **Typographic Scale:**
  - **Display Hero:** `text-2xl sm:text-3xl md:text-4xl lg:text-5xl` (capped at 48px, leading tight `leading-[1.05]`).
  - **Section Title:** `text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-tight`.
  - **Card / Subsection Title:** `text-sm sm:text-base font-bold`.
  - **Body / Standard:** `text-xs sm:text-sm` (12px - 14px), leading relaxed `leading-normal`.
  - **Micro Label / Badge:** `text-[10px] sm:text-[11px] font-bold uppercase tracking-wider`.
  - **Price / Metric Display:** `text-base sm:text-lg md:text-xl font-extrabold tabular-nums`.

## 4. Object & Layout Proportions
- **Container Max-Width:** `max-w-6xl` (1152px) or `max-w-7xl` (1280px) for wide dashboard views.
- **Section Spacing (Y-Axis):**
  - Mobile: `py-8 sm:py-10`
  - Desktop: `py-12 md:py-16` (replaces oversized `py-24`)
- **Card Padding:**
  - Compact / List Item: `p-2.5 sm:p-3.5`
  - Standard Card: `p-4 sm:p-5` (replaces `p-7` and `p-8`)
  - Modal Container: `p-4 sm:p-6`
- **Control Sizing (Buttons & Inputs):**
  - Small / Inline Button: `h-7 px-2.5 text-[11px]`
  - Standard Button: `h-9 sm:h-10 px-4 text-xs sm:text-sm font-bold`
  - Input / Select Field: `h-9 sm:h-10 px-3 text-xs sm:text-sm`
  - Touch Target on Mobile: Minimum 40px hit area with margin.
- **Radius System:**
  - Cards & Modals: `rounded-xl` (12px)
  - Buttons & Inputs: `rounded-lg` (8px)
  - Micro Pills / Badges: `rounded-md` (6px) or `rounded-full`

## 5. Mobile Responsiveness Rules
- Maximize above-the-fold content: user should see the essential state without having to scroll two full screens.
- Zero horizontal overflow on mobile viewports down to 320px width.
- Multi-column grids must gracefully fold to 1 column on mobile (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
- Avoid giant graphic ornaments or empty spacer divs that push content down on small screens.
- Data tables must provide an optimized card/list view on screens `< 768px`.
