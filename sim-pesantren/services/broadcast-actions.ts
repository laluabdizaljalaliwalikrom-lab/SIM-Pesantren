'use server';

import { supabase } from '@/lib/supabase';
import { sendPaymentNotification } from '@/services/whatsapp-actions';
import { sendBroadcastEmail, generateAnnouncementEmailHtml } from '@/services/email-actions';
import { logActivity } from '@/services/audit-actions';
import { BroadcastChannel, BroadcastAudience } from '@/types/database';

export interface RecipientTargetItem {
  id: string;
  nama: string;
  tipe: 'Santri' | 'Wali Santri' | 'Pegawai';
  nomorWa?: string | null;
  email?: string | null;
  nis_nip?: string | null;
  kelas_jabatan?: string | null;
}

export interface SendBroadcastParams {
  judul: string;
  isiPesan: string;
  saluran: BroadcastChannel;
  targetAudience: BroadcastAudience;
  targetFilter?: Record<string, any>;
  recipients: RecipientTargetItem[];
}

/**
 * Format nomor telepon standar WhatsApp Indonesia (628xxx)
 */
function normalizePhoneNumber(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  let cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned.length >= 10 ? cleaned : null;
}

/**
 * Mengganti variabel dinamis di pesan
 */
function replacePlaceholders(
  template: string,
  item: RecipientTargetItem,
  pesantrenName: string
): string {
  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return template
    .replace(/\{nama\}/gi, item.nama || '')
    .replace(/\{nis_nip\}/gi, item.nis_nip || '-')
    .replace(/\{kelas_jabatan\}/gi, item.kelas_jabatan || '-')
    .replace(/\{pesantren\}/gi, pesantrenName)
    .replace(/\{tanggal\}/gi, today);
}

/**
 * Server Action utama: Proses pengiriman Siaran Massal WhatsApp & Email
 */
export async function executeBroadcast({
  judul,
  isiPesan,
  saluran,
  targetAudience,
  targetFilter = {},
  recipients,
}: SendBroadcastParams): Promise<{
  success: boolean;
  broadcastId?: string;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
  error?: string;
}> {
  try {
    if (!recipients || recipients.length === 0) {
      return { success: false, totalSent: 0, totalFailed: 0, totalSkipped: 0, error: 'Daftar penerima kosong.' };
    }

    // 1. Ambil info pengirim dari sesi login
    const { data: { user } } = await supabase.auth.getUser();
    let senderName = 'Admin Pesantren';
    let senderId: string | null = null;

    if (user) {
      senderId = user.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('nama_lengkap')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.nama_lengkap) senderName = profile.nama_lengkap;
    }

    // 2. Ambil nama pesantren dari profil
    const { data: pesProfile } = await supabase
      .from('pesantren_profile')
      .select('nama_pesantren, logo_url')
      .maybeSingle();

    const pesantrenName = pesProfile?.nama_pesantren || 'SIM Pesantren';
    const pesantrenLogo = pesProfile?.logo_url || null;

    // 3. Buat record awal di broadcast_messages
    const { data: broadcastRecord, error: insertError } = await supabase
      .from('broadcast_messages')
      .insert({
        sender_id: senderId,
        sender_name: senderName,
        judul,
        isi_pesan: isiPesan,
        saluran,
        target_audience: targetAudience,
        target_filter: targetFilter,
        total_target: recipients.length,
        total_sent: 0,
        total_failed: 0,
        total_skipped: 0,
        status: 'processing',
      })
      .select('id')
      .single();

    if (insertError || !broadcastRecord) {
      console.error('Error inserting broadcast_messages:', insertError);
      return { success: false, totalSent: 0, totalFailed: 0, totalSkipped: 0, error: insertError?.message || 'Gagal membuat pesan siaran.' };
    }

    const broadcastId = broadcastRecord.id;

    // 4. Kirim ke setiap penerima secara batch
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    const recipientRows: any[] = [];

    for (const item of recipients) {
      const personalizedMessage = replacePlaceholders(isiPesan, item, pesantrenName);
      const normalizedPhone = normalizePhoneNumber(item.nomorWa);
      const emailTarget = item.email && item.email.includes('@') ? item.email.trim() : null;

      let statusWa: 'none' | 'sent' | 'failed' | 'skipped' = 'none';
      let errorWa: string | null = null;

      let statusEmail: 'none' | 'sent' | 'failed' | 'skipped' = 'none';
      let errorEmail: string | null = null;

      // A. Kirim WhatsApp
      if (saluran === 'whatsapp' || saluran === 'both') {
        if (!normalizedPhone) {
          statusWa = 'skipped';
          errorWa = 'Nomor WhatsApp tidak tersedia atau format tidak valid';
        } else {
          try {
            // Header pesantren resmi di awal pesan WA
            const fullWaText = `*${pesantrenName}*\n_${judul}_\n\nKepada Yth. *${item.nama}*\n\n${personalizedMessage}\n\n_Pesan otomatis dari Sistem Informasi ${pesantrenName}_`;
            const waRes = await sendPaymentNotification(normalizedPhone, fullWaText);

            if (waRes.status) {
              statusWa = 'sent';
            } else if (waRes.skipped) {
              statusWa = 'skipped';
              errorWa = 'Token Fonnte belum dikonfigurasi';
            } else {
              statusWa = 'failed';
              errorWa = typeof waRes.error === 'object' ? JSON.stringify(waRes.error) : String(waRes.error);
            }
          } catch (e: any) {
            statusWa = 'failed';
            errorWa = e.message || 'Gagal mengirim WhatsApp';
          }
        }
      }

      // B. Kirim Email
      if (saluran === 'email' || saluran === 'both') {
        if (!emailTarget) {
          statusEmail = 'skipped';
          errorEmail = 'Alamat email tidak tersedia';
        } else {
          try {
            const htmlEmail = await generateAnnouncementEmailHtml({
              pesantrenName,
              pesantrenLogo,
              recipientName: item.nama,
              title: judul,
              message: personalizedMessage,
            });

            const emailRes = await sendBroadcastEmail({
              to: emailTarget,
              subject: `${pesantrenName}: ${judul}`,
              htmlContent: htmlEmail,
              senderName: pesantrenName,
            });

            if (emailRes.status) {
              statusEmail = 'sent';
            } else if (emailRes.skipped) {
              statusEmail = 'skipped';
              errorEmail = typeof emailRes.error === 'string' 
                ? emailRes.error 
                : (emailRes.error ? JSON.stringify(emailRes.error) : 'Provider email belum dikonfigurasi');
            } else {
              statusEmail = 'failed';
              errorEmail = typeof emailRes.error === 'object' ? JSON.stringify(emailRes.error) : String(emailRes.error);
            }
          } catch (e: any) {
            statusEmail = 'failed';
            errorEmail = e.message || 'Gagal mengirim email';
          }
        }
      }

      // Hitung agregat status
      const hasSent = statusWa === 'sent' || statusEmail === 'sent';
      const hasFailed = statusWa === 'failed' || statusEmail === 'failed';
      const hasSkipped = statusWa === 'skipped' || statusEmail === 'skipped';

      if (hasSent) sentCount++;
      else if (hasFailed) failedCount++;
      else if (hasSkipped) skippedCount++;

      recipientRows.push({
        id_broadcast: broadcastId,
        nama_penerima: item.nama,
        tipe_penerima: item.tipe,
        nomor_wa: normalizedPhone,
        email: emailTarget,
        status_wa: statusWa,
        status_email: statusEmail,
        error_wa: errorWa,
        error_email: errorEmail,
      });
    }

    // 5. Simpan detail penerima ke broadcast_recipients (bulk insert)
    if (recipientRows.length > 0) {
      await supabase.from('broadcast_recipients').insert(recipientRows);
    }

    // 6. Update ringkasan di broadcast_messages
    await supabase
      .from('broadcast_messages')
      .update({
        total_sent: sentCount,
        total_failed: failedCount,
        total_skipped: skippedCount,
        status: 'completed',
      })
      .eq('id', broadcastId);

    // 7. Catat ke Audit Trail
    await logActivity({
      action: 'CREATE',
      module: 'Settings',
      description: `Mengirim siaran pengumuman "${judul}" ke ${recipients.length} target (${sentCount} terkirim, ${failedCount} gagal, ${skippedCount} dilewati) via ${saluran}`,
      recordId: broadcastId,
      newData: {
        judul,
        saluran,
        targetAudience,
        totalTarget: recipients.length,
        totalSent: sentCount,
        totalFailed: failedCount,
        totalSkipped: skippedCount,
      },
    });

    return {
      success: true,
      broadcastId,
      totalSent: sentCount,
      totalFailed: failedCount,
      totalSkipped: skippedCount,
    };
  } catch (err: any) {
    console.error('Fatal executeBroadcast error:', err);
    return {
      success: false,
      totalSent: 0,
      totalFailed: 0,
      totalSkipped: 0,
      error: err.message || 'Terjadi kesalahan sistem saat memproses siaran.',
    };
  }
}
