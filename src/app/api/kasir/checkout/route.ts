import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { cart, total } = await req.json();
    
    // Check stock first
    for (const item of cart) {
      const { data: inv } = await supabase.from('inventory').select('*').eq('id', item.product.id).single();
      if (!inv || inv.stock < item.qty) {
        return NextResponse.json({ error: `Stok ${item.product.name} tidak cukup (sisa: ${inv?.stock || 0})` }, { status: 400 });
      }
    }

    // Deduct stock
    for (const item of cart) {
      const { data: inv } = await supabase.from('inventory').select('stock').eq('id', item.product.id).single();
      if (inv) {
        await supabase.from('inventory').update({ stock: inv.stock - item.qty }).eq('id', item.product.id);
      }
    }

    // Prepare logs
    const logEntries = cart.map((item: any) => ({
      id: `log-kasir-${crypto.randomUUID()}`,
      player_name: 'Walk-in',
      pc_name: 'KASIR',
      paket_name: `${item.product.name} (x${item.qty})`,
      price: item.product.price * item.qty,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      status: 'Selesai'
    }));

    await supabase.from('logs').insert(logEntries);

    return NextResponse.json({ success: true, total });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 });
  }
}
