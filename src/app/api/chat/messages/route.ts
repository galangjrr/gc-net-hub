import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const senderId = searchParams.get('sender_id');

    let query = supabaseAdmin
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);

    if (senderId) {
      query = query.or(`sender_id.eq.${senderId},sender_role.eq.operator`);
    }

    const { data, error } = await query;

    if (error) {
      // If table does not exist in schema cache yet, return graceful empty list
      if (error.code === 'PGRST205') {
        return NextResponse.json({ success: true, data: [], note: 'Table pending migration' });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sender_id, sender_name, sender_role = 'member', message } = body;

    // Fail-fast guard clauses
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    if (!sender_id || !sender_name) {
      return NextResponse.json({ success: false, error: 'Identitas pengirim diperlukan' }, { status: 400 });
    }

    const sanitizedMessage = message.trim().slice(0, 1000);

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert([
        {
          sender_id,
          sender_name,
          sender_role,
          message: sanitizedMessage,
          is_read: false
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205') {
        // Optimistic mock echo if table pending migration
        return NextResponse.json({
          success: true,
          data: {
            id: `temp-${Date.now()}`,
            sender_id,
            sender_name,
            sender_role,
            message: sanitizedMessage,
            created_at: new Date().toISOString(),
            is_read: false
          },
          note: 'Table pending migration'
        });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
