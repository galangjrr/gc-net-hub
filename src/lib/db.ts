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
  member_id?: string;
  payment_method?: 'qris' | 'kasir';
  booking_type?: 'queue' | 'scheduled' | 'slot';
  scheduled_at?: string | null;
  start_time?: string | null;
  dana_partner_ref?: string;
  dana_reference_no?: string;
  dana_qr_content?: string;
  dana_payment_verified?: boolean;
  dana_paid_at?: string;
  dana_paid_amount?: number;
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
  { id: "inv-4", name: "Es Seduh Teajus Jasjus", price: 1500, stock: 50, category: "drink" },
  { id: "inv-5", name: "Aquviva Botol Kecil", price: 1000, stock: 24, category: "drink" },
  { id: "inv-6", name: "Ale-ale", price: 1000, stock: 24, category: "drink" },
  { id: "inv-7", name: "Panther", price: 1000, stock: 24, category: "drink" },
  { id: "inv-8", name: "Power F", price: 1000, stock: 24, category: "drink" },
  { id: "inv-9", name: "Royal Gelas", price: 500, stock: 48, category: "drink" }
];

export async function getDB(options?: { includeLogs?: boolean }): Promise<DatabaseSchema> {
  const shouldFetchLogs = options?.includeLogs ?? false;

  const [
    settingsRes,
    inventoryRes,
    pcsRes,
    paketsRes,
    bookingsRes,
    logsRes
  ] = await Promise.all([
    supabaseAdmin.from('settings').select('id, user_counter, daily_pdf_revenue').limit(1).maybeSingle(),
    supabaseAdmin.from('inventory').select('id, name, price, stock, category').neq('category', 'staff_account'),
    supabaseAdmin.from('pcs').select('id, name, status, expected_empty_time, image, specs').order('id', { ascending: true }),
    supabaseAdmin.from('pakets').select('id, name, price, duration_minutes, fixed_start_time, fixed_end_time, days, is_custom').order('price', { ascending: true }),
    supabaseAdmin.from('bookings').select('id, pc_id, paket_id, player_name, status, created_at, ss_bukti, member_id, booking_type, scheduled_at, start_time').order('created_at', { ascending: false }).limit(60),
    shouldFetchLogs 
      ? supabaseAdmin.from('logs').select('*').order('end_time', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] })
  ]);

  const settings = settingsRes.data;
  const inventory = inventoryRes.data;
  const pcs = pcsRes.data;
  const pakets = paketsRes.data;
  const bookings = bookingsRes.data;
  const logs = logsRes.data;

  // Hitung user_counter efektif agar selalu sinkron dengan User <N> tertinggi yang ada
  let effectiveUserCounter = typeof settings?.user_counter === 'number' ? settings.user_counter : 80;
  (bookings || []).forEach((b: any) => {
    if (b.player_name) {
      const match = b.player_name.match(/^User\s+(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > effectiveUserCounter) {
          effectiveUserCounter = num;
        }
      }
    }
  });

  const effectiveSettings = settings 
    ? { ...settings, user_counter: effectiveUserCounter } 
    : { id: 1, user_counter: effectiveUserCounter, daily_pdf_revenue: 0 };

  const isScheduled = (b: any) => {
    if (b.booking_type === 'slot' || b.booking_type === 'scheduled') return true;
    if (b.scheduled_at || b.start_time) return true;
    return false;
  };

  const activeBookingsMap = new Map<string, any>();
  (bookings || []).forEach((b: any) => {
    if (b.status === 'active' && b.pc_id) {
      const pcKey = b.pc_id.toLowerCase();
      const existing = activeBookingsMap.get(pcKey);
      if (!existing) {
        activeBookingsMap.set(pcKey, b);
      } else if (isScheduled(existing) && !isScheduled(b)) {
        // Antrean langsung yang aktif memiliki prioritas lebih tinggi dibanding booking jam tertentu
        activeBookingsMap.set(pcKey, b);
      }
    }
  });

  const now = Date.now();
  const cleanedPcs = (pcs || []).map((pc: any) => {
    const activeBooking = activeBookingsMap.get(pc.id.toLowerCase());
    const paket = activeBooking ? (pakets || []).find((p: any) => p.id === activeBooking.paket_id) : null;
    const expTime = pc.expected_empty_time ? new Date(pc.expected_empty_time).getTime() : null;
    const hasTimer = Boolean(expTime);
    const isStale = expTime ? (now - expTime > 30 * 60 * 1000) : false;

    if (isStale) {
      // Asynchronously clean up stale expired timer in background after 30m grace period
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

  // Prioritas antrean sistem:
  // 1. Antrean Langsung / Main Sekarang SELALU DI ATAS (prioritas utama)
  // 2. Booking Jam Tertentu (Scheduled) SELALU DI BAWAH
  const prioritizedBookings = (bookings || []).sort((a: any, b: any) => {
    const aSched = isScheduled(a);
    const bSched = isScheduled(b);
    if (!aSched && bSched) return -1;
    if (aSched && !bSched) return 1;
    if (aSched && bSched) {
      const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      if (aTime && bTime && aTime !== bTime) return aTime - bTime;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return {
    settings: effectiveSettings,
    inventory: inventory || [],
    pcs: cleanedPcs,
    pakets: pakets || [],
    bookings: prioritizedBookings,
    logs: logs || [],
    player_history: []
  };
}

export async function saveDB(db: DatabaseSchema): Promise<void> {
  throw new Error('saveDB is deprecated. Use direct Supabase queries for mutations.');
}
