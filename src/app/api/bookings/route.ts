import { NextResponse } from 'next/server';
import { isAdminRequest, getMemberUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity-log';
import { customPaketFor, CUSTOM_MIN_PRICE, CUSTOM_MAX_PRICE } from '@/lib/paket';
import { deletableUnpaidBeforeIso } from '@/lib/booking-rules';
import { normalizeEmail } from '@/lib/invoice';

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
    const { pc_id, player_name, is_admin_manual, booking_type, scheduled_at, start_time, custom_price } = body;
    let paket_id = body.paket_id;

    // 2. Guard: Admin Manual Auth Enforcement
    if (is_admin_manual && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Sesi admin tidak valid.' }, { status: 401 });
    }

    // 3. Input Validation & Sanitization
    if (!pc_id || typeof pc_id !== 'string' || pc_id.length > 30) {
      return NextResponse.json({ error: 'PC ID tidak valid atau terlalu panjang.' }, { status: 400 });
    }

    // Kasir input means the player already paid at the desk. Public bookings start unpaid either way.
    const paymentMethod = is_admin_manual ? 'kasir' : body.payment_method;
    if (paymentMethod !== 'online' && paymentMethod !== 'kasir') {
      return NextResponse.json({ error: 'Pilih metode bayar: online atau di kasir.' }, { status: 400 });
    }

    // Member identity comes from the login token, never from the body.
    const member = is_admin_manual ? null : await getMemberUser(req);
    const memberId = is_admin_manual ? (typeof body.member_id === 'string' ? body.member_id : null) : member?.id ?? null;

    const rawEmail = typeof body.customer_email === 'string' && body.customer_email.trim() ? body.customer_email : member?.email;
    const customerEmail = rawEmail ? normalizeEmail(rawEmail) : null;
    if (rawEmail && !customerEmail) {
      return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
    }

    // Custom paket: only the price comes from the browser; name and duration are derived server-side.
    const custom = custom_price != null ? customPaketFor(custom_price) : null;
    if (custom_price != null && !custom) {
      return NextResponse.json({ error: `Nominal paket custom harus kelipatan Rp1.000, antara Rp${CUSTOM_MIN_PRICE.toLocaleString('id-ID')} dan Rp${CUSTOM_MAX_PRICE.toLocaleString('id-ID')}.` }, { status: 400 });
    }

    const { data: pc } = await supabaseAdmin.from('pcs').select('id').eq('id', pc_id).maybeSingle();
    if (!pc) return NextResponse.json({ error: 'PC tidak ditemukan' }, { status: 404 });

    if (custom) {
      const { data: existingCustom } = await supabaseAdmin
        .from('pakets')
        .select('id')
        .eq('is_custom', true)
        .eq('price', custom.price)
        .eq('name', custom.name)
        .eq('duration_minutes', custom.duration_minutes)
        .limit(1)
        .maybeSingle();
      if (existingCustom) {
        paket_id = existingCustom.id;
      } else {
        paket_id = `paket-${Date.now()}`;
        const { error: paketErr } = await supabaseAdmin.from('pakets').insert({ id: paket_id, ...custom, is_custom: true });
        if (paketErr) {
          console.error('Create custom paket error:', paketErr);
          return NextResponse.json({ error: 'Gagal memproses paket custom.' }, { status: 500 });
        }
      }
    }

    if (!paket_id || typeof paket_id !== 'string' || paket_id.length > 50) {
      return NextResponse.json({ error: 'Paket ID tidak valid.' }, { status: 400 });
    }

    // 5. Paket Exist Check
    const { data: paket } = await supabaseAdmin.from('pakets').select('id, name, fixed_start_time, fixed_end_time, is_custom').eq('id', paket_id).maybeSingle();
    if (!paket) return NextResponse.json({ error: 'Paket tidak ditemukan' }, { status: 404 });
    // An existing custom paket id may hold a forged price or duration from before this check existed.
    if (paket.is_custom && !custom && !isAdmin) {
      return NextResponse.json({ error: 'Paket custom wajib dipilih lewat nominal.' }, { status: 400 });
    }
    
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

    // Drop unpaid bookings past their payment window. Lazy cleanup instead of a cron: they are
    // already hidden from every read, this only frees their GC ids.
    const cutoff = deletableUnpaidBeforeIso();
    await supabaseAdmin.from('bookings').delete().eq('payment_status', 'unpaid').neq('status', 'active').eq('payment_method', 'online').lt('created_at', cutoff.online);
    await supabaseAdmin.from('bookings').delete().eq('payment_status', 'unpaid').neq('status', 'active').eq('payment_method', 'kasir').lt('created_at', cutoff.kasir);

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

    const createdAt = new Date().toISOString();
    const newBooking: any = {
      id: bookingId,
      pc_id,
      paket_id,
      player_name: finalPlayerName,
      status: initialStatus,
      created_at: createdAt,
      member_id: memberId,
      payment_method: paymentMethod,
      payment_status: is_admin_manual ? 'paid' : 'unpaid',
      paid_at: is_admin_manual ? createdAt : null,
      customer_email: customerEmail,
      booking_type: isScheduled ? 'slot' : 'queue',
      scheduled_at: resolvedScheduledAt,
      start_time: resolvedScheduledAt
    };

    const { error: insertError } = await supabaseAdmin.from('bookings').insert(newBooking);
    if (insertError) {
      console.error('Insert booking error:', insertError);
      return NextResponse.json({ error: 'Booking gagal disimpan. Coba lagi sebentar.' }, { status: 500 });
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
