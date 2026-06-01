-- =========================================================================
-- SQL MIGRATION: ADVANCED DORMITORY FEATURES
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Add 'kategori_gender' to 'gedung' table
ALTER TABLE public.gedung
  ADD COLUMN IF NOT EXISTS kategori_gender VARCHAR(2) DEFAULT 'L' CHECK (kategori_gender IN ('L', 'P', 'LP'));

COMMENT ON COLUMN public.gedung.kategori_gender IS 'Peruntukan gender gedung: L (Putra), P (Putri), LP (Campuran/Semua)';

-- 2. Create room transfer logs table
CREATE TABLE IF NOT EXISTS public.log_perpindahan_kamar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_santri UUID REFERENCES public.santri(id) ON DELETE CASCADE,
  id_kamar_asal UUID REFERENCES public.kamar(id) ON DELETE SET NULL,
  id_kamar_tujuan UUID REFERENCES public.kamar(id) ON DELETE SET NULL,
  tanggal_pindah TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  keterangan TEXT
);

-- Enable RLS on log table
ALTER TABLE public.log_perpindahan_kamar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for log_perpindahan_kamar" ON public.log_perpindahan_kamar;
DROP POLICY IF EXISTS "Allow public insert for log_perpindahan_kamar" ON public.log_perpindahan_kamar;

CREATE POLICY "Allow public select for log_perpindahan_kamar" ON public.log_perpindahan_kamar FOR SELECT USING (true);
CREATE POLICY "Allow public insert for log_perpindahan_kamar" ON public.log_perpindahan_kamar FOR INSERT WITH CHECK (true);

-- 3. Create Trigger to automatically log any room change on 'santri' table
CREATE OR REPLACE FUNCTION public.log_santri_room_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.id_kamar IS DISTINCT FROM NEW.id_kamar) THEN
    INSERT INTO public.log_perpindahan_kamar (id_santri, id_kamar_asal, id_kamar_tujuan, keterangan)
    VALUES (
      NEW.id, 
      OLD.id_kamar, 
      NEW.id_kamar, 
      CASE 
        WHEN OLD.id_kamar IS NULL THEN 'Masuk kamar pertama kali'
        WHEN NEW.id_kamar IS NULL THEN 'Dikeluarkan dari kamar'
        ELSE 'Pindah kamar'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_santri_room_change ON public.santri;
CREATE TRIGGER trigger_log_santri_room_change
  AFTER UPDATE OF id_kamar ON public.santri
  FOR EACH ROW
  EXECUTE FUNCTION public.log_santri_room_change();

-- 4. Update PL/pgSQL function 'move_santri_to_kamar' to validate gender compatibility
CREATE OR REPLACE FUNCTION public.move_santri_to_kamar(
  santri_ids UUID[],
  target_kamar_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  remaining_capacity INT
) LANGUAGE plpgsql AS $$
DECLARE
  v_capacity INT;
  v_current_occupants INT;
  v_needed INT;
  v_building_gender VARCHAR(2);
  v_student_gender_mismatch INT;
BEGIN
  -- Get room capacity and building gender peruntukan
  SELECT k.kapasitas, g.kategori_gender INTO v_capacity, v_building_gender 
  FROM public.kamar k
  LEFT JOIN public.gedung g ON k.id_gedung = g.id
  WHERE k.id = target_kamar_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Kamar tidak ditemukan.'::TEXT, 0;
    RETURN;
  END IF;

  -- Default building gender to 'LP' if not set
  IF v_building_gender IS NULL THEN
    v_building_gender := 'LP';
  END IF;

  -- Validate student gender compatibility
  IF v_building_gender != 'LP' THEN
    SELECT COUNT(*)::INT INTO v_student_gender_mismatch
    FROM public.santri
    WHERE id = ANY(santri_ids) AND jenis_kelamin IS DISTINCT FROM v_building_gender;

    IF v_student_gender_mismatch > 0 THEN
      RETURN QUERY SELECT FALSE, 'Gagal: Terdapat santri dengan gender yang tidak sesuai peruntukan gedung.'::TEXT, 0;
      RETURN;
    END IF;
  END IF;

  -- Count current occupants
  SELECT COUNT(*)::INT INTO v_current_occupants FROM public.santri WHERE id_kamar = target_kamar_id;

  -- Needed spots
  v_needed := array_length(santri_ids, 1);

  -- Validate capacity
  IF (v_capacity - v_current_occupants) < v_needed THEN
    RETURN QUERY SELECT FALSE, 'Kapasitas kamar tidak mencukupi.'::TEXT, (v_capacity - v_current_occupants);
    RETURN;
  END IF;

  -- Update occupants (this will trigger trigger_log_santri_room_change automatically)
  UPDATE public.santri
  SET id_kamar = target_kamar_id
  WHERE id = ANY(santri_ids);

  RETURN QUERY SELECT TRUE, 'Santri berhasil dipindahkan.'::TEXT, (v_capacity - (v_current_occupants + v_needed));
END;
$$;
