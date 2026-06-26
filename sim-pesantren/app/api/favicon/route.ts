import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const revalidate = 3600;

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return fallbackIcon();
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data } = await supabase
      .from('pesantren_profile')
      .select('logo_url')
      .maybeSingle();

    if (!data?.logo_url) {
      return fallbackIcon();
    }

    const imageRes = await fetch(data.logo_url);

    if (!imageRes.ok) {
      return fallbackIcon();
    }

    const imageBuffer = await imageRes.arrayBuffer();

    const resizedBuffer = await sharp(Buffer.from(imageBuffer))
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return new NextResponse(resizedBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
  } catch {
    return fallbackIcon();
  }
}

async function fallbackIcon() {
  const fs = await import('fs/promises');
  const path = await import('path');
  const filePath = path.join(process.cwd(), 'public', 'icon-512x512.png');

  try {
    const buffer = await fs.readFile(filePath);
    const resizedBuffer = await sharp(buffer)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return new NextResponse(resizedBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
