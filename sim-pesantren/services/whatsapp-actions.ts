'use server';

export async function sendPaymentNotification(phoneNumber: string, message: string) {
  const token = process.env.FONNTE_API_TOKEN;

  if (!token || token === 'your-fonnte-token-here') {
    console.warn('[WA] Fonnte token not configured, skipping send');
    return { status: false, skipped: true };
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
