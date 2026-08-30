import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id, pc_id, paket_id, player_name, status, created_at, ss_bukti')
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
      await supabaseAdmin.from('bookings').update({ status: 'active' }).eq('id', id);
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

      // Clean up custom paket
      if (paket?.is_custom) {
        await supabaseAdmin.from('pakets').delete().eq('id', booking.paket_id);
      }

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

    } else if (action === 'complete') {
      // Delete booking
      await supabaseAdmin.from('bookings').delete().eq('id', id);

      // Clear PC expected_empty_time and set status to available
      await supabaseAdmin.from('pcs').update({
        expected_empty_time: null,
        status: 'available'
      }).eq('id', booking.pc_id);

      // Clean up custom paket
      if (paket?.is_custom) {
        await supabaseAdmin.from('pakets').delete().eq('id', booking.paket_id);
      }

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

    } else if (action === 'edit_paket' && customName && customPrice !== undefined) {
      if (paket?.is_custom) {
        await supabaseAdmin.from('pakets').delete().eq('id', booking.paket_id);
      }

      const customPaketId = `paket-custom-${crypto.randomUUID()}`;
      await supabaseAdmin.from('pakets').insert({
        id: customPaketId,
        name: customName,
        price: Number(customPrice),
        is_custom: true
      });

      await supabaseAdmin.from('bookings').update({ paket_id: customPaketId }).eq('id', id);
    } else if (action === 'edit_booking') {
      const { pc_id, player_name, paket_id } = body;
      const updates: any = {};
      if (pc_id) updates.pc_id = pc_id;
      if (player_name) updates.player_name = player_name;
      if (paket_id) {
        if (paket?.is_custom && paket_id !== booking.paket_id) {
          await supabaseAdmin.from('pakets').delete().eq('id', booking.paket_id);
        }
        updates.paket_id = paket_id;
      }
      await supabaseAdmin.from('bookings').update(updates).eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
