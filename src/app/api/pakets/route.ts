import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // Only standard catalog packages require admin authentication. Custom on-the-fly packages are permitted for bookings.
    if (!data.is_custom && !isAdminRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const newPaket = {
      id: `paket-${crypto.randomUUID()}`,
      name: data.name,
      price: Number(data.price),
      is_custom: data.is_custom || false,
    };
    const { error } = await supabaseAdmin.from('pakets').insert(newPaket);
    if (error) throw error;
    return NextResponse.json(newPaket);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data = await req.json();
    const { error } = await supabaseAdmin
      .from('pakets')
      .update({ name: data.name, price: Number(data.price) })
      .eq('id', data.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update paket error:', error);
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID Paket wajib diisi' }, { status: 400 });

    // Clean up dependent bookings first
    await supabaseAdmin.from('bookings').delete().eq('paket_id', id);

    const { error } = await supabaseAdmin.from('pakets').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete paket error:', error);
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}
