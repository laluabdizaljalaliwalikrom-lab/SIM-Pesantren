import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let name = 'SIM Pesantren';
  const iconUrl = '/api/pwa-icon';

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data } = await supabase
        .from('pesantren_profile')
        .select('nama_pesantren, logo_url')
        .maybeSingle();

      if (data?.nama_pesantren) name = data.nama_pesantren;
    } catch {
      // fallback to defaults
    }
  }

  const manifest = {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) + '…' : name,
    description: 'Sistem Informasi Manajemen Pesantren Modern',
    theme_color: '#047857',
    background_color: '#ffffff',
    display: 'standalone' as const,
    orientation: 'portrait' as const,
    start_url: '/admin',
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable' as const,
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable' as const,
      },
    ],
  };

  return NextResponse.json(manifest);
}
