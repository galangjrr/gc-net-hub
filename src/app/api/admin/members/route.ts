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
      const rawAmount = Number(body.amount);
      if (isNaN(rawAmount) || !Number.isFinite(rawAmount)) {
        return NextResponse.json({ error: 'Nominal top up wajib berupa angka yang sah' }, { status: 400 });
      }

      const amount = Math.floor(rawAmount);

      // Batas minimal top up kasir Rp 1.000
      if (amount < 1000) {
        return NextResponse.json({ error: 'Minimal top up saldo adalah Rp 1.000' }, { status: 400 });
      }

      // Batas maksimal top up sekali transaksi kasir Rp 2.000.000
      if (amount > 2000000) {
        return NextResponse.json({ error: 'Maksimal top up kasir sekali transaksi adalah Rp 2.000.000' }, { status: 400 });
      }

      const currentBal = Number(currentMember.balance) || 0;
      const newBal = currentBal + amount;

      // Batas plafon deposit maksimal per akun member Rp 10.000.000
      if (newBal > 10000000) {
        return NextResponse.json({ error: 'Saldo akumulasi member tidak boleh melebihi batas Rp 10.000.000' }, { status: 400 });
      }

      // Catat transaksi keuangan kasir terlebih dahulu ke pembukuan rekap
      const logId = `log-topup-${crypto.randomUUID()}`;
      const nowIso = new Date().toISOString();

      const { error: logErr } = await supabaseAdmin.from('logs').insert({
        id: logId,
        player_name: currentMember.username,
        pc_name: 'KASIR',
        paket_name: `Top Up Saldo Member @${currentMember.username}`,
        price: amount,
        start_time: nowIso,
        end_time: nowIso,
        status: 'Selesai',
        reason: `Penerimaan kas kasir untuk ${currentMember.full_name || currentMember.username}`
      });

      if (logErr) throw logErr;

      // Update saldo akun member
      const { error: updateErr } = await supabaseAdmin
        .from('members')
        .update({
          balance: newBal,
          updated_at: nowIso
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Catat ke log audit trail operator kasir
      await logActivity(req, {
        action: 'Top Up Saldo Member',
        target: currentMember.username,
        details: `Nominal: +Rp ${amount.toLocaleString('id-ID')} | Saldo Awal: Rp ${currentBal.toLocaleString('id-ID')} | Saldo Akhir: Rp ${newBal.toLocaleString('id-ID')}`
      });

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
