import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export interface StaffAccount {
  id: string;
  username: string;
  password?: string;
  role: 'owner' | 'admin' | 'operator';
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
      .from('inventory')
      .select('*')
      .eq('category', 'staff_account');

    if (error) throw error;

    const accounts: StaffAccount[] = (rows || []).map(r => {
      try {
        const parsed = JSON.parse(r.name);
        return {
          id: r.id,
          username: parsed.username || '',
          role: parsed.role || 'operator',
          fullName: parsed.fullName || parsed.username,
          createdAt: parsed.createdAt || new Date().toISOString(),
          active: r.stock !== 0
        };
      } catch {
        return {
          id: r.id,
          username: r.name,
          role: 'operator',
          fullName: r.name,
          createdAt: new Date().toISOString(),
          active: r.stock !== 0
        };
      }
    });

    // Ensure default master owner account is present in list if empty
    if (!accounts.some(a => a.username.toLowerCase() === 'gcnet')) {
      accounts.unshift({
        id: 'acc-owner-gcnet',
        username: 'gcnet',
        role: 'owner',
        fullName: 'GC Net Master Owner',
        createdAt: new Date().toISOString(),
        active: true
      });
    }

    return NextResponse.json(accounts);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
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

    // Check if username already exists
    const { data: existing } = await supabaseAdmin
      .from('inventory')
      .select('*')
      .eq('category', 'staff_account');

    const isDuplicate = (existing || []).some(r => {
      try {
        const p = JSON.parse(r.name);
        return p.username?.toLowerCase() === cleanUser;
      } catch {
        return false;
      }
    });

    if (isDuplicate || cleanUser === 'gcnet') {
      return NextResponse.json({ error: 'Username sudah digunakan!' }, { status: 409 });
    }

    const newAccId = `acc-${crypto.randomUUID()}`;
    const accountPayload = {
      username: cleanUser,
      password: cleanPass,
      role: role || 'operator',
      fullName: fullName?.trim() || cleanUser,
      createdAt: new Date().toISOString()
    };

    const { error: insertError } = await supabaseAdmin.from('inventory').insert({
      id: newAccId,
      name: JSON.stringify(accountPayload),
      price: 0,
      stock: 1, // 1 = active, 0 = disabled
      category: 'staff_account'
    });

    if (insertError) throw insertError;

    return NextResponse.json({
      id: newAccId,
      username: cleanUser,
      role: accountPayload.role,
      fullName: accountPayload.fullName,
      createdAt: accountPayload.createdAt,
      active: true
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, password, role, fullName, active } = await req.json();
    if (!id) return NextResponse.json({ error: 'Account ID required' }, { status: 400 });

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('inventory')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    let parsed: any = {};
    try { parsed = JSON.parse(row.name); } catch {}

    if (password && password.trim()) {
      parsed.password = password.trim();
    }
    if (role) parsed.role = role;
    if (fullName) parsed.fullName = fullName.trim();

    const stockVal = active === false ? 0 : 1;

    const { error: updateErr } = await supabaseAdmin
      .from('inventory')
      .update({
        name: JSON.stringify(parsed),
        stock: stockVal
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
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
      return NextResponse.json({ error: 'Akun Master Owner tidak dapat dihapus!' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from('inventory').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
