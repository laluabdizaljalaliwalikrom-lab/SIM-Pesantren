import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 300;

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        logo_url: '',
        nama_pesantren: 'SIM Pesantren',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from('pesantren_profile')
      .select('logo_url, nama_pesantren')
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({
        logo_url: '',
        nama_pesantren: 'SIM Pesantren',
      });
    }

    return NextResponse.json({
      logo_url: data.logo_url || '',
      nama_pesantren: data.nama_pesantren || 'SIM Pesantren',
    });
  } catch {
    return NextResponse.json({
      logo_url: '',
      nama_pesantren: 'SIM Pesantren',
    });
  }
}
