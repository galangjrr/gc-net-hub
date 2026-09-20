import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { cart, total, target_pc, buyer_name } = await req.json();
    
    // Check stock first
    for (const item of cart) {
      const { data: inv } = await supabaseAdmin.from('inventory').select('*').eq('id', item.product.id).single();
      if (!inv || inv.stock < item.qty) {
        return NextResponse.json({ error: `Stok ${item.product.name} tidak mencukupi, tersisa ${inv?.stock || 0}` }, { status: 400 });
      }
    }

    // Deduct stock
    for (const item of cart) {
      const { data: inv } = await supabaseAdmin.from('inventory').select('stock').eq('id', item.product.id).single();
      if (inv) {
        await supabaseAdmin.from('inventory').update({ stock: inv.stock - item.qty }).eq('id', item.product.id);
      }
    }

    // Prepare logs
    const pcTarget = (target_pc && target_pc !== 'KASIR') ? target_pc.toUpperCase() : 'KASIR';
    const playerTarget = buyer_name || (pcTarget !== 'KASIR' ? `Pemain ${pcTarget}` : 'Tamu Kasir');

    const logEntries = cart.map((item: any) => ({
      id: `log-kasir-${crypto.randomUUID()}`,
      player_name: playerTarget,
      pc_name: pcTarget,
      paket_name: `${item.product.name} x${item.qty}`,
      price: item.product.price * item.qty,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      status: 'Selesai'
    }));

    await supabaseAdmin.from('logs').insert(logEntries);

    return NextResponse.json({ success: true, total });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 });
  }
}
