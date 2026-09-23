import { NextResponse } from 'next/server';
import { isAdminRequest, hashStaffPassword } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity-log';

export interface StaffAccount {
  id: string;
  username: string;
  password?: string;
  role: 'super_admin' | 'owner' | 'admin' | 'operator';
  fullName: string;
  createdAt: string;
  active: boolean;
}

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: rows, error } = await supabaseAdmin
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const accounts: StaffAccount[] = (rows || []).map(r => ({
      id: r.id,
      username: r.username,
      role: r.role || 'operator',
      fullName: r.full_name || r.username,
      createdAt: r.created_at || new Date().toISOString(),
      active: r.is_active !== false,
    }));

    // Ensure default master owner account is present in list
    if (!accounts.some(a => a.username.toLowerCase() === 'gcnet')) {
      accounts.unshift({
        id: 'acc-owner-gcnet',
        username: 'gcnet',
        role: 'super_admin',
        fullName: 'GC Net Super Admin',
        createdAt: new Date().toISOString(),
        active: true,
      });
    }

    return NextResponse.json(accounts);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { username, password, role, fullName } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan Password wajib diisi!' }, { status: 400 });
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUser)) {
      return NextResponse.json({ error: 'Username hanya boleh huruf, angka, dan garis bawah 3-20 karakter!' }, { status: 400 });
    }

    if (cleanPass.length < 4) {
      return NextResponse.json({ error: 'Password minimal 4 karakter!' }, { status: 400 });
    }

    // Check if username already exists in staff
    const { data: existing } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('username', cleanUser)
      .maybeSingle();

    if (existing || cleanUser === 'gcnet') {
      return NextResponse.json({ error: 'Username sudah digunakan!' }, { status: 409 });
    }

    const hashedPassword = hashStaffPassword(cleanPass);
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('staff')
      .insert({
        username: cleanUser,
        password_hash: hashedPassword,
        full_name: fullName?.trim() || cleanUser,
        role: role || 'operator',
        is_active: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await logActivity(req, {
      action: 'Tambah Akun Staf',
      target: inserted.username,
      details: `Role: ${inserted.role} | Nama: ${inserted.full_name}`
    });

    return NextResponse.json({
      id: inserted.id,
      username: inserted.username,
      role: inserted.role,
      fullName: inserted.full_name,
      createdAt: inserted.created_at,
      active: inserted.is_active,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create account' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, password, role, fullName, active } = await req.json();
    if (!id) return NextResponse.json({ error: 'Account ID required' }, { status: 400 });

    if (id === 'acc-owner-gcnet') {
      return NextResponse.json({ error: 'Akun Master Super Admin diatur via sistem terisolasi!' }, { status: 403 });
    }

    // Check if target is gcnet master account
    const { data: targetAccount } = await supabaseAdmin
      .from('staff')
      .select('username, role')
      .eq('id', id)
      .maybeSingle();

    const isGcnet = targetAccount?.username?.toLowerCase() === 'gcnet';

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (fullName) updatePayload.full_name = fullName.trim();
    if (role && !isGcnet) updatePayload.role = role;
    if (typeof active === 'boolean' && !isGcnet) updatePayload.is_active = active;
    if (password && password.trim()) {
      updatePayload.password_hash = hashStaffPassword(password.trim());
    }

    const { error: updateErr } = await supabaseAdmin
      .from('staff')
      .update(updatePayload)
      .eq('id', id);

    if (updateErr) throw updateErr;

    await logActivity(req, {
      action: 'Ubah Akun Staf',
      target: targetAccount?.username || id,
      details: `Role: ${role || targetAccount?.role} | Status: ${active !== false ? 'Aktif' : 'Nonaktif'}`
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Account ID required' }, { status: 400 });

    if (id === 'acc-owner-gcnet') {
      return NextResponse.json({ error: 'Akun Super Admin master tidak dapat dihapus!' }, { status: 403 });
    }

    const { data: targetAccount } = await supabaseAdmin
      .from('staff')
      .select('username, role')
      .eq('id', id)
      .maybeSingle();

    if (targetAccount?.username?.toLowerCase() === 'gcnet' || targetAccount?.role === 'super_admin') {
      return NextResponse.json({ error: 'Akun Super Admin master tidak dapat dihapus!' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from('staff').delete().eq('id', id);
    if (error) throw error;

    await logActivity(req, {
      action: 'Hapus Akun Staf',
      target: targetAccount?.username || id,
      details: `Akun staf (${targetAccount?.role || 'operator'}) dihapus`
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete account' }, { status: 500 });
  }
}
