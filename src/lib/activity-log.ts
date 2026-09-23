import { getAdminSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export interface ActivityPayload {
  action: string;
  target?: string;
  details?: string;
  actor?: string;
  role?: string;
}

/**
 * Helper sentral untuk mencatat audit log aktivitas operator / staf.
 * Disimpan ke tabel logs dengan status 'Aktivitas' dan price 0 agar terisolasi dari rekap keuangan.
 */
export async function logActivity(req: Request | null, payload: ActivityPayload) {
  try {
    let username = payload.actor || 'Sistem';
    let role = payload.role || 'system';

    if (req) {
      const session = getAdminSession(req);
      if (session) {
        username = session.user;
        role = session.role;
      }
    }

    const now = new Date();
    const id = `act-${crypto.randomUUID()}`;

    const { error } = await supabaseAdmin.from('logs').insert({
      id,
      player_name: username,
      pc_name: (payload.target || 'SISTEM').toUpperCase(),
      paket_name: payload.action,
      price: 0,
      start_time: now.toISOString(),
      end_time: now.toISOString(),
      status: 'Aktivitas',
      reason: payload.details ? `[${role.toUpperCase()}] ${payload.details}` : `[${role.toUpperCase()}]`
    });

    if (error) {
      console.error('Gagal mencatat log aktivitas ke Supabase:', error.message);
    }
  } catch (err) {
    console.error('Kesalahan eksekusi logActivity:', err);
  }
}
