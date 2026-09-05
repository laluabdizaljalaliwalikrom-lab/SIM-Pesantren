'use server';

import { supabase } from '@/lib/supabase';

export async function sendPaymentNotification(phoneNumber: string, message: string) {
  // Coba ambil token aktif dari database gateway_settings terlebih dahulu
  let token = process.env.FONNTE_API_TOKEN;

  try {
    const { data: gateway } = await supabase
      .from('gateway_settings')
      .select('wa_token, wa_is_active')
      .eq('id', 1)
      .maybeSingle();

    if (gateway) {
      if (!gateway.wa_is_active) {
        console.warn('[WA] WhatsApp gateway dinonaktifkan di pengaturan sistem.');
        return { status: false, skipped: true, error: 'Gateway WhatsApp dinonaktifkan di Pengaturan' };
      }
      if (gateway.wa_token && gateway.wa_token.trim()) {
        token = gateway.wa_token.trim();
      }
    }
  } catch (e) {
    console.warn('[WA] Gagal membaca gateway_settings, fallback ke env:', e);
  }

  if (!token || token === 'your-fonnte-token-here') {
    console.warn('[WA] Fonnte token not configured, skipping send');
    return { status: false, skipped: true, error: 'Token WhatsApp Fonnte belum dikonfigurasi' };
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phoneNumber,
        message: message,
        countryCode: '62',
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.status) {
      console.error('[WA] Fonnte error:', result);
      return { status: false, error: result };
    }

    console.log('[WA] Message sent successfully:', result);
    return { status: true, result };
  } catch (err) {
    console.error('[WA] Failed to send:', err);
    return { status: false, error: err };
  }
}

/**
 * Tes koneksi WhatsApp Gateway (Fonnte) untuk memeriksa apakah device terhubung
 */
export async function checkWhatsAppConnection(customToken?: string): Promise<{
  connected: boolean;
  device?: string;
  name?: string;
  status?: string;
  message?: string;
}> {
  let token = customToken || process.env.FONNTE_API_TOKEN;

  if (!token) {
    try {
      const { data: gateway } = await supabase
        .from('gateway_settings')
        .select('wa_token')
        .eq('id', 1)
        .maybeSingle();

      if (gateway?.wa_token) {
        token = gateway.wa_token.trim();
      }
    } catch (e) {
      console.warn('[WA] Gagal membaca token dari db:', e);
    }
  }

  if (!token || token === 'your-fonnte-token-here') {
    return { connected: false, message: 'Token belum diisi atau dikonfigurasi.' };
  }

  try {
    const response = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: {
        'Authorization': token,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.status) {
      return {
        connected: false,
        message: result.reason || result.message || 'Token tidak valid atau device belum terdaftar.',
      };
    }

    const deviceStatus = result.device_status || result.status;
    const isConnected = deviceStatus === 'connect' || result.status === true;

    return {
      connected: isConnected,
      device: result.device,
      name: result.name,
      status: result.device_status,
      message: isConnected
        ? `Terhubung (Device: ${result.device || result.name || 'OK'})`
        : `Device tidak aktif / terputus (${result.device_status || 'Disconnect'})`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { connected: false, message: 'Gagal menghubungi server Fonnte: ' + errorMsg };
  }
}

