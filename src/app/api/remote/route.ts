import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workstation_id, command, payload } = body;

    if (!workstation_id || !command) {
      return NextResponse.json({ error: 'Missing workstation_id or command' }, { status: 400 });
    }

    const pcId = workstation_id.toLowerCase();

    // 1. ACTION: START SESSION (Buka Billing)
    if (command === 'start_session') {
      const durMin = payload?.durationMinutes || payload?.minutes || 60;
      const emptyTime = new Date(Date.now() + durMin * 60000).toISOString();
      const paketId = payload?.paket_id || payload?.paketId || 'paket-1';
      const playerName = payload?.player_name || payload?.username || 'Pelanggan';

      // Insert active booking
      const bookingId = `book-${Date.now()}`;
      await supabaseAdmin.from('bookings').insert({
        id: bookingId,
        pc_id: pcId,
        paket_id: paketId,
        player_name: playerName,
        status: 'active',
        expected_empty_time: emptyTime,
        created_at: new Date().toISOString()
      });

      // Update PC state
      const { data, error } = await supabaseAdmin.from('pcs').update({
        status: 'occupied',
        expected_empty_time: emptyTime
      }).eq('id', pcId).select().single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    // 2. ACTION: ADD TIME (Tambah Waktu)
    if (command === 'add_time') {
      const durMin = payload?.durationMinutes || payload?.minutes || 60;
      const { data: pc } = await supabaseAdmin.from('pcs').select('*').eq('id', pcId).single();
      
      const now = Date.now();
      const currentExpiry = pc?.expected_empty_time ? new Date(pc.expected_empty_time).getTime() : now;
      const baseTime = Math.max(now, currentExpiry);
      const newEmptyTime = new Date(baseTime + durMin * 60000).toISOString();

      const { data, error } = await supabaseAdmin.from('pcs').update({
        status: 'occupied',
        expected_empty_time: newEmptyTime
      }).eq('id', pcId).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    // 3. ACTION: STOP SESSION (Hentikan Sesi)
    if (command === 'stop_session') {
      await supabaseAdmin.from('bookings').update({
        status: 'completed'
      }).eq('pc_id', pcId).eq('status', 'active');

      const { data, error } = await supabaseAdmin.from('pcs').update({
        status: 'available',
        expected_empty_time: null
      }).eq('id', pcId).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    // 4. ACTION: MOVE STATION (Pindah PC)
    if (command === 'move_station') {
      const targetId = (payload?.target_pc_id || payload?.targetPc || '').toLowerCase();
      if (!targetId) return NextResponse.json({ error: 'Missing target_pc_id' }, { status: 400 });

      const { data: srcPc } = await supabaseAdmin.from('pcs').select('*').eq('id', pcId).single();
      const expiry = srcPc?.expected_empty_time || null;

      // Clear source
      await supabaseAdmin.from('pcs').update({
        status: 'available',
        expected_empty_time: null
      }).eq('id', pcId);

      // Set target
      const { data, error } = await supabaseAdmin.from('pcs').update({
        status: 'occupied',
        expected_empty_time: expiry
      }).eq('id', targetId).select().single();

      // Update active booking target
      await supabaseAdmin.from('bookings').update({
        pc_id: targetId
      }).eq('pc_id', pcId).eq('status', 'active');

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    // 5. ACTION: LOCK / UNLOCK / REBOOT
    if (command === 'lock') {
      const { data, error } = await supabaseAdmin.from('pcs').update({ status: 'maintenance' }).eq('id', pcId).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    if (command === 'unlock') {
      const { data, error } = await supabaseAdmin.from('pcs').update({ status: 'available' }).eq('id', pcId).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal Error' }, { status: 500 });
  }
}
