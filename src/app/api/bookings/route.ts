import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { pc_id, paket_id, player_name, ss_bukti, is_admin_manual } = await req.json();
    
    // Guard: Admin auth
    if (is_admin_manual && !isAdminRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Guard: ss_bukti format validation
    if (ss_bukti && !ss_bukti.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format for ss_bukti' }, { status: 400 });
    }

    // PC exist check
    const { data: pc } = await supabaseAdmin.from('pcs').select('id').eq('id', pc_id).single();
    if (!pc) return NextResponse.json({ error: 'PC tidak ditemukan' }, { status: 404 });
    
    // Note: Antrean bertumpuk diizinkan (FIFO queue bagi pemain yang bersedia menunggu)
    
    let finalPlayerName = player_name;
    if (!finalPlayerName) {
      if (!is_admin_manual) {
        return NextResponse.json({ error: 'Nama pemain wajib diisi!' }, { status: 400 });
      }
      
      // Get settings to increment userCounter
      const { data: settings } = await supabaseAdmin.from('settings').select('*').limit(1).single();
      const currentCounter = settings?.user_counter || 1;
      finalPlayerName = `User ${currentCounter}`;

      await supabaseAdmin.from('settings').update({ user_counter: currentCounter + 1 }).eq('id', settings?.id || 1);
    }

    const newBooking = {
      id: `bkg-${crypto.randomUUID()}`,
      pc_id,
      paket_id,
      player_name: finalPlayerName,
      status: is_admin_manual ? 'active' : 'pending',
      created_at: new Date().toISOString(),
      ss_bukti
    };

    const { error: insertError } = await supabaseAdmin.from('bookings').insert(newBooking);
    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    return NextResponse.json(newBooking);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
