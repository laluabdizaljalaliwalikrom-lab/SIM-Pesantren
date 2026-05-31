import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth Guard Middleware
 *
 * Menggunakan @supabase/ssr (pengganti resmi @supabase/auth-helpers-nextjs
 * yang sudah deprecated). Middleware ini berjalan di Edge Runtime pada
 * setiap request yang cocok dengan matcher di bawah.
 *
 * Logika:
 * 1. Baca session cookie Supabase dari request headers.
 * 2. Jika BELUM LOGIN → akses rute dashboard → redirect ke /login.
 * 3. Jika SUDAH LOGIN → akses /login → redirect ke /admin (dashboard utama).
 * 4. Refresh token otomatis jika mendekati expired.
 */

// Rute yang termasuk area dashboard (dilindungi login)
const PROTECTED_PREFIXES = [
  '/admin',
  '/santri',
  '/pegawai',
  '/akademik',
  '/asrama',
  '/keuangan',
  '/pembayaran',
  '/lembaga',
  '/tahfidz',
  '/settings',
  '/profile',
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  // Buat response awal yang bisa kita modifikasi (set-cookie untuk refresh)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Set di request (agar server component downstream juga bisa baca)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2. Re-create response agar header cookie terikut
          supabaseResponse = NextResponse.next({ request });
          // 3. Set di response (agar browser menyimpan cookie baru)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // PENTING: Jangan gunakan supabase.auth.getSession() di middleware —
  // gunakan getUser() karena ia mem-validasi JWT terhadap server Supabase
  // dan sekaligus me-refresh token jika perlu.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Guard 1: Belum login → akses dashboard → redirect ke /login ──
  if (!user && isProtectedRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    // Simpan URL asli agar setelah login bisa redirect balik
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Guard 2: Sudah login → akses /login → redirect ke /admin ──
  if (user && pathname === '/login') {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/admin';
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

// ─────────────────────────────────────────────────────────────────────────
// Matcher: jalankan middleware HANYA pada rute yang relevan.
// Kecualikan: file statis, favicon, gambar, _next internal, dan API routes.
// ─────────────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Cocokkan semua path KECUALI yang dimulai dengan:
     * - _next/static  (file build internal Next.js)
     * - _next/image   (image optimization API)
     * - favicon.ico   (browser favicon)
     * - api/          (API routes — biar mereka handle auth sendiri)
     * - File statis dengan ekstensi umum
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
