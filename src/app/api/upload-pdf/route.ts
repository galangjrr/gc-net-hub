import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be PDF' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    
    const text = data.text;
    
    let parsedTotal = 0;
    
    const lines = text.split('\n');
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('total') || lower.includes('grand total')) {
        const match = line.match(/(?:rp\.?|idr)?\s*([\d,.]+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1].replace(/[.,]/g, ''), 10);
          if (!isNaN(num) && num > parsedTotal) {
            parsedTotal = num;
          }
        }
      }
    }

    const targetDate = (formData.get('date') as string) || new Date().toISOString().slice(0, 10);
    const todayDateStr = new Date().toISOString().slice(0, 10);

    if (parsedTotal > 0) {
      if (targetDate === todayDateStr) {
        const { data: settings } = await supabaseAdmin.from('settings').select('id').limit(1).single();
        if (settings) {
          await supabaseAdmin.from('settings').update({ daily_pdf_revenue: parsedTotal }).eq('id', settings.id);
        }
      }

      // Upsert into logs for that specific date
      const startDateStr = `${targetDate}T00:00:00.000Z`;
      const endDateStr = `${targetDate}T23:59:59.000Z`;

      const { data: existingLog } = await supabaseAdmin
        .from('logs')
        .select('id')
        .eq('pc_name', 'BILLING_SERVER')
        .gte('end_time', startDateStr)
        .lte('end_time', endDateStr)
        .maybeSingle();

      if (existingLog) {
        await supabaseAdmin
          .from('logs')
          .update({
            price: parsedTotal,
            paket_name: `Laporan Billing PDF ${targetDate}`,
            end_time: endDateStr
          })
          .eq('id', existingLog.id);
      } else {
        await supabaseAdmin
          .from('logs')
          .insert({
            id: `pdf-${targetDate}-${Date.now()}`,
            player_name: 'Server Billing',
            pc_name: 'BILLING_SERVER',
            paket_name: `Laporan Billing PDF ${targetDate}`,
            price: parsedTotal,
            start_time: startDateStr,
            end_time: endDateStr,
            status: 'Selesai'
          });
      }
    }

    return NextResponse.json({ 
      success: true, 
      date: targetDate,
      text: text.slice(0, 1000),
      total: parsedTotal 
    });
  } catch (error) {
    console.error('PDF Parse Error:', error);
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 });
  }
}
