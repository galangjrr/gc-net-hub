import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '100')));
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const date = searchParams.get('date')?.trim() || '';
    const operator = searchParams.get('operator')?.trim() || '';

    let query = supabaseAdmin
      .from('logs')
      .select('id, player_name, pc_name, paket_name, start_time, reason, status')
      .eq('status', 'Aktivitas')
      .order('start_time', { ascending: false })
      .limit(limit);

    if (operator && operator !== 'all') {
      query = query.eq('player_name', operator);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    let todayCount = 0;
    const operatorCounts: Record<string, number> = {};

    const activities = (rows || []).map(r => {
      const timeStr = r.start_time || new Date().toISOString();
      const rowDate = new Date(timeStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      if (rowDate === todayStr) {
        todayCount++;
      }

      operatorCounts[r.player_name] = (operatorCounts[r.player_name] || 0) + 1;

      // Ekstrak role dan detail dari reason: "[OPERATOR] detail teks"
      let role = 'staf';
      let details = r.reason || '';
      const match = details.match(/^\[(.*?)\]\s*(.*)$/);
      if (match) {
        role = match[1].toLowerCase();
        details = match[2];
      }

      return {
        id: r.id,
        operator: r.player_name,
        role,
        target: r.pc_name,
        action: r.paket_name,
        details,
        timestamp: timeStr,
        localDate: rowDate,
      };
    }).filter(act => {
      if (date && act.localDate !== date) return false;
      if (search) {
        const match =
          act.operator.toLowerCase().includes(search) ||
          act.target.toLowerCase().includes(search) ||
          act.action.toLowerCase().includes(search) ||
          act.details.toLowerCase().includes(search);
        if (!match) return false;
      }
      return true;
    });

    // Cari top operator
    let topOperator = '-';
    let maxOps = 0;
    for (const [op, count] of Object.entries(operatorCounts)) {
      if (count > maxOps && op !== 'Sistem' && op !== 'Pelanggan Online') {
        maxOps = count;
        topOperator = op;
      }
    }

    return NextResponse.json({
      activities,
      stats: {
        todayCount,
        totalCount: rows?.length || 0,
        topOperator,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memuat log aktivitas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, target, details } = body;

    if (!action) {
      return NextResponse.json({ error: 'Aksi wajib diisi' }, { status: 400 });
    }

    await logActivity(req, {
      action,
      target: target || 'SISTEM',
      details: details || '',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal menyimpan log aktivitas' }, { status: 500 });
  }
}
