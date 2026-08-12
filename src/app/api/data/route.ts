import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const db = await getDB();
    const isAdmin = isAdminRequest(req);
    
    // Create a safe copy of the database to send
    const safeDb = JSON.parse(JSON.stringify(db));
    if (!isAdmin && safeDb.bookings) {
      safeDb.bookings.forEach((b: any) => {
        delete b.ss_bukti;
      });
    }

    return NextResponse.json(safeDb, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read database' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ message: 'Full DB overwrite deprecated. Use specific entity API endpoints.' });
}
