import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requirePermission } from '@/utils/auth-api';

export async function POST(request: NextRequest) {
  const permCheck = await requirePermission('Pengaturan', 'create');
  if (permCheck.error) return permCheck.error;

  try {
    const body = await request.json();
    const { email, password, nama, role = 'wali_santri', no_hp } = body;

    // ── Validasi input ──
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email wajib diisi.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 }
      );
    }
    if (!nama?.trim()) {
      return NextResponse.json({ error: 'Nama lengkap wajib diisi.' }, { status: 400 });
    }

        // ── Supabase Admin client ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const VALID_ROLES = ['admin', 'pengasuh', 'wali_santri'];
    if (role && !VALID_ROLES.includes(role)) {
      // Periksa apakah role ada di tabel app_roles (custom role)
      const { data: dbRole } = await supabaseAdmin
        .from('app_roles')
        .select('name')
        .eq('name', role)
        .single();

      if (!dbRole) {
        return NextResponse.json(
          { error: `Role '${role}' tidak terdaftar di custom role.` },
          { status: 400 }
        );
      }
    }

    // ── 1. Buat user di Supabase Auth ──
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true, // Langsung konfirmasi, tidak perlu verifikasi email
      user_metadata: { nama_lengkap: nama.trim() },
    });

    if (authError) {
      console.error('[invite] Auth createUser error:', authError);

      if (authError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Email ini sudah terdaftar di sistem.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Gagal membuat akun: ${authError.message}` },
        { status: 500 }
      );
    }

    const userId = authData.user?.id;

    // ── 2. Insert/update profile ──
    if (userId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          nama_lengkap: nama.trim(),
          role,
          no_hp: no_hp?.trim() || null,
        });

      if (profileError) {
        console.error('[invite] Profile upsert error:', profileError);
        // Non-fatal — user sudah dibuat, profile mungkin terisi via trigger
      }
    }

    // ── 3. Kirim WhatsApp via Fonnte (opsional) ──
    let waStatus: 'sent' | 'skipped' | 'failed' = 'skipped';
    const fonntToken = process.env.FONNTE_API_TOKEN;
    const cleanPhone = no_hp?.trim();

    if (cleanPhone && fonntToken && fonntToken !== 'your-fonnte-token-here') {
      const protocol = request.headers.get('x-forwarded-proto') || '';
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
      const origin = request.headers.get('origin') || '';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin || (protocol && host ? `${protocol}://${host}` : '') || 'http://localhost:3000';

      const message = [
        `🕌 *SIM Pesantren — Undangan Akses Dashboard*`,
        ``,
        `Assalamu'alaikum *${nama.trim()}*,`,
        ``,
        `Anda telah didaftarkan sebagai pengguna baru di Sistem Informasi Manajemen Pesantren.`,
        ``,
        `📧 *Email:* ${email.trim()}`,
        `🔑 *Password:* ${password}`,
        `🔗 *Link Login:* ${appUrl}/login`,
        ``,
        `⚠️ _Segera ubah password Anda setelah login pertama kali._`,
        ``,
        `Jazakallahu khairan.`,
      ].join('\n');

      try {
        const fonntRes = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            Authorization: fonntToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: cleanPhone,
            message,
            countryCode: '62',
          }),
        });

        const fonntBody = await fonntRes.json().catch(() => ({}));

        if (fonntRes.ok && fonntBody.status) {
          waStatus = 'sent';
        } else {
          waStatus = 'failed';
          console.error('[invite] Fonnte error:', fonntBody);
        }
      } catch (waErr) {
        waStatus = 'failed';
        console.error('[invite] Fonnte fetch error:', waErr);
      }
    }

    // ── 4. Response ──
    const roleName =
      role === 'admin' ? 'Super Admin' 
      : role === 'pengasuh' ? 'Pengasuh' 
      : role === 'wali_santri' ? 'Wali Santri'
      : role;

    return NextResponse.json({
      success: true,
      message: `Akun ${roleName} berhasil dibuat untuk ${nama.trim()}.`,
      user: {
        id: userId,
        email: email.trim(),
        nama_lengkap: nama.trim(),
        role: roleName,
        role_raw: role,
        no_hp: cleanPhone || '—',
        status: 'Aktif',
      },
      whatsapp: waStatus,
    });
  } catch (err: any) {
    console.error('[invite] Exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}
