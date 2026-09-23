import { NextResponse } from 'next/server';
import { verifyOwnerPasskey, createOwnerPasskeyToken, isOwnerAuthorized, isAdminRequest } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ authenticated: false, authorized: false }, { status: 401 });
  }

  const authorized = isOwnerAuthorized(req);
  return NextResponse.json({ authenticated: true, authorized });
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Sesi kasir tidak valid' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { passkey } = body;

    if (!passkey || typeof passkey !== 'string') {
      return NextResponse.json({ error: 'Master Passkey wajib diisi' }, { status: 400 });
    }

    const isValid = verifyOwnerPasskey(passkey);
    if (!isValid) {
      await logActivity(req, {
        action: 'Gagal Buka Brankas Akun',
        target: 'Kelola Akun Staf',
        details: 'Percobaan Master Passkey tidak cocok'
      });
      return NextResponse.json({ error: 'Master Passkey salah. Akses ditolak.' }, { status: 403 });
    }

    // Buat token passkey berlaku 1 jam (3600 detik)
    const token = createOwnerPasskeyToken(3600);

    await logActivity(req, {
      action: 'Buka Brankas Akun',
      target: 'Kelola Akun Staf',
      details: 'Otorisasi Master Passkey Pemilik berhasil'
    });

    const res = NextResponse.json({ success: true, message: 'Otorisasi Pemilik berhasil' });

    res.cookies.set('owner_passkey_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memverifikasi passkey' }, { status: 500 });
  }
}
