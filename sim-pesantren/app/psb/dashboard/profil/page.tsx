'use client';

import { useEffect, useState } from 'react';
import { getMyProfil, updateProfilCalonSantri } from '@/services/ppdb-actions';
import { uploadDokumenCalonSantri } from '@/services/storage-actions';
import { CalonSantri, GelombangPendaftaran } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, AlertCircle, CheckCircle2, UserCircle, MapPin, Users, ClipboardList, Activity } from 'lucide-react';
import { toast } from 'sonner';

type TabType = 'identitas' | 'alamat' | 'ortu' | 'penunjang' | 'fisik';

export default function ProfilPage() {
  const [data, setData] = useState<CalonSantri | null>(null);
  const [gelombangList, setGelombangList] = useState<GelombangPendaftaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [activeTab, setActiveTab] = useState<TabType>('identitas');
  const [uploadingDoc, setUploadingDoc] = useState<Record<string, boolean>>({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const res = await getMyProfil();
    if (res.data) { setData(res.data); setForm(res.data); }
    const { data: gel } = await supabase.from('gelombang_pendaftaran').select('*').eq('aktif', true).order('tanggal_mulai', { ascending: true });
    if (gel) setGelombangList(gel);
    setLoading(false);
  }

  async function handleFileUpload(key: string, file: File) {
    if (!file) return;
    setUploadingDoc((prev) => ({ ...prev, [key]: true }));
    try {
      const extension = file.name.split('.').pop() || 'png';
      const uniqueName = `doc_${form.id || 'new'}_${key}_${Date.now()}.${extension}`;
      const publicUrl = await uploadDokumenCalonSantri(file, uniqueName);
      setForm((prev: any) => ({ ...prev, [key]: publicUrl }));
      toast.success(`Berhasil mengunggah dokumen!`);
    } catch (err: any) {
      toast.error(`Gagal mengunggah file: ${err.message}`);
    } finally {
      setUploadingDoc((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    // Clean up fields to match expected database types
    const payload = {
      ...form,
      anak_ke: form.anak_ke ? parseInt(form.anak_ke) : null,
      jml_saudara_kandung: form.jml_saudara_kandung ? parseInt(form.jml_saudara_kandung) : null,
      tahun_lahir_ayah: form.tahun_lahir_ayah ? parseInt(form.tahun_lahir_ayah) : null,
      tahun_lahir_ibu: form.tahun_lahir_ibu ? parseInt(form.tahun_lahir_ibu) : null,
      tahun_lahir_wali: form.tahun_lahir_wali ? parseInt(form.tahun_lahir_wali) : null,
      berat_badan: form.berat_badan ? parseInt(form.berat_badan) : null,
      tinggi_badan: form.tinggi_badan ? parseInt(form.tinggi_badan) : null,
      lingkar_kepala: form.lingkar_kepala ? parseInt(form.lingkar_kepala) : null,
      penerima_kip_kps: form.penerima_kip_kps === true || form.penerima_kip_kps === 'true',
      layak_pip: form.layak_pip === true || form.layak_pip === 'true',
    };

    const res = await updateProfilCalonSantri(payload);
    setSaving(false);
    if (res.error) {
      toast.error(`Gagal menyimpan data: ${res.error}`);
    } else {
      toast.success('Data profil berhasil disimpan!');
      loadData();
    }
  }

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
      <div className="h-64 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6">
        <div className="h-4 w-32 bg-slate-100 dark:bg-zinc-800 rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-slate-100 dark:bg-zinc-800 rounded-xl" />
          <div className="h-10 bg-slate-100 dark:bg-zinc-800 rounded-xl" />
          <div className="h-10 bg-slate-100 dark:bg-zinc-800 rounded-xl" />
          <div className="h-10 bg-slate-100 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    </div>
  );

  const inputClass = "w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm";
  const selectClass = "w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm";

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <UserCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Profil & Berkas</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">Lengkapi data diri dan upload dokumen pendaftaran</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-zinc-800 pb-px">
        {[
          { id: 'identitas', label: 'Identitas Pribadi', icon: UserCircle },
          { id: 'alamat', label: 'Alamat & Kontak', icon: MapPin },
          { id: 'ortu', label: 'Orang Tua & Wali', icon: Users },
          { id: 'penunjang', label: 'Data Penunjang', icon: ClipboardList },
          { id: 'fisik', label: 'Fisik', icon: Activity },
        ].map((tab) => {
          const ActiveIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 -mb-px ${
                isActive
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-transparent text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
              }`}
            >
              <ActiveIcon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tab 1: Identitas Pribadi */}
        {activeTab === 'identitas' && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Identitas Calon Santri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nama Lengkap</label>
                <input type="text" value={form.nama_lengkap || ''} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Jenis Kelamin</label>
                <select value={form.jenis_kelamin || ''} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })} className={selectClass}>
                  <option value="">Pilih</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">NIK</label>
                <input type="text" value={form.nik || ''} onChange={(e) => setForm({ ...form, nik: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">No. Kartu Keluarga (KK)</label>
                <input type="text" value={form.no_kk || ''} onChange={(e) => setForm({ ...form, no_kk: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">NISN</label>
                <input type="text" value={form.nisn || ''} onChange={(e) => setForm({ ...form, nisn: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Agama</label>
                <select value={form.agama || 'Islam'} onChange={(e) => setForm({ ...form, agama: e.target.value })} className={selectClass}>
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Budha">Budha</option>
                  <option value="Konghucu">Konghucu</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tempat Lahir</label>
                <input type="text" value={form.tempat_lahir || ''} onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tanggal Lahir</label>
                <input type="date" value={form.tanggal_lahir?.split('T')[0] || ''} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Anak Ke-</label>
                <input type="number" value={form.anak_ke || ''} onChange={(e) => setForm({ ...form, anak_ke: e.target.value })} className={inputClass} placeholder="Contoh: 1" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Jumlah Saudara Kandung</label>
                <input type="number" value={form.jml_saudara_kandung || ''} onChange={(e) => setForm({ ...form, jml_saudara_kandung: e.target.value })} className={inputClass} placeholder="Contoh: 2" />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Alamat & Kontak */}
        {activeTab === 'alamat' && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Domisili & Kontak</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Alamat Jalan / Dusun</label>
                <textarea value={form.alamat || ''} onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" rows={2} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">RT</label>
                <input type="text" value={form.rt || ''} onChange={(e) => setForm({ ...form, rt: e.target.value })} className={inputClass} placeholder="001" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">RW</label>
                <input type="text" value={form.rw || ''} onChange={(e) => setForm({ ...form, rw: e.target.value })} className={inputClass} placeholder="002" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Dusun</label>
                <input type="text" value={form.dusun || ''} onChange={(e) => setForm({ ...form, dusun: e.target.value })} className={inputClass} placeholder="Nama dusun" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Kelurahan / Desa</label>
                <input type="text" value={form.kelurahan || ''} onChange={(e) => setForm({ ...form, kelurahan: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Kecamatan</label>
                <input type="text" value={form.kecamatan || ''} onChange={(e) => setForm({ ...form, kecamatan: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Kode Pos</label>
                <input type="text" value={form.kode_pos || ''} onChange={(e) => setForm({ ...form, kode_pos: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Jenis Tinggal</label>
                <select value={form.jenis_tinggal || 'Bersama Orang Tua'} onChange={(e) => setForm({ ...form, jenis_tinggal: e.target.value })} className={selectClass}>
                  <option value="Bersama Orang Tua">Bersama Orang Tua</option>
                  <option value="Asrama">Asrama / Pondok</option>
                  <option value="Kos">Kos / Kontrak</option>
                  <option value="Wali">Bersama Wali</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Alat Transportasi</label>
                <input type="text" value={form.alat_transportasi || ''} onChange={(e) => setForm({ ...form, alat_transportasi: e.target.value })} className={inputClass} placeholder="Jalan kaki, sepeda, motor, dll" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Jarak ke Sekolah</label>
                <input type="text" value={form.jarak_ke_sekolah || ''} onChange={(e) => setForm({ ...form, jarak_ke_sekolah: e.target.value })} className={inputClass} placeholder="Misal: Kurang dari 1 km" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">No. HP (Aktif/WhatsApp)</label>
                <input type="text" value={form.no_hp || ''} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Alamat Email</label>
                <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} disabled />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Orang Tua & Wali */}
        {activeTab === 'ortu' && (
          <div className="space-y-6">
            {/* Data Ayah */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">A. Data Ayah Kandung</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nama Lengkap Ayah</label>
                  <input type="text" value={form.nama_ayah || ''} onChange={(e) => setForm({ ...form, nama_ayah: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">NIK Ayah</label>
                  <input type="text" value={form.nik_ayah || ''} onChange={(e) => setForm({ ...form, nik_ayah: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tahun Lahir Ayah</label>
                  <input type="number" value={form.tahun_lahir_ayah || ''} onChange={(e) => setForm({ ...form, tahun_lahir_ayah: e.target.value })} className={inputClass} placeholder="Contoh: 1980" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Pendidikan Terakhir Ayah</label>
                  <input type="text" value={form.pendidikan_ayah || ''} onChange={(e) => setForm({ ...form, pendidikan_ayah: e.target.value })} className={inputClass} placeholder="SD, SMP, SMA, S1, dll" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Pekerjaan Ayah</label>
                  <input type="text" value={form.pekerjaan_ayah || ''} onChange={(e) => setForm({ ...form, pekerjaan_ayah: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Penghasilan Ayah</label>
                  <select value={form.penghasilan_ayah || ''} onChange={(e) => setForm({ ...form, penghasilan_ayah: e.target.value })} className={selectClass}>
                    <option value="">Pilih</option>
                    <option value="< 1jt">&lt; Rp 1.000.000</option>
                    <option value="1-3jt">Rp 1.000.000 - 3.000.000</option>
                    <option value="3-5jt">Rp 3.000.000 - 5.000.000</option>
                    <option value="> 5jt">&gt; Rp 5.000.000</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Data Ibu */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">B. Data Ibu Kandung</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nama Lengkap Ibu</label>
                  <input type="text" value={form.nama_ibu || ''} onChange={(e) => setForm({ ...form, nama_ibu: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">NIK Ibu</label>
                  <input type="text" value={form.nik_ibu || ''} onChange={(e) => setForm({ ...form, nik_ibu: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tahun Lahir Ibu</label>
                  <input type="number" value={form.tahun_lahir_ibu || ''} onChange={(e) => setForm({ ...form, tahun_lahir_ibu: e.target.value })} className={inputClass} placeholder="Contoh: 1983" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Pendidikan Terakhir Ibu</label>
                  <input type="text" value={form.pendidikan_ibu || ''} onChange={(e) => setForm({ ...form, pendidikan_ibu: e.target.value })} className={inputClass} placeholder="SD, SMP, SMA, S1, dll" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Pekerjaan Ibu</label>
                  <input type="text" value={form.pekerjaan_ibu || ''} onChange={(e) => setForm({ ...form, pekerjaan_ibu: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Penghasilan Ibu</label>
                  <select value={form.penghasilan_ibu || ''} onChange={(e) => setForm({ ...form, penghasilan_ibu: e.target.value })} className={selectClass}>
                    <option value="">Pilih</option>
                    <option value="< 1jt">&lt; Rp 1.000.000</option>
                    <option value="1-3jt">Rp 1.000.000 - 3.000.000</option>
                    <option value="3-5jt">Rp 3.000.000 - 5.000.000</option>
                    <option value="> 5jt">&gt; Rp 5.000.000</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Data Wali */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">C. Data Wali (Opsional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nama Lengkap Wali</label>
                  <input type="text" value={form.nama_wali || ''} onChange={(e) => setForm({ ...form, nama_wali: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">NIK Wali</label>
                  <input type="text" value={form.nik_wali || ''} onChange={(e) => setForm({ ...form, nik_wali: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tahun Lahir Wali</label>
                  <input type="number" value={form.tahun_lahir_wali || ''} onChange={(e) => setForm({ ...form, tahun_lahir_wali: e.target.value })} className={inputClass} placeholder="Contoh: 1975" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Pendidikan Terakhir Wali</label>
                  <input type="text" value={form.pendidikan_wali || ''} onChange={(e) => setForm({ ...form, pendidikan_wali: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Pekerjaan Wali</label>
                  <input type="text" value={form.pekerjaan_wali || ''} onChange={(e) => setForm({ ...form, pekerjaan_wali: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Penghasilan Wali</label>
                  <select value={form.penghasilan_wali || ''} onChange={(e) => setForm({ ...form, penghasilan_wali: e.target.value })} className={selectClass}>
                    <option value="">Pilih</option>
                    <option value="< 1jt">&lt; Rp 1.000.000</option>
                    <option value="1-3jt">Rp 1.000.000 - 3.000.000</option>
                    <option value="3-5jt">Rp 3.000.000 - 5.000.000</option>
                    <option value="> 5jt">&gt; Rp 5.000.000</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Kontak Ortu */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">D. Kontak Orang Tua</h2>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">No. HP Orang Tua / Wali (WhatsApp)</label>
                <input type="text" value={form.no_hp_ortu || ''} onChange={(e) => setForm({ ...form, no_hp_ortu: e.target.value })} className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Data Penunjang */}
        {activeTab === 'penunjang' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4">
              <h2 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Gelombang & Jalur Pendaftaran</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Gelombang</label>
                  <select value={form.id_gelombang || ''} onChange={(e) => setForm({ ...form, id_gelombang: e.target.value })} className={selectClass}>
                    <option value="">Pilih gelombang</option>
                    {gelombangList.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Jalur</label>
                  <select value={form.jalur_pendaftaran || 'reguler'} onChange={(e) => {
                    const val = e.target.value;
                    setForm({ ...form, jalur_pendaftaran: val, jenis_afirmasi: val === 'afirmasi' ? form.jenis_afirmasi : null, jenis_prestasi: val === 'prestasi' ? form.jenis_prestasi : null });
                  }} className={selectClass}>
                    <option value="reguler">Reguler</option>
                    <option value="prestasi">Prestasi</option>
                    <option value="afirmasi">Afirmasi</option>
                  </select>
                </div>
                {form.jalur_pendaftaran === 'afirmasi' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Jenis Afirmasi</label>
                    <select value={form.jenis_afirmasi || ''} onChange={(e) => setForm({ ...form, jenis_afirmasi: e.target.value })} className={selectClass}>
                      <option value="">Pilih jenis</option>
                      <option value="yatim">Yatim</option>
                      <option value="piatu">Piatu</option>
                      <option value="yatim_piatu">Yatim Piatu</option>
                      <option value="dhuafa">Dhuafa (Kurang Mampu)</option>
                    </select>
                  </div>
                )}
                {form.jalur_pendaftaran === 'prestasi' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Jenis Prestasi</label>
                    <input type="text" value={form.jenis_prestasi || ''} onChange={(e) => setForm({ ...form, jenis_prestasi: e.target.value })}
                      className={inputClass} placeholder="Hafalan 5 Juz, Juara OSN, dll" />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4">
              <h2 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Sekolah & Administrasi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Asal Sekolah</label>
                  <input type="text" value={form.asal_sekolah || ''} onChange={(e) => setForm({ ...form, asal_sekolah: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">No. Registrasi Akta Lahir</label>
                  <input type="text" value={form.no_registrasi_akta_lahir || ''} onChange={(e) => setForm({ ...form, no_registrasi_akta_lahir: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nomor SKHUN</label>
                  <input type="text" value={form.skhun || ''} onChange={(e) => setForm({ ...form, skhun: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Penerima KIP/KPS?</label>
                  <select value={form.penerima_kip_kps === true || form.penerima_kip_kps === 'true' ? 'true' : 'false'} onChange={(e) => setForm({ ...form, penerima_kip_kps: e.target.value === 'true' })} className={selectClass}>
                    <option value="false">Tidak</option>
                    <option value="true">Ya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nama Bank (Jika ada)</label>
                  <input type="text" value={form.bank || ''} onChange={(e) => setForm({ ...form, bank: e.target.value })} className={inputClass} placeholder="BRI, BNI, Mandiri, dll" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">No. Rekening Bank</label>
                  <input type="text" value={form.no_rekening || ''} onChange={(e) => setForm({ ...form, no_rekening: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Layak PIP (Pendidikan)?</label>
                  <select value={form.layak_pip === true || form.layak_pip === 'true' ? 'true' : 'false'} onChange={(e) => setForm({ ...form, layak_pip: e.target.value === 'true' })} className={selectClass}>
                    <option value="false">Tidak</option>
                    <option value="true">Ya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Alasan Layak PIP</label>
                  <input type="text" value={form.alasan_layak_pip || ''} onChange={(e) => setForm({ ...form, alasan_layak_pip: e.target.value })} className={inputClass} placeholder="Misal: Kurang mampu" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4">
              <h2 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Berkas Lampiran (Unggah ke Storage)</h2>
              <p className="text-xs text-slate-400 dark:text-zinc-550">Pilih berkas Anda untuk diunggah langsung ke sistem storage aman kami.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Pas Foto', key: 'foto_url' },
                  { label: 'Scan Akte Kelahiran', key: 'scan_akte' },
                  { label: 'Scan Kartu Keluarga', key: 'scan_kk' },
                  { label: 'Scan KIP/KPS (Jika ada)', key: 'scan_kip' },
                  { label: 'Surat Keterangan Lainnya', key: 'surat_keterangan' },
                ].map((doc) => {
                  const url = form[doc.key];
                  const isLoading = uploadingDoc[doc.key];
                  return (
                    <div key={doc.key} className="p-4 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-950/20 space-y-3">
                      <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{doc.label}</label>
                      
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                          <span>Mengunggah berkas...</span>
                        </div>
                      ) : url ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                            <span className="font-semibold flex items-center gap-1.5 truncate">
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> Terunggah
                            </span>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline font-bold text-emerald-850 dark:text-emerald-400 shrink-0">
                              Lihat File &rarr;
                            </a>
                          </div>
                          {doc.key === 'foto_url' && (
                            <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-inner">
                              <img src={url} alt="Pas Foto" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <label className="inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold px-3 py-1.5 rounded-xl cursor-pointer transition-all text-xs shadow-sm">
                            Ganti Berkas
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(doc.key, file);
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center border border-dashed border-slate-350 dark:border-zinc-700 rounded-xl p-4 bg-white dark:bg-zinc-900 cursor-pointer hover:border-emerald-500 transition-colors">
                          <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">Pilih Berkas</span>
                          <span className="text-[10px] text-slate-400 mt-1">PDF, JPG, atau PNG (Maks 5MB)</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(doc.key, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Data Fisik */}
        {activeTab === 'fisik' && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Kondisi Fisik Calon Santri</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Berat Badan (kg)</label>
                <input type="number" value={form.berat_badan || ''} onChange={(e) => setForm({ ...form, berat_badan: e.target.value })} className={inputClass} placeholder="Misal: 45" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tinggi Badan (cm)</label>
                <input type="number" value={form.tinggi_badan || ''} onChange={(e) => setForm({ ...form, tinggi_badan: e.target.value })} className={inputClass} placeholder="Misal: 155" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Lingkar Kepala (cm)</label>
                <input type="number" value={form.lingkar_kepala || ''} onChange={(e) => setForm({ ...form, lingkar_kepala: e.target.value })} className={inputClass} placeholder="Misal: 54" />
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={saving}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Menyimpan...' : 'Simpan Data'}
        </button>
      </form>
    </div>
  );
}
