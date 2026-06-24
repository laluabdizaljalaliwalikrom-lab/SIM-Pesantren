CREATE TABLE IF NOT EXISTS public.hero_slides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    subtitle TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select active hero_slides" ON public.hero_slides
    FOR SELECT TO public
    USING (is_active = true);

CREATE POLICY "Allow admin all hero_slides" ON public.hero_slides
    FOR ALL TO authenticated
    USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.update_hero_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_hero_slides_updated ON public.hero_slides;
CREATE TRIGGER on_hero_slides_updated
    BEFORE UPDATE ON public.hero_slides
    FOR EACH ROW
    EXECUTE FUNCTION public.update_hero_slides_updated_at();

INSERT INTO public.hero_slides (image_url, title, subtitle, description, sort_order)
VALUES
    ('https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1200&q=80', 'Kajian Kitab Kuning', 'Menjaga Tradisi Keilmuan Islam Klasik', 'Santri dibimbing secara mendalam untuk membaca, memahami, dan mengkontekstualisasikan kitab-kitab salaf (kuning) muktabarah.', 0),
    ('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', 'Tahfidzul Qur''an', 'Mencetak Generasi Hamalatul Qur''an', 'Program tahfidz intensif dengan metode tahsin yang presisi serta pemantauan kemajuan hafalan secara berkala.', 1),
    ('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80', 'Pendidikan Karakter', 'Keseimbangan Spiritual dan Keilmuan Modern', 'Mengintegrasikan nilai-nilai kepesantrenan dengan keterampilan teknologi dan pendidikan formal berbasis Kurikulum Merdeka.', 2)
ON CONFLICT DO NOTHING;
