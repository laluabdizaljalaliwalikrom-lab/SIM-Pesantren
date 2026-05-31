import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Peringatan: Variabel lingkungan Supabase tidak ditemukan. Pastikan Anda telah mengisi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di berkas .env.local'
  );
}

/**
 * Browser Supabase Client
 *
 * Menggunakan `createBrowserClient` dari @supabase/ssr agar session
 * otomatis tersimpan di COOKIES (bukan hanya localStorage).
 *
 * Ini penting karena middleware.ts membaca session dari cookies.
 * Jika menggunakan `createClient` biasa dari @supabase/supabase-js,
 * session hanya disimpan di localStorage → middleware tidak bisa
 * mendeteksi user yang sudah login → redirect loop ke /login.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
