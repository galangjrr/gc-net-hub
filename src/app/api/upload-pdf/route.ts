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

    if (parsedTotal > 0) {
      const { data: settings } = await supabaseAdmin.from('settings').select('id').limit(1).single();
      if (settings) {
        await supabaseAdmin.from('settings').update({ daily_pdf_revenue: parsedTotal }).eq('id', settings.id);
      }
    }

    return NextResponse.json({ 
      success: true, 
      text: text.slice(0, 1000),
      total: parsedTotal 
    });
  } catch (error) {
    console.error('PDF Parse Error:', error);
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 });
  }
}
