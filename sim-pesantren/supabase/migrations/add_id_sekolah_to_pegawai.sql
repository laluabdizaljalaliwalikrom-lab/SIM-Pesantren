-- =========================================================================
-- SQL MIGRATION: ADD id_sekolah TO TABLE public.pegawai
-- =========================================================================

ALTER TABLE public.pegawai
  ADD COLUMN IF NOT EXISTS id_sekolah UUID REFERENCES public.sekolah(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.pegawai.id_sekolah IS 'ID lembaga pendidikan tempat pegawai terafiliasi/satminkal';
