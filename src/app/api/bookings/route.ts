import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// In-Memory Rate Limiting untuk Anti-Spam Booking
const bookingAttempts = new Map<string, { count: number; resetTime: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

function checkBookingRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 3 * 60 * 1000; // 3 menit window
  const maxBookings = 5; // Maksimal 5 booking per 3 menit

  const record = bookingAttempts.get(ip);
  if (!record || record.resetTime <= now) {
    bookingAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxBookings) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const isAdmin = isAdminRequest(req);

    // 1. Rate Limiting Check (Hanya untuk request publik/pemain)
    if (!isAdmin && !checkBookingRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Terlalu banyak booking dalam waktu singkat. Tunggu 3 menit dulu ya.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { pc_id, paket_id, player_name, ss_bukti, is_admin_manual, member_id } = body;
    
    // 2. Guard: Admin Manual Auth Enforcement
    if (is_admin_manual && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Sesi admin tidak valid.' }, { status: 401 });
    }

    // 3. Input Validation & Sanitization
    if (!pc_id || typeof pc_id !== 'string' || pc_id.length > 30) {
      return NextResponse.json({ error: 'PC ID tidak valid atau terlalu panjang.' }, { status: 400 });
    }

    if (!paket_id || typeof paket_id !== 'string' || paket_id.length > 50) {
      return NextResponse.json({ error: 'Paket ID tidak valid.' }, { status: 400 });
    }

    // Guard: ss_bukti format & size limit (Maks 2MB)
    if (ss_bukti) {
      if (typeof ss_bukti !== 'string' || !ss_bukti.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Format gambar bukti tidak valid.' }, { status: 400 });
      }
      if (ss_bukti.length > 3 * 1024 * 1024) { // ~2MB decoded
        return NextResponse.json({ error: 'Ukuran bukti pembayaran terlalu besar (Maksimal 2MB).' }, { status: 400 });
      }
    }

    // 4. PC Exist Check
    const { data: pc } = await supabaseAdmin.from('pcs').select('id').eq('id', pc_id).single();
    if (!pc) return NextResponse.json({ error: 'PC tidak ditemukan' }, { status: 404 });

    // 5. Paket Exist Check
    const { data: paket } = await supabaseAdmin.from('pakets').select('id').eq('id', paket_id).single();
    if (!paket) return NextResponse.json({ error: 'Paket tidak ditemukan' }, { status: 404 });
    
    // 6. Player Name Sanitization (Hapus tag HTML, strip spasi, batasi 30 karakter)
    let finalPlayerName = typeof player_name === 'string' ? player_name.replace(/[<>]/g, '').trim() : '';
    if (finalPlayerName.length > 30) {
      finalPlayerName = finalPlayerName.substring(0, 30);
    }

    if (!finalPlayerName) {
      if (!is_admin_manual) {
        return NextResponse.json({ error: 'Nama pemain wajib diisi!' }, { status: 400 });
      }
      
      // Auto counter generator untuk kasir manual
      const { data: settings } = await supabaseAdmin.from('settings').select('*').limit(1).single();
      const currentCounter = settings?.user_counter || 1;
      finalPlayerName = `User ${currentCounter}`;

      await supabaseAdmin.from('settings').update({ user_counter: currentCounter + 1 }).eq('id', settings?.id || 1);
    }

    // 7. Insert Booking Payload (Format: GC + 4 angka unik, contoh: GC1001)
    let bookingId = `GC${Math.floor(1000 + Math.random() * 9000)}`;
    for (let i = 0; i < 8; i++) {
      const candidate = `GC${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: existing } = await supabaseAdmin.from('bookings').select('id').eq('id', candidate).maybeSingle();
      if (!existing) {
        bookingId = candidate;
        break;
      }
    }

    const newBooking = {
      id: bookingId,
      pc_id,
      paket_id,
      player_name: finalPlayerName,
      status: is_admin_manual ? 'active' : 'pending',
      created_at: new Date().toISOString(),
      ss_bukti: ss_bukti || null,
      member_id: member_id || null
    };

    const { error: insertError } = await supabaseAdmin.from('bookings').insert(newBooking);
    if (insertError) {
      console.error('Insert booking error:', insertError);
      return NextResponse.json({ error: insertError.message || 'Gagal menyimpan data booking' }, { status: 500 });
    }

    return NextResponse.json(newBooking);
  } catch (error: any) {
    console.error('Create booking catch error:', error);
    return NextResponse.json({ error: error?.message || 'Gagal memproses booking' }, { status: 500 });
  }
}
