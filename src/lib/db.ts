import { supabase } from './supabase';

// Get the path to database.json in the project root
const dbPath = path.join(process.cwd(), 'database.json');

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
  category: 'food' | 'drink' | 'other';
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
    supabase.from('settings').select('*').limit(1).single(),
    supabase.from('inventory').select('*'),
    supabase.from('pcs').select('*'),
    supabase.from('pakets').select('*'),
    supabase.from('bookings').select('*'),
    supabase.from('logs').select('*')
  ]);

  return {
    settings: settings || { userCounter: 1 },
    inventory: inventory || [],
    pcs: pcs || [],
    pakets: pakets || [],
    bookings: bookings || [],
    logs: logs || [],
    player_history: []
  };
}

export async function saveDB(db: DatabaseSchema): Promise<void> {
  throw new Error('saveDB is deprecated. Use direct Supabase queries for mutations.');
}
