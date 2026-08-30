import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: pcs, error } = await supabaseAdmin.from('pcs').select('*').order('id', { ascending: true });
    if (error) throw error;
    return NextResponse.json(pcs);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch PCs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const cleanId = (data.id || '').trim().toLowerCase();
    if (!cleanId) return NextResponse.json({ error: 'ID PC wajib diisi' }, { status: 400 });

    const payload = {
      id: cleanId,
      name: data.name || cleanId,
      status: data.status || 'available',
      expected_empty_time: data.expected_empty_time || null,
      specs: data.specs || {},
      image: data.image || null
    };

    const { data: inserted, error } = await supabaseAdmin.from('pcs').upsert(payload).select().single();
    if (error) throw error;

    return NextResponse.json(inserted);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save PC' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const cleanId = (data.id || '').trim().toLowerCase();
    if (!cleanId) return NextResponse.json({ error: 'ID PC wajib diisi' }, { status: 400 });

    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.status !== undefined) updates.status = data.status;
    if (data.expected_empty_time !== undefined) {
      updates.expected_empty_time = data.expected_empty_time ? data.expected_empty_time : null;
      // Auto adjust status if timer is set
      if (data.expected_empty_time) {
        updates.status = 'occupied';
      }
    }
    if (data.specs !== undefined) updates.specs = data.specs;
    if (data.image !== undefined) updates.image = data.image;

    const { data: updated, error } = await supabaseAdmin
      .from('pcs')
      .update(updates)
      .eq('id', cleanId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, pc: updated });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update PC' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    const cleanId = (id || '').trim().toLowerCase();
    if (!cleanId) return NextResponse.json({ error: 'ID PC wajib diisi' }, { status: 400 });

    const { error } = await supabaseAdmin.from('pcs').delete().eq('id', cleanId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete PC' }, { status: 500 });
  }
}
