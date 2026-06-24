'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Image,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import { uploadHeroSlide } from '@/services/storage-actions';
import type { HeroSlide } from '@/types/database';

export default function HeroSlidesManager({ isAdmin }: { isAdmin: boolean }) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});

  const [editForm, setEditForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    image_url: ''
  });
  const [editNewImage, setEditNewImage] = useState<File | null>(null);

  const fetchSlides = async () => {
    try {
      const { data, error } = await supabase
        .from('hero_slides')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setSlides(data || []);
    } catch (err: any) {
      console.error('Error fetching hero slides:', err);
      toast.error('Gagal memuat data slideshow.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const startEdit = (slide: HeroSlide) => {
    setEditingId(slide.id);
    setEditForm({
      title: slide.title,
      subtitle: slide.subtitle,
      description: slide.description,
      image_url: slide.image_url
    });
    setEditNewImage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNewImage(null);
  };

  const saveSlide = async (slide: HeroSlide) => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      let imageUrl = editForm.image_url;

      if (editNewImage) {
        setUploadingMap(prev => ({ ...prev, [slide.id]: true }));
        const ext = editNewImage.name.split('.').pop() || 'jpg';
        const fileName = `hero_slide_${slide.id}_${Date.now()}.${ext}`;
        imageUrl = await uploadHeroSlide(editNewImage, fileName);
        setUploadingMap(prev => ({ ...prev, [slide.id]: false }));
      }

      const { error } = await supabase
        .from('hero_slides')
        .update({
          title: editForm.title,
          subtitle: editForm.subtitle,
          description: editForm.description,
          image_url: imageUrl
        })
        .eq('id', slide.id);

      if (error) throw error;

      toast.success('Slide berhasil diperbarui.');
      setEditingId(null);
      setEditNewImage(null);
      await fetchSlides();
    } catch (err: any) {
      console.error('Error saving slide:', err);
      toast.error(err.message || 'Gagal menyimpan slide.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (slide: HeroSlide) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('hero_slides')
        .update({ is_active: !slide.is_active })
        .eq('id', slide.id);

      if (error) throw error;
      await fetchSlides();
    } catch (err: any) {
      toast.error('Gagal mengubah status slide.');
    }
  };

  const deleteSlide = async (slide: HeroSlide) => {
    if (!isAdmin) return;
    if (!confirm(`Hapus slide "${slide.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('hero_slides')
        .delete()
        .eq('id', slide.id);

      if (error) throw error;
      toast.success('Slide berhasil dihapus.');
      await fetchSlides();
    } catch (err: any) {
      toast.error('Gagal menghapus slide.');
    }
  };

  const moveSlide = async (index: number, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const current = slides[index];
    const target = slides[targetIndex];

    try {
      const { error: err1 } = await supabase
        .from('hero_slides')
        .update({ sort_order: target.sort_order })
        .eq('id', current.id);

      const { error: err2 } = await supabase
        .from('hero_slides')
        .update({ sort_order: current.sort_order })
        .eq('id', target.id);

      if (err1 || err2) throw err1 || err2;
      await fetchSlides();
    } catch (err: any) {
      toast.error('Gagal mengurutkan slide.');
    }
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlide, setNewSlide] = useState({
    title: '',
    subtitle: '',
    description: ''
  });
  const [newSlideFile, setNewSlideFile] = useState<File | null>(null);

  const addSlide = async () => {
    if (!isAdmin) return;
    if (!newSlideFile) {
      toast.error('Pilih gambar untuk slide baru.');
      return;
    }

    setSaving(true);
    try {
      setUploadingMap(prev => ({ ...prev, new: true }));
      const ext = newSlideFile.name.split('.').pop() || 'jpg';
      const fileName = `hero_slide_new_${Date.now()}.${ext}`;
      const imageUrl = await uploadHeroSlide(newSlideFile, fileName);
      setUploadingMap(prev => ({ ...prev, new: false }));

      const maxSort = slides.reduce((max, s) => Math.max(max, s.sort_order), -1);

      const { error } = await supabase
        .from('hero_slides')
        .insert({
          image_url: imageUrl,
          title: newSlide.title,
          subtitle: newSlide.subtitle,
          description: newSlide.description,
          sort_order: maxSort + 1
        });

      if (error) throw error;

      toast.success('Slide baru berhasil ditambahkan.');
      setShowAddForm(false);
      setNewSlide({ title: '', subtitle: '', description: '' });
      setNewSlideFile(null);
      await fetchSlides();
    } catch (err: any) {
      console.error('Error adding slide:', err);
      toast.error(err.message || 'Gagal menambahkan slide.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">Daftar Slide</span>
          <span className="text-xs text-slate-400 dark:text-zinc-500 ml-1">
            ({slides.filter(s => s.is_active).length} aktif dari {slides.length})
          </span>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Slide
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-emerald-50/50 dark:bg-zinc-900 border border-emerald-100 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Slide Baru</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Gambar *</label>
              <ImageUpload
                value={newSlideFile}
                onChange={(f) => setNewSlideFile(f)}
                loading={!!uploadingMap['new']}
                shape="square"
                label=""
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Judul</label>
                <input
                  type="text"
                  value={newSlide.title}
                  onChange={(e) => setNewSlide(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  placeholder="Nama program"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Subjudul</label>
                <input
                  type="text"
                  value={newSlide.subtitle}
                  onChange={(e) => setNewSlide(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  placeholder="Tagline singkat"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi</label>
                <textarea
                  value={newSlide.description}
                  onChange={(e) => setNewSlide(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Deskripsi singkat"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={addSlide}
              disabled={saving || !newSlideFile}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Simpan Slide Baru
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewSlideFile(null); }}
              className="text-xs font-semibold text-slate-500 px-3 py-2 hover:text-slate-700 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {slides.length === 0 && !showAddForm && (
        <div className="text-center py-12 text-slate-400 dark:text-zinc-500 text-sm">
          Belum ada slide. Klik "Tambah Slide" untuk memulai.
        </div>
      )}

      <div className="space-y-3">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${
              !slide.is_active
                ? 'border-slate-200 dark:border-zinc-800 opacity-60'
                : editingId === slide.id
                  ? 'border-emerald-300 dark:border-emerald-700 shadow-md'
                  : 'border-slate-200 dark:border-zinc-800'
            }`}
          >
            {editingId === slide.id ? (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Edit Slide</h4>
                  <button onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-600">Batal</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Gambar</label>
                    <ImageUpload
                      value={editNewImage || editForm.image_url}
                      onChange={(f) => setEditNewImage(f)}
                      loading={!!uploadingMap[slide.id]}
                      shape="square"
                      label=""
                    />
                  </div>
                  <div className="md:col-span-3 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Judul</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Subjudul</label>
                      <input
                        type="text"
                        value={editForm.subtitle}
                        onChange={(e) => setEditForm(prev => ({ ...prev, subtitle: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => saveSlide(slide)}
                    disabled={saving}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4 p-4">
                <div className="flex items-center gap-2 pt-1">
                  <GripVertical className="h-4 w-4 text-slate-300 dark:text-zinc-600 cursor-grab" />
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveSlide(index, 'up')}
                      disabled={!isAdmin || index === 0}
                      className="text-slate-300 hover:text-slate-600 dark:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveSlide(index, 'down')}
                      disabled={!isAdmin || index === slides.length - 1}
                      className="text-slate-300 hover:text-slate-600 dark:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0">
                  <img
                    src={slide.image_url}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{slide.title || '(tanpa judul)'}</h4>
                    {!slide.is_active && (
                      <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Nonaktif</span>
                    )}
                  </div>
                  {slide.subtitle && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{slide.subtitle}</p>
                  )}
                  {slide.description && (
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 line-clamp-1 mt-0.5">{slide.description}</p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(slide)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      title={slide.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {slide.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => startEdit(slide)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSlide(slide)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
