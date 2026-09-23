import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity-log';

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data = await req.json();
    const newItem = {
      id: `inv-${crypto.randomUUID()}`,
      name: data.name,
      price: Number(data.price),
      stock: Number(data.stock),
      category: data.category || 'food',
    };
    const { error } = await supabaseAdmin.from('inventory').insert(newItem);
    if (error) throw error;

    await logActivity(req, {
      action: 'Tambah Stok Etalase',
      target: newItem.name,
      details: `Stok: ${newItem.stock} | Harga: Rp ${newItem.price.toLocaleString('id-ID')}`
    });

    return NextResponse.json(newItem);
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
      .from('inventory')
      .update({
        name: data.name,
        price: Number(data.price),
        stock: Number(data.stock),
        category: data.category
      })
      .eq('id', data.id);

    if (error) throw error;

    await logActivity(req, {
      action: 'Ubah Stok Etalase',
      target: data.name || data.id,
      details: `Stok baru: ${data.stock} | Harga: Rp ${Number(data.price).toLocaleString('id-ID')}`
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update inventory error:', error);
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await req.json();
    const { error } = await supabaseAdmin.from('inventory').delete().eq('id', id);
    if (error) throw error;

    await logActivity(req, {
      action: 'Hapus Item Etalase',
      target: id,
      details: 'Item F&B dihapus dari etalase kasir'
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete inventory error:', error);
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}
