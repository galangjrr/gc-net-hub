import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workstation_id, command, payload } = body;

    if (!workstation_id || !command) {
      return NextResponse.json({ error: 'Missing workstation_id or command' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('remote_commands').insert({
      id: `cmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workstation_id,
      command,
      payload: payload || {},
      status: 'pending',
      created_at: new Date().toISOString()
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal Error' }, { status: 500 });
  }
}
