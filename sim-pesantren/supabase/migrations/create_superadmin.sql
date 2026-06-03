-- =========================================================================
-- SQL SCRIPT: CREATE & ELEVATE SUPERADMIN USER
-- Jalankan script ini di SQL Editor Dashboard Supabase Anda.
-- =========================================================================

-- OPSI A: Jika Anda telah membuat/mengundang email lazali.berkah@gmail.com
-- lewat menu Supabase Auth Dashboard -> Users:
-- Cukup jalankan SQL di bawah ini untuk menaikkan role menjadi Super Admin:

UPDATE public.profiles
SET role = 'Super Admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'lazali.berkah@gmail.com');


-- OPSI B: Jika Anda ingin langsung memasukkan user ini via SQL Editor
-- dengan password default 'Admin123!':
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lazali.berkah@gmail.com') THEN
    -- 1. Insert ke tabel auth.users (Gunakan bcrypt hash standar Supabase untuk password 'Admin123!')
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'lazali.berkah@gmail.com',
      crypt('Admin123!', gen_salt('bf')),
      now(),
      null,
      null,
      '{"provider":"email","providers":["email"]}',
      '{"nama_lengkap":"Super Admin Lazali","role":"Super Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- 2. Insert/Update profil publik agar sinkron
    INSERT INTO public.profiles (id, nama_lengkap, role, no_hp)
    VALUES (new_user_id, 'Super Admin Lazali', 'Super Admin', '')
    ON CONFLICT (id) DO UPDATE SET role = 'Super Admin';
  ELSE
    -- Jika user sudah ada di auth, pastikan status role-nya adalah 'Super Admin'
    UPDATE public.profiles
    SET role = 'Super Admin'
    WHERE id = (SELECT id FROM auth.users WHERE email = 'lazali.berkah@gmail.com');
  END IF;
END $$;
