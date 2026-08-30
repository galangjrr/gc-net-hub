import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const db = await getDB();
    const isAdmin = isAdminRequest(req);

    return NextResponse.json(db, {
      headers: {
        'Cache-Control': isAdmin ? 'no-store, max-age=0' : 'public, s-maxage=2, stale-while-revalidate=5',
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
