import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Skema Payload dari Webhook Supabase
interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: {
    id: string;
    id_santri: string;
    keperluan: string;
    tanggal_keluar: string;
    status: string;
    [key: string]: any;
  };
  old_record: any;
}

export async function POST(request: Request) {
  try {
    // 1. Verifikasi Header Authorization (Keamanan Webhook)
    // Direkomendasikan membuat token rahasia sendiri di env untuk menghindari trigger ilegal
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: SupabaseWebhookPayload = await request.json();

    // Pastikan event adalah INSERT baru pada tabel perizinan
    if (payload.type !== 'INSERT' || payload.table !== 'perizinan') {
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    const { id_santri, keperluan, tanggal_keluar } = payload.record;

    // 2. Tarik data santri beserta no_hp wali santri dari profiles
    const { data: santri, error: dbError } = await supabase
      .from('santri')
      .select(`
        nama_lengkap,
        wali:id_wali (
          nama_lengkap,
          no_hp
        )
      `)
      .eq('id', id_santri)
      .single();

    if (dbError || !santri) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ error: 'Santri or Wali data not found' }, { status: 404 });
    }

    // Cast data wali hasil join
    const wali = santri.wali as unknown as { nama_lengkap: string; no_hp: string } | null;

    if (!wali || !wali.no_hp) {
      return NextResponse.json({ message: 'Wali does not have a phone number' }, { status: 200 });
    }

    // 3. Format Jam dan Tanggal
    const jamKeluar = new Date(tanggal_keluar).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

    // 4. Susun pesan template WhatsApp
    const messageText = `Assalamu'alaikum, Bapak/Ibu ${wali.nama_lengkap}, ananda *${santri.nama_lengkap}* baru saja mendapatkan izin keluar pesantren pada jam *${jamKeluar} WIB* untuk keperluan *${keperluan}*. Mohon pantau keberadaan ananda. Terimakasih.`;

    // 5. Kirim via WhatsApp API (Contoh Menggunakan Fonnte)
    const fonnteResponse = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: process.env.FONNTE_API_TOKEN || '', // Token dari fonnte.com
      },
      body: new URLSearchParams({
        target: wali.no_hp,
        message: messageText,
      }),
    });

    const fonnteResult = await fonnteResponse.json();

    if (!fonnteResponse.ok || !fonnteResult.status) {
      console.error('Failed to send WhatsApp message via Fonnte:', fonnteResult);
      return NextResponse.json({ error: 'WhatsApp delivery failed', details: fonnteResult }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp notification sent successfully',
      target: wali.no_hp,
    });

  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
