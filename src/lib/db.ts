import { supabaseAdmin } from './supabase';


export interface PCSpecs {
  cpu: string;
  gpu: string;
  mainboard?: string;
  ram?: string;
  storage?: string;
  monitor: string;
  keyboard: string;
  mouse: string;
  headset: string;
  koneksi?: string;
  games?: string[];
}

export type PC = {
  id: string;
  name: string;
  status?: 'available' | 'occupied' | 'maintenance' | string;
  player_name?: string;
  paket_name?: string;
  expected_empty_time?: string;
  image?: string;
  specs?: PCSpecs;
};

export type Paket = {
  id: string;
  name: string;
  price: number;
  duration_minutes?: number; // In minutes, used for regular
  fixed_start_time?: string; // e.g. "22:00"
  fixed_end_time?: string;   // e.g. "04:00"
  days?: string[];           // e.g. ["Sen", "Sel"]
  is_custom?: boolean;
};

export type InventoryItem = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: 'food' | 'drink' | 'other' | 'staff_account';
};

export type Booking = {
  id: string;
  pc_id: string;
  paket_id: string;
  player_name: string;
  status: 'pending' | 'active';
  created_at: string; // ISO String
  ss_bukti?: string; // URL or base64 if needed
};

export type LogEntry = {
  id: string;
  player_name: string;
  pc_name: string;
  paket_name: string;
  price: number;
  start_time: string;
  end_time: string;
  status: 'Selesai' | 'Batal';
  reason?: string;
};

export type DatabaseSchema = {
  settings: Record<string, any>;
  pcs: PC[];
  pakets: Paket[];
  inventory: InventoryItem[]; // NEW table
  bookings: Booking[];
  logs: LogEntry[];
  player_history: string[];
};

/**
 * Read the database.json file.
 * Returns the parsed JSON or throws an error.
 */
const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: "inv-1", name: "Indomie Goreng Jumbo", price: 7000, stock: 20, category: "food" },
  { id: "inv-2", name: "Teh Pucuk", price: 3000, stock: 24, category: "drink" },
  { id: "inv-3", name: "Golda", price: 4000, stock: 24, category: "drink" },
  { id: "inv-4", name: "Es Seduh (Teajus / Jasjus)", price: 1500, stock: 50, category: "drink" },
  { id: "inv-5", name: "Aquviva Botol Kecil", price: 1000, stock: 24, category: "drink" },
  { id: "inv-6", name: "Ale-ale", price: 1000, stock: 24, category: "drink" },
  { id: "inv-7", name: "Panther", price: 1000, stock: 24, category: "drink" },
  { id: "inv-8", name: "Power F", price: 1000, stock: 24, category: "drink" },
  { id: "inv-9", name: "Royal Gelas", price: 500, stock: 48, category: "drink" }
];

export async function getDB(): Promise<DatabaseSchema> {
  const [
    { data: settings },
    { data: inventory },
    { data: pcs },
    { data: pakets },
    { data: bookings },
    { data: logs }
  ] = await Promise.all([
    supabaseAdmin.from('settings').select('id, user_counter, daily_pdf_revenue').limit(1).single(),
    supabaseAdmin.from('inventory').select('id, name, price, stock, category').neq('category', 'staff_account'),
    supabaseAdmin.from('pcs').select('id, name, status, expected_empty_time, image, specs').order('id', { ascending: true }),
    supabaseAdmin.from('pakets').select('id, name, price, duration_minutes, fixed_start_time, fixed_end_time, days, is_custom').order('price', { ascending: true }),
    supabaseAdmin.from('bookings').select('id, pc_id, paket_id, player_name, status, created_at').order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('logs').select('id, player_name, pc_name, paket_name, price, start_time, end_time, status, reason').order('end_time', { ascending: false }).limit(100)
  ]);

  const now = Date.now();
  const activeBookingsMap = new Map<string, any>();
  (bookings || []).forEach((b: any) => {
    if (b.status === 'active' && b.pc_id) {
      activeBookingsMap.set(b.pc_id.toLowerCase(), b);
    }
  });

  const cleanedPcs = (pcs || []).map((pc: any) => {
    const activeBooking = activeBookingsMap.get(pc.id.toLowerCase());
    const paket = activeBooking ? (pakets || []).find((p: any) => p.id === activeBooking.paket_id) : null;
    const hasTimer = pc.expected_empty_time && new Date(pc.expected_empty_time).getTime() > now;

    if (pc.expected_empty_time && new Date(pc.expected_empty_time).getTime() <= now) {
      // Asynchronously clean up stale expired timer in background
      supabaseAdmin.from('pcs').update({ expected_empty_time: null, status: 'available' }).eq('id', pc.id).then();
      return { 
        ...pc, 
        expected_empty_time: null, 
        status: 'available',
        player_name: undefined,
        paket_name: undefined
      };
    }

    return { 
      ...pc, 
      status: (pc.status === 'occupied' || hasTimer) ? 'occupied' : (pc.status || 'available'),
      player_name: activeBooking ? activeBooking.player_name : pc.player_name,
      paket_name: paket ? paket.name : (pc.status === 'occupied' ? 'Paket Billing' : undefined)
    };
  });

  return {
    settings: settings || { userCounter: 1 },
    inventory: inventory || [],
    pcs: cleanedPcs,
    pakets: pakets || [],
    bookings: bookings || [],
    logs: logs || [],
    player_history: []
  };
}

export async function saveDB(db: DatabaseSchema): Promise<void> {
  throw new Error('saveDB is deprecated. Use direct Supabase queries for mutations.');
}
