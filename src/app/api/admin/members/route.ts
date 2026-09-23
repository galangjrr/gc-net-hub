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
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const { data: members, error } = await supabaseAdmin
      .from('members')
      .select('id, email, username, full_name, phone, avatar_url, balance, gc_user_id, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const list = (members || []).filter(m => {
      if (!search) return true;
      return (
        (m.username || '').toLowerCase().includes(search) ||
        (m.full_name || '').toLowerCase().includes(search) ||
        (m.email || '').toLowerCase().includes(search) ||
        (m.phone || '').toLowerCase().includes(search) ||
        (m.gc_user_id || '').toLowerCase().includes(search)
      );
    });

    // Hitung ringkasan statistik member
    let totalDeposit = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);
    let newThisMonth = 0;

    (members || []).forEach(m => {
      totalDeposit += Number(m.balance) || 0;
      if (m.created_at && m.created_at.startsWith(currentMonth)) {
        newThisMonth++;
      }
    });

    return NextResponse.json({
      members: list,
      stats: {
        totalMembers: members?.length || 0,
        totalDeposit,
        newThisMonth,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memuat data member' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Member wajib disertakan' }, { status: 400 });
    }

    // Ambil data member saat ini
    const { data: currentMember, error: fetchErr } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !currentMember) {
      return NextResponse.json({ error: 'Member tidak ditemukan' }, { status: 404 });
    }

    if (action === 'topup') {
      const amount = Number(body.amount);
      if (isNaN(amount) || amount === 0) {
        return NextResponse.json({ error: 'Nominal top up tidak valid' }, { status: 400 });
      }

      const currentBal = Number(currentMember.balance) || 0;
      const newBal = Math.max(0, currentBal + amount);

      const { error: updateErr } = await supabaseAdmin
        .from('members')
        .update({
          balance: newBal,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Catat ke log aktivitas kasir
      await logActivity(req, {
        action: amount > 0 ? 'Top Up Saldo Member' : 'Potong Saldo Member',
        target: currentMember.username,
        details: `Nominal: ${amount > 0 ? '+' : ''}Rp ${amount.toLocaleString('id-ID')} | Saldo Akhir: Rp ${newBal.toLocaleString('id-ID')}`
      });

      // Jika top up bernilai positif via kasir, catat transaksi finansial kasir
      if (amount > 0) {
        await supabaseAdmin.from('logs').insert({
          id: `log-topup-${crypto.randomUUID()}`,
          player_name: currentMember.username,
          pc_name: 'KASIR',
          paket_name: `Top Up Saldo Member (${currentMember.username})`,
          price: amount,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          status: 'Selesai',
          reason: `Top up kasir untuk ${currentMember.full_name || currentMember.username}`
        });
      }

      return NextResponse.json({ success: true, balance: newBal });
    }

    if (action === 'update_profile') {
      const { full_name, phone, gc_user_id } = body;
      const updates: any = {
        updated_at: new Date().toISOString()
      };
      if (full_name !== undefined) updates.full_name = full_name.trim();
      if (phone !== undefined) updates.phone = phone.trim();
      if (gc_user_id !== undefined) updates.gc_user_id = gc_user_id.trim() || null;

      const { error: updateErr } = await supabaseAdmin
        .from('members')
        .update(updates)
        .eq('id', id);

      if (updateErr) throw updateErr;

      await logActivity(req, {
        action: 'Ubah Profil Member',
        target: currentMember.username,
        details: `Nama: ${updates.full_name || currentMember.full_name} | ID Billing: ${updates.gc_user_id || 'Belum dihubungkan'}`
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'reset_password') {
      const { new_password } = body;
      if (!new_password || new_password.trim().length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
      }

      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: new_password.trim()
      });

      if (resetErr) throw resetErr;

      await logActivity(req, {
        action: 'Reset Password Member',
        target: currentMember.username,
        details: `Password diatur ulang oleh kasir untuk akun @${currentMember.username}`
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'generate_recovery_link') {
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: currentMember.email
      });

      if (linkErr) throw linkErr;

      const recoveryLink = linkData?.properties?.action_link;

      await logActivity(req, {
        action: 'Buat Link Recovery Member',
        target: currentMember.username,
        details: `Tautan pemulihan dibuat untuk email ${currentMember.email}`
      });

      return NextResponse.json({ success: true, link: recoveryLink });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memproses perubahan member' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID Member wajib diisi' }, { status: 400 });

    const { data: member } = await supabaseAdmin
      .from('members')
      .select('username')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin.from('members').delete().eq('id', id);
    if (error) throw error;

    await logActivity(req, {
      action: 'Hapus Member',
      target: member?.username || id,
      details: 'Akun member dihapus dari sistem'
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal menghapus member' }, { status: 500 });
  }
}
