import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity-log';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id, pc_id, paket_id, player_name, status, created_at, ss_bukti, booking_type, scheduled_at, start_time')
      .eq('id', id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// Helper to safely clean up custom package only if no other bookings reference it
async function cleanupCustomPaket(paketId: string, excludeBookingId?: string) {
  if (!paketId) return;
  const { data: pkt } = await supabaseAdmin.from('pakets').select('is_custom').eq('id', paketId).single();
  if (!pkt?.is_custom) return;

  let query = supabaseAdmin.from('bookings').select('id').eq('paket_id', paketId);
  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }
  const { data: activeRefs } = await query;
  if (!activeRefs || activeRefs.length === 0) {
    await supabaseAdmin.from('pakets').delete().eq('id', paketId);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, reason, customName, customPrice } = body;
    
    // Fetch target booking
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('id', id).single();
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fetch related paket & pc
    const { data: paket } = await supabaseAdmin.from('pakets').select('*').eq('id', booking.paket_id).single();
    const { data: pc } = await supabaseAdmin.from('pcs').select('*').eq('id', booking.pc_id).single();

    if (action === 'approve') {
      const isTargetScheduled = booking.booking_type === 'slot' || booking.booking_type === 'scheduled' || Boolean(booking.scheduled_at || booking.start_time);

      const { data: existingActive } = await supabaseAdmin
        .from('bookings')
        .select('id, booking_type, scheduled_at, start_time')
        .eq('pc_id', booking.pc_id)
        .eq('status', 'active')
        .neq('id', id)
        .maybeSingle();

      if (existingActive) {
        const isExistingScheduled = existingActive.booking_type === 'slot' || existingActive.booking_type === 'scheduled' || Boolean(existingActive.scheduled_at || existingActive.start_time);

        if (!isTargetScheduled && isExistingScheduled) {
          await supabaseAdmin.from('bookings').update({ status: 'pending' }).eq('id', existingActive.id);
          const { error: updateErr } = await supabaseAdmin.from('bookings').update({ status: 'active' }).eq('id', id);
          if (updateErr) {
            console.error('Approve update error:', updateErr);
            return NextResponse.json({ error: updateErr.message }, { status: 500 });
          }
        }
      } else {
        const { error: updateErr } = await supabaseAdmin.from('bookings').update({ status: 'active' }).eq('id', id);
        if (updateErr) {
          console.error('Approve update error:', updateErr);
          return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }
      }

      await logActivity(req, {
        action: 'Konfirmasi Booking',
        target: pc?.name || booking.pc_id,
        details: `Pemain: ${booking.player_name} | Paket: ${paket?.name || 'Paket'}`
      });
    } else if (action === 'reject') {
      // Delete booking
      await supabaseAdmin.from('bookings').delete().eq('id', id);

      // Check if there are other bookings for this PC, if not clear timer
      const { data: remainingBookings } = await supabaseAdmin.from('bookings').select('id').eq('pc_id', booking.pc_id);
      if (!remainingBookings || remainingBookings.length === 0) {
        await supabaseAdmin.from('pcs').update({
          expected_empty_time: null,
          status: 'available'
        }).eq('id', booking.pc_id);
      }

      // Clean up custom paket safely
      await cleanupCustomPaket(booking.paket_id, id);

      let resolvedPrice = paket?.price || 0;
      let resolvedName = paket?.name || 'Paket Booking';
      if (!resolvedPrice && booking.paket_id?.startsWith('custom-')) {
        resolvedPrice = parseInt(booking.paket_id.replace('custom-', '')) || 0;
        resolvedName = `Paket Custom Rp ${resolvedPrice.toLocaleString('id-ID')}`;
      }

      // Add to logs
      const log = {
        id: `log-batal-${crypto.randomUUID()}`,
        player_name: booking.player_name,
        pc_name: pc?.name || booking.pc_id,
        paket_name: resolvedName,
        price: resolvedPrice,
        start_time: booking.created_at,
        end_time: new Date().toISOString(),
        status: 'Batal'
      };
      await supabaseAdmin.from('logs').insert(log);

      await logActivity(req, {
        action: 'Batalkan Booking',
        target: pc?.name || booking.pc_id,
        details: `Pemain: ${booking.player_name} | Alasan: ${reason || 'Dibatalkan Kasir'}`
      });

    } else if (action === 'complete') {
      // Delete booking
      await supabaseAdmin.from('bookings').delete().eq('id', id);

      // Clear PC expected_empty_time and set status to available
      await supabaseAdmin.from('pcs').update({
        expected_empty_time: null,
        status: 'available'
      }).eq('id', booking.pc_id);

      // Clean up custom paket safely
      await cleanupCustomPaket(booking.paket_id, id);

      let resolvedPrice = paket?.price || 0;
      let resolvedName = paket?.name || 'Paket Booking';
      if (!resolvedPrice && booking.paket_id?.startsWith('custom-')) {
        resolvedPrice = parseInt(booking.paket_id.replace('custom-', '')) || 0;
        resolvedName = `Paket Custom Rp ${resolvedPrice.toLocaleString('id-ID')}`;
      }

      // Add to logs
      const log = {
        id: `log-selesai-${crypto.randomUUID()}`,
        player_name: booking.player_name,
        pc_name: pc?.name || booking.pc_id,
        paket_name: resolvedName,
        price: resolvedPrice,
        start_time: booking.created_at,
        end_time: new Date().toISOString(),
        status: 'Selesai'
      };
      await supabaseAdmin.from('logs').insert(log);

      await logActivity(req, {
        action: 'Tandai Masuk',
        target: pc?.name || booking.pc_id,
        details: `Pemain: ${booking.player_name} masuk ke unit PC | Paket: ${resolvedName}`
      });

    } else if (action === 'edit_paket' && customName && customPrice !== undefined) {
      await cleanupCustomPaket(booking.paket_id, id);

      const customPaketId = `paket-custom-${crypto.randomUUID()}`;
      await supabaseAdmin.from('pakets').insert({
        id: customPaketId,
        name: customName,
        price: Number(customPrice),
        is_custom: true
      });

      await supabaseAdmin.from('bookings').update({ paket_id: customPaketId }).eq('id', id);

      await logActivity(req, {
        action: 'Ubah Paket Booking',
        target: pc?.name || booking.pc_id,
        details: `Pemain: ${booking.player_name} | Paket Baru: ${customName} (Rp ${Number(customPrice).toLocaleString('id-ID')})`
      });
    } else if (action === 'edit_booking') {
      const { pc_id, player_name, paket_id, booking_type, scheduled_at, start_time } = body;
      const updates: any = {};
      if (pc_id) updates.pc_id = pc_id;
      if (player_name) updates.player_name = player_name;
      
      const isSlot = booking_type === 'slot' || booking_type === 'scheduled';

      // Convert time string to valid ISO timestamptz
      let validIso: string | null = null;
      if (scheduled_at) {
        validIso = scheduled_at;
      } else if (start_time && typeof start_time === 'string') {
        if (start_time.includes('T')) {
          validIso = start_time;
        } else if (start_time.includes(':')) {
          try {
            const [hh, mm] = start_time.split(':').map(Number);
            const d = new Date();
            d.setHours(hh || 0, mm || 0, 0, 0);
            validIso = d.toISOString();
          } catch (_) {}
        }
      }

      if (isSlot) {
        updates.booking_type = 'slot';
        updates.scheduled_at = validIso;
        updates.start_time = validIso;
      } else if (booking_type === 'queue') {
        updates.booking_type = 'queue';
        updates.scheduled_at = null;
        updates.start_time = null;
      } else {
        if (scheduled_at !== undefined) updates.scheduled_at = validIso;
        if (start_time !== undefined) updates.start_time = validIso;
      }

      if (paket_id) {
        if (paket_id !== booking.paket_id) {
          await cleanupCustomPaket(booking.paket_id, id);
        }
        updates.paket_id = paket_id;

        // Auto update booking_type jika paket baru punya fixed_start_time
        const { data: newPkt } = await supabaseAdmin.from('pakets').select('fixed_start_time').eq('id', paket_id).single();
        if (newPkt?.fixed_start_time && !booking_type) {
          updates.booking_type = 'slot';
          try {
            const [hh, mm] = newPkt.fixed_start_time.split(':').map(Number);
            const schedDate = new Date();
            schedDate.setHours(hh || 0, mm || 0, 0, 0);
            updates.scheduled_at = schedDate.toISOString();
            updates.start_time = schedDate.toISOString();
          } catch (_) {}
        }
      }

      const { error: updateErr } = await supabaseAdmin.from('bookings').update(updates).eq('id', id);
      if (updateErr) {
        console.error('Update booking error:', updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }

      await logActivity(req, {
        action: 'Ubah Data Booking',
        target: pc?.name || booking.pc_id,
        details: `Pemain: ${player_name || booking.player_name}`
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const { data: booking } = await supabaseAdmin.from('bookings').select('*').eq('id', id).single();
    if (booking) {
      await cleanupCustomPaket(booking.paket_id, id);
      await supabaseAdmin.from('bookings').delete().eq('id', id);

      const { data: rem } = await supabaseAdmin.from('bookings').select('id').eq('pc_id', booking.pc_id);
      if (!rem || rem.length === 0) {
        await supabaseAdmin.from('pcs').update({ expected_empty_time: null, status: 'available' }).eq('id', booking.pc_id);
      }

      await logActivity(req, {
        action: 'Hapus Antrean',
        target: booking.pc_id,
        details: `Pemain: ${booking.player_name} dihapus dari antrean`
      });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete booking error:', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
