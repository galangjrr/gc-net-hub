import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity-log';

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
    const { pc_id, paket_id, player_name, ss_bukti, is_admin_manual, member_id, booking_type, scheduled_at, start_time } = body;
    
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
    const { data: paket } = await supabaseAdmin.from('pakets').select('id, name, fixed_start_time, fixed_end_time').eq('id', paket_id).single();
    if (!paket) return NextResponse.json({ error: 'Paket tidak ditemukan' }, { status: 404 });
    
    // 6. Player Name Sanitization (Hapus tag HTML, strip spasi, batasi 30 karakter)
    let finalPlayerName = typeof player_name === 'string' ? player_name.replace(/[<>]/g, '').trim() : '';
    if (finalPlayerName.length > 30) {
      finalPlayerName = finalPlayerName.substring(0, 30);
    }

    const userMatch = finalPlayerName.match(/^User\s+(\d+)$/i);

    if (!finalPlayerName) {
      if (!is_admin_manual) {
        return NextResponse.json({ error: 'Nama pemain wajib diisi!' }, { status: 400 });
      }
      
      // Auto counter generator untuk kasir manual
      const { data: settings } = await supabaseAdmin.from('settings').select('*').limit(1).single();
      let currentCounter = typeof settings?.user_counter === 'number' ? settings.user_counter : 80;

      // Self-healing: periksa booking terbaru yang menggunakan format User <N>
      const { data: recentUserBookings } = await supabaseAdmin
        .from('bookings')
        .select('player_name')
        .ilike('player_name', 'User %')
        .order('created_at', { ascending: false })
        .limit(30);

      if (recentUserBookings && recentUserBookings.length > 0) {
        for (const b of recentUserBookings) {
          const m = b.player_name?.match(/^User\s+(\d+)$/i);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > currentCounter) {
              currentCounter = num;
            }
          }
        }
      }

      const nextCounter = currentCounter + 1;
      finalPlayerName = `User ${nextCounter}`;

      await supabaseAdmin.from('settings').update({ user_counter: nextCounter }).eq('id', settings?.id || 1);
    } else if (is_admin_manual && userMatch) {
      // Jika kasir manual mengirimkan nama User <N> (dari autofill client), pastikan counter database ikut maju
      const usedNum = parseInt(userMatch[1], 10);
      const { data: settings } = await supabaseAdmin.from('settings').select('*').limit(1).single();
      const currentCounter = typeof settings?.user_counter === 'number' ? settings.user_counter : 80;
      if (usedNum >= currentCounter) {
        await supabaseAdmin.from('settings').update({ user_counter: usedNum }).eq('id', settings?.id || 1);
      }
    }

    // 7. Deteksi Booking Jam Tertentu (Fixed Paket atau Pilihan Waktu Khusus)
    const isFixedPaket = Boolean(paket.fixed_start_time);
    const isExplicitScheduled = booking_type === 'scheduled' || Boolean(scheduled_at) || Boolean(start_time);
    const isScheduled = isFixedPaket || isExplicitScheduled;

    let resolvedStartTime: string | null = null;
    let resolvedScheduledAt: string | null = null;

    if (isScheduled) {
      resolvedStartTime = start_time || paket.fixed_start_time || null;
      if (scheduled_at) {
        resolvedScheduledAt = scheduled_at;
      } else if (resolvedStartTime) {
        // Buat timestamp ISO untuk jadwal hari ini
        try {
          const [hh, mm] = resolvedStartTime.split(':').map(Number);
          const schedDate = new Date();
          schedDate.setHours(hh || 0, mm || 0, 0, 0);
          resolvedScheduledAt = schedDate.toISOString();
        } catch (_) {
          resolvedScheduledAt = null;
        }
      }
    }

    // 8. Insert Booking Payload (Format: GC + 4 angka unik, contoh: GC1001)
    let bookingId = `GC${Math.floor(1000 + Math.random() * 9000)}`;
    for (let i = 0; i < 8; i++) {
      const candidate = `GC${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: existing } = await supabaseAdmin.from('bookings').select('id').eq('id', candidate).maybeSingle();
      if (!existing) {
        bookingId = candidate;
        break;
      }
    }

    let initialStatus = 'pending';
    if (is_admin_manual) {
      const { data: activeExisting } = await supabaseAdmin
        .from('bookings')
        .select('id, booking_type, scheduled_at, start_time')
        .eq('pc_id', pc_id)
        .eq('status', 'active')
        .maybeSingle();

      if (!activeExisting) {
        initialStatus = 'active';
      } else {
        const isExistingScheduled = activeExisting.booking_type === 'slot' || activeExisting.booking_type === 'scheduled' || Boolean(activeExisting.scheduled_at || activeExisting.start_time);
        if (!isScheduled && isExistingScheduled) {
          await supabaseAdmin.from('bookings').update({ status: 'pending' }).eq('id', activeExisting.id);
          initialStatus = 'active';
        } else {
          initialStatus = 'pending';
        }
      }
    }

    const newBooking: any = {
      id: bookingId,
      pc_id,
      paket_id,
      player_name: finalPlayerName,
      status: initialStatus,
      created_at: new Date().toISOString(),
      ss_bukti: ss_bukti || null,
      member_id: member_id || null,
      booking_type: isScheduled ? 'slot' : 'queue',
      scheduled_at: resolvedScheduledAt,
      start_time: resolvedScheduledAt
    };

    const { error: insertError } = await supabaseAdmin.from('bookings').insert(newBooking);
    if (insertError) {
      console.error('Insert booking error:', insertError);
      return NextResponse.json({ error: insertError.message || 'Gagal menyimpan data booking' }, { status: 500 });
    }

    const scheduleLabel = resolvedStartTime ? ` [Jadwal Jam: ${resolvedStartTime} WIB]` : '';
    if (is_admin_manual) {
      await logActivity(req, {
        action: 'Input Booking Kasir',
        target: pc_id,
        details: `Pemain: ${finalPlayerName} dimasukkan manual oleh kasir${scheduleLabel}`
      });
    } else {
      await logActivity(null, {
        action: isScheduled ? 'Booking Terjadwal Masuk' : 'Booking Online Masuk',
        target: pc_id,
        details: `Pemain: ${finalPlayerName} booking lewat web publik${scheduleLabel}`,
        actor: 'Pelanggan Online',
        role: 'publik'
      });
    }

    return NextResponse.json(newBooking);
  } catch (error: any) {
    console.error('Create booking catch error:', error);
    return NextResponse.json({ error: error?.message || 'Gagal memproses booking' }, { status: 500 });
  }
}
