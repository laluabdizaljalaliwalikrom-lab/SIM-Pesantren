'use server';

import { supabase } from '@/lib/supabase';

interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  senderName?: string;
}

/**
 * Service pengirim email siaran pengumuman.
 * Menggunakan Resend API dari gateway_settings / RESEND_API_KEY.
 */
export async function sendBroadcastEmail({
  to,
  subject,
  htmlContent,
  senderName = 'SIM Pesantren',
}: SendEmailParams): Promise<{ status: boolean; skipped?: boolean; error?: unknown; result?: unknown }> {
  let apiKey = process.env.RESEND_API_KEY;
  let fromAddress = process.env.EMAIL_FROM || `${senderName} <onboarding@resend.dev>`;

  try {
    const { data: gateway } = await supabase
      .from('gateway_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (gateway) {
      if (!gateway.email_is_active) {
        return { status: false, skipped: true, error: 'Pengiriman Email dinonaktifkan di Pengaturan' };
      }
      if (gateway.resend_api_key && gateway.resend_api_key.trim()) {
        apiKey = gateway.resend_api_key.trim();
      }
      if (gateway.email_from_address && gateway.email_from_address.trim()) {
        fromAddress = gateway.email_from_address.trim();
      }
    }
  } catch (e) {
    console.warn('[EMAIL] Gagal membaca gateway_settings, fallback ke env:', e);
  }

  if (!apiKey || apiKey.startsWith('your-')) {
    console.warn('[EMAIL] RESEND_API_KEY not configured. Email broadcast will be simulated/skipped for:', to);
    return { status: false, skipped: true, error: 'Kunci API Email (Resend API Key) belum dikonfigurasi di Pengaturan' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[EMAIL] Resend error:', result);
      return { status: false, error: result };
    }

    return { status: true, result };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[EMAIL] Send exception:', err);
    return { status: false, error: errorMsg };
  }
}

/**
 * Memformat template HTML email pengumuman resmi pesantren.
 */
export async function generateAnnouncementEmailHtml({
  pesantrenName,
  pesantrenLogo,
  recipientName,
  title,
  message,
}: {
  pesantrenName: string;
  pesantrenLogo?: string | null;
  recipientName: string;
  title: string;
  message: string;
}): Promise<string> {
  // Format baris baru pesan menjadi paragraf / <br>
  const formattedMessage = message
    .split('\n')
    .map((line) => (line.trim() === '' ? '<br/>' : `<p style="margin: 0 0 10px 0;">${line}</p>`))
    .join('');

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <!-- Header -->
    <tr>
      <td style="background-color: #059669; padding: 24px 32px; text-align: center;">
        ${pesantrenLogo ? `<img src="${pesantrenLogo}" alt="Logo" style="height: 48px; width: auto; margin-bottom: 8px; border-radius: 8px; background: #ffffff; padding: 4px;" />` : ''}
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">${pesantrenName}</h1>
        <p style="color: #a7f3d0; margin: 4px 0 0 0; font-size: 12px; font-weight: 500;">Pemberitahuan & Pengumuman Resmi</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #334155;">
          Kepada Yth. <strong>${recipientName}</strong>,
        </p>

        <div style="background-color: #f1f5f9; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">${title}</h2>
        </div>

        <div style="font-size: 14px; line-height: 1.6; color: #334155;">
          ${formattedMessage}
        </div>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          <p style="margin: 0 0 4px 0;">Pesan ini dikirim secara otomatis oleh sistem informasi ${pesantrenName}.</p>
          <p style="margin: 0;">Harap tidak membalas email ini secara langsung.</p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 16px 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
        &copy; ${new Date().getFullYear()} ${pesantrenName}. Hak Cipta Dilindungi.
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Tes koneksi provider Email (Resend API key validation)
 */
export async function checkEmailConnection(customApiKey?: string): Promise<{
  connected: boolean;
  message?: string;
  domains?: unknown[];
}> {
  let apiKey = customApiKey || process.env.RESEND_API_KEY;

  if (!apiKey) {
    try {
      const { data: gateway } = await supabase
        .from('gateway_settings')
        .select('resend_api_key')
        .eq('id', 1)
        .maybeSingle();

      if (gateway?.resend_api_key) {
        apiKey = gateway.resend_api_key.trim();
      }
    } catch (e) {
      console.warn('[EMAIL] Gagal membaca key dari db:', e);
    }
  }

  if (!apiKey || apiKey.startsWith('your-')) {
    return { connected: false, message: 'Resend API Key belum diisi atau dikonfigurasi.' };
  }

  try {
    // Panggil endpoint /api-keys atau /domains di Resend untuk memvalidasi token
    const response = await fetch('https://api.resend.com/api-keys', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      return {
        connected: false,
        message: errRes.message || `API Key tidak valid (HTTP ${response.status})`,
      };
    }

    return {
      connected: true,
      message: 'Koneksi Resend API Berhasil & Token Valid',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      message: 'Gagal menghubungi server Resend: ' + errorMsg,
    };
  }
}

