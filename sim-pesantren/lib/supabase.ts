import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Peringatan: Variabel lingkungan Supabase tidak ditemukan. Pastikan Anda telah mengisi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di berkas .env.local'
  );
}

// Inisialisasi Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
=============================================================================
PANDUAN PENGGUNAAN DI NEXT.JS (APP ROUTER)
=============================================================================

1. DI CLIENT COMPONENT (Menggunakan 'use client'):
   --------------------------------------------------------------------------
   Anda dapat langsung mengimpor client ini untuk operasi di sisi browser (misal: event handler, useEffect).
   
   Contoh:
   import { supabase } from '@/lib/supabase';
   
   const handleSignUp = async () => {
     const { data, error } = await supabase.auth.signUp({ email, password });
   };

2. DI SERVER COMPONENT (Default di App Router / Server Actions / Route Handlers):
   --------------------------------------------------------------------------
   - Untuk Server Component sederhana (tanpa cookie/session auth dinamis), client ini bisa digunakan.
   - Namun, jika Anda memerlukan integrasi autentikasi (membaca cookie session user di Server),
     sangat disarankan menggunakan helper `@supabase/ssr` agar Supabase dapat membaca/menulis
     cookie secara otomatis di sisi server.
     
     Gunakan perintah berikut untuk menginstal:
     npm install @supabase/ssr
     
     Contoh pembuatan Server Client:
     import { createServerClient } from '@supabase/ssr'
     import { cookies } from 'next/headers'

     export async function getServerSupabase() {
       const cookieStore = await cookies()
       return createServerClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
         {
           cookies: {
             getAll() {
               return cookieStore.getAll()
             },
             setAll(cookiesToSet) {
               try {
                 cookiesToSet.forEach(({ name, value, options }) =>
                   cookieStore.set(name, value, options)
                 )
               } catch {
                 // Diabaikan jika dipanggil dari Server Component yang bersifat read-only
               }
             },
           },
         }
       )
     }
=============================================================================
*/
