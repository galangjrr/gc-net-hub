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
    if (data.is_custom) {
      const { data: existing } = await supabaseAdmin
        .from('pakets')
        .select('*')
        .eq('is_custom', true)
        .eq('price', Number(data.price))
        .limit(1)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(existing);
      }
    }

    const newPaket = {
      id: data.id || `paket-${Date.now()}`,
      name: data.name.trim(),
      price: Number(data.price),
      duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : null,
      fixed_start_time: data.fixed_start_time || null,
      fixed_end_time: data.fixed_end_time || null,
      days: Array.isArray(data.days) && data.days.length > 0 ? data.days : null,
      is_custom: Boolean(data.is_custom),
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
    if (!data.id) return NextResponse.json({ error: 'ID Paket wajib diisi' }, { status: 400 });

    const updatePayload: Record<string, any> = {
      name: data.name?.trim(),
      price: Number(data.price),
    };

    if (data.duration_minutes !== undefined) {
      updatePayload.duration_minutes = data.duration_minutes ? Number(data.duration_minutes) : null;
    }
    if (data.fixed_start_time !== undefined) {
      updatePayload.fixed_start_time = data.fixed_start_time || null;
    }
    if (data.fixed_end_time !== undefined) {
      updatePayload.fixed_end_time = data.fixed_end_time || null;
    }
    if (data.days !== undefined) {
      updatePayload.days = Array.isArray(data.days) && data.days.length > 0 ? data.days : null;
    }

    const { error } = await supabaseAdmin
      .from('pakets')
      .update(updatePayload)
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
