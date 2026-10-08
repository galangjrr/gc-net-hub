import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const includeLogs = url.searchParams.get("includeLogs") === "true";
    const isAdmin = isAdminRequest(req);

    const db = await getDB({ includeLogs: includeLogs && isAdmin, includeRevenue: isAdmin });

    // The edge cache does not vary by cookie: anything an admin page asks for must never be cached,
    // or an admin gets the public copy and the public could get the admin one.
    const publicCache = !isAdmin && !includeLogs;
    return NextResponse.json(db, {
      headers: {
        'Cache-Control': publicCache ? 'public, s-maxage=2, stale-while-revalidate=5' : 'private, no-store, max-age=0',
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
