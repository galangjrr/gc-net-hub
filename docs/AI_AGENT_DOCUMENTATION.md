# GC Net Booking - Comprehensive AI Agent System Encyclopedia

## 1. System Architecture & Routing Map
This system is built entirely on **Next.js (App Router)** and utilizes **Tailwind CSS v4** + **Framer Motion** for styling and animations.

### Active App Routes (`src/app/`)
- `page.tsx` (Root): The primary public-facing Single Page Application (SPA). Contains the main landing view, PC Showcase, Pricelist, and Booking form. Heavy client-side state (`"use client"`).
- `/admin`: Dashboard for operators to manage master data (PCs, Packages, Inventory, Settings).
- `/kasir`: Operator dashboard to approve bookings, view pooling, and complete/cancel active sessions.
- `/data-booking`: Historical booking data view.
- `/data-pc`: PC master management.
- `/paket-billing`: Package master management.
- `/log`: Transaction logging interface.
- `/stok-kasir`: Inventory management interface.
- `/status` & `/member`: User/Status specific displays.
- `/api/...`: Next.js Route Handlers mimicking a backend for database interactions.

### Data Storage Strategy
- **Currently**: The codebase relies on Next.js API Routes (`/api/data`, `/api/bookings`) which read/write to a local `database.json` via `src/lib/db.ts`. 
- **Future Roadmap**: As defined in the `implementation_plan.md`, the entire database is slated to move to **Supabase (PostgreSQL, Auth, RLS)**. Future AI agents must ensure database writes transition to Supabase.

---

## 2. Strict Design Language (NVIDIA-EMEA Style)
The UI strictly adheres to the **NVIDIA Marketing System** aesthetic. **DO NOT DEVIATE from these rules when adding new components.**

### Geometry & Shape Constraints
- **NO ROUNDED CORNERS (mostly)**: The system is hyper-angular. You must use `rounded-sm` (2px radius) for ALL interactive elements (buttons, inputs, cards). 
- **Banned Classes**: `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` (except for specific brand icon circles).
- **Depth/Elevation**: BANNED. Do not use drop shadows (`shadow-md`, `shadow-lg`) to lift cards. Use hairline borders (`border-white/10` or `border-hairline`) on flat surfaces. The only exception is neon glow effects (`drop-shadow`) explicitly requested by the user.

### Color Palette (Single Accent)
- **Primary Accent (NVIDIA Green)**: `#76b900`. Used exclusively for primary calls-to-action (CTAs), active states, and corner square decorations. 
- **Surface Dark (Hero/Footer)**: `#000000` (`bg-surface-dark`).
- **Canvas (Body)**: `#ffffff` (`bg-canvas`).
- **Do not introduce new colors** (no red/blue warnings unless explicitly instructed; default to NVIDIA Green for active, white/gray for inactive).

### Typography
- Uses the `NVIDIA-EMEA` proprietary font (fallback to Inter/Arial). 
- Hierarchy is established through **font-weight (400 vs 700)** and **size**, not color tinting. Use `uppercase` for small utility text and captions.

---

## 3. Data Models (`src/lib/db.ts`)
The system follows strict typing. Ensure all API responses and component props respect these interfaces:

```typescript
export interface PCSpecs {
  cpu: string; gpu: string; ram: string; storage: string; monitor: string; koneksi: string; games: string[];
}

export type PC = {
  id: string; name: string; status: 'available' | 'occupied'; specs?: PCSpecs;
};

export type Paket = {
  id: string; name: string; price: number; is_custom?: boolean;
};

export type InventoryItem = {
  id: string; name: string; price: number; stock: number; category: 'food' | 'drink' | 'other';
};

export type Booking = {
  id: string; pc_id: string; paket_id: string; player_name: string; 
  status: 'pending' | 'active'; created_at: string; ss_bukti?: string; 
};

export type LogEntry = {
  id: string; player_name: string; pc_name: string; paket_name: string; 
  price: number; start_time: string; end_time: string; status: 'Selesai' | 'Batal'; reason?: string;
};
```

---

## 4. Core Business Logic & Interactions

### Polling Mechanism
The `page.tsx` currently fetches data automatically via `setInterval` polling every 5 seconds (`GET /api/data`). It compares the state to trigger re-renders. 

### Booking Flow (`page.tsx`)
1. User selects a PC (Only 'available' PCs can be clicked).
2. User selects a Package (Pricing is dynamically mapped; supports Custom Package duration).
3. User types Name (Future implementation: Searchable Combobox with History).
4. User uploads Transfer Screenshot (`ss_bukti`). Capped at 2MB. Converted to Base64 via FileReader.
5. `POST /api/bookings` is called. PC status becomes 'occupied' and booking enters 'pending' state.

### Cash Pooling (Kasir Logic)
- Active bookings in 'active' or 'pending' state represent the "Live Money Pool".
- When an operator clicks **"Selesai"**, the transaction is logged to `logs`, the PC is freed ('available'), and the money is added to daily revenue.
- When an operator clicks **"Batal"**, they MUST select a cancellation reason (e.g., "Salah Input"). The PC is freed, logged as 'Batal', and revenue is NOT added.

### Destructive Action Safeguards
Any action that deletes or completes a record MUST invoke a confirmation dialog (`confirm()`) before executing the API call.

---

## 5. UI Components Inventory (`src/components/`)
- **`PinGuard.tsx`**: A locking mechanism. Prompts for a 4-digit PIN (default "1234") before allowing access to secure routes (`/kasir`, `/admin`). Stores auth state in `sessionStorage`.
- **`pc-carousel.tsx`**: A heavily animated Framer Motion carousel displaying PC specs. Controlled by mouse wheel tracking (`activeCategory`).
- **`sidebar.tsx`**: Desktop/Mobile navigation. Features a highly customized logo switch on hover (`[clip-path:circle(...)]` animation).
- **`navbar.tsx`**: Top navigation for internal routing (usually used within `/kasir` or `/admin` interfaces).

## 6. UI/UX Animation Maintenance Rules
The system heavily utilizes **Framer Motion** and **Tailwind Arbitrary Variants** (e.g., `clip-path`) for complex visual effects. When modifying or maintaining animations, strictly adhere to these rules:
- **No Vector Flow (Stroke) Animations on PNGs**: The logo files (`GC Master Logo.svg`, etc.) are raster PNGs wrapped in SVG tags. You **cannot** use stroke-dasharray or path-drawing animations on them. Use opacity, scale, or clip-path masking instead.
- **Framer Motion Variants**: Keep `variants` outside the component body whenever possible to prevent unnecessary re-renders. Use `AnimatePresence` strictly for unmounting components, and ensure the direct child has a unique `key`.
- **Performance Constraints**: Do not animate Layout dimensions (`width`, `height`) on large lists or loops. Prefer animating `transform` (`scale`, `x`, `y`) and `opacity` to avoid layout thrashing.
- **Micro-interactions (Tailwind)**: For simple hover states (like the logo `clip-path` circle expansion), prefer native Tailwind CSS `group-hover:`, `transition-all`, and `duration-*` over mounting a full Framer Motion component.

## 7. How to Extend This App (AI Directives)
- **Do not rewrite existing features** unless explicitly asked.
- **Do not inject external UI libraries** (e.g., Shadcn, MUI, Radix) unless requested. Build raw Tailwind + Framer Motion.
- **Maintain One-Fact-One-Place**: If expanding the DB, never copy a string (e.g., `pc_name`) into a new table if you can use `pc_id` and JOIN/Map the data on the client or server.
- **Always read this document first.**
