'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Pegawai, JabatanPegawai, StatusPegawai } from '@/types/database';
import {
  Users,
  Search,
  Plus,
  Edit3,
  X,
  Loader2,
  UserCheck,
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BookOpen,
  Briefcase,
  ChevronDown,
  Eye,
  Building2,
  BadgeCheck,
  Shield,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import { uploadFotoPegawai } from '@/services/storage-actions';

// ─── Constants ────────────────────────────────────────────────────────────────

const JABATAN_LIST: JabatanPegawai[] = [
  'Ustadz',
  'Ustadzah',
  'Guru Formal',
  'Guru Non-Formal',
  'Pengasuh',
  'Administrasi',
  'Tenaga Kebersihan',
  'Keamanan',
  'Lainnya',
];

const STATUS_LIST: StatusPegawai[] = ['Aktif', 'Tidak Aktif', 'Cuti'];

/** Returns Tailwind classes for a jabatan badge */
const getJabatanStyle = (jabatan: JabatanPegawai) => {
  switch (jabatan) {
    case 'Ustadz':
    case 'Ustadzah':
      return {
        badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
        icon: <BookOpen className="h-3 w-3" />,
        avatar: 'from-emerald-400 to-emerald-600',
      };
    case 'Guru Formal':
    case 'Guru Non-Formal':
      return {
        badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
        icon: <GraduationCap className="h-3 w-3" />,
        avatar: 'from-blue-400 to-blue-600',
      };
    case 'Pengasuh':
      return {
        badge: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
        icon: <Shield className="h-3 w-3" />,
        avatar: 'from-violet-400 to-violet-600',
      };
    case 'Administrasi':
      return {
        badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
        icon: <Briefcase className="h-3 w-3" />,
        avatar: 'from-amber-400 to-amber-600',
      };
    default:
      return {
        badge: 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700',
        icon: <Sparkles className="h-3 w-3" />,
        avatar: 'from-slate-400 to-slate-600',
      };
  }
};

const getStatusStyle = (status: StatusPegawai) => {
  switch (status) {
    case 'Aktif':
      return 'bg-emerald-500';
    case 'Cuti':
      return 'bg-amber-500';
    default:
      return 'bg-slate-400 dark:bg-zinc-600';
  }
};

/** Generate initials avatar from a name */
const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// ─── Empty form factory ───────────────────────────────────────────────────────

const emptyForm = (): Omit<Pegawai, 'id' | 'created_at'> => ({
  nip: '',
  nama_lengkap: '',
  gelar_depan: '',
  gelar_belakang: '',
  jabatan: 'Ustadz',
  jenis_kelamin: 'L',
  tempat_lahir: '',
  tanggal_lahir: '',
  alamat: '',
  no_hp: '',
  email: '',
  foto_url: '',
  pendidikan_terakhir: '',
  spesialisasi: '',
  tanggal_bergabung: '',
  status: 'Aktif',
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PegawaiPage() {
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [jabatanFilter, setJabatanFilter] = useState<JabatanPegawai | 'Semua'>('Semua');
  const [statusFilter, setStatusFilter] = useState<StatusPegawai | 'Semua'>('Semua');

  // Form modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [formData, setFormData] = useState<Omit<Pegawai, 'id' | 'created_at'>>(emptyForm());
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Detail modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailPegawai, setDetailPegawai] = useState<Pegawai | null>(null);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pegawai')
        .select('*')
        .order('nama_lengkap', { ascending: true });
      if (error) throw error;
      setPegawaiList(data || []);
    } catch (err: any) {
      toast.error('Gagal memuat data pegawai: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived State ──────────────────────────────────────────────────────────
  const filtered = pegawaiList.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      p.nama_lengkap.toLowerCase().includes(q) ||
      (p.nip || '').includes(q) ||
      (p.jabatan || '').toLowerCase().includes(q);
    const matchJabatan = jabatanFilter === 'Semua' || p.jabatan === jabatanFilter;
    const matchStatus = statusFilter === 'Semua' || p.status === statusFilter;
    return matchSearch && matchJabatan && matchStatus;
  });

  const totalPegawai = pegawaiList.length;
  const totalUstadz = pegawaiList.filter(p => p.jabatan === 'Ustadz' || p.jabatan === 'Ustadzah').length;
  const totalGuruFormal = pegawaiList.filter(p => p.jabatan === 'Guru Formal').length;
  const totalAktif = pegawaiList.filter(p => p.status === 'Aktif').length;

  const openAdd = () => {
    setSelectedPegawai(null);
    setFormData(emptyForm());
    setFotoFile(null);
    setIsFormOpen(true);
  };

  const openEdit = (p: Pegawai) => {
    setSelectedPegawai(p);
    setFormData({
      nip: p.nip || '',
      nama_lengkap: p.nama_lengkap,
      gelar_depan: p.gelar_depan || '',
      gelar_belakang: p.gelar_belakang || '',
      jabatan: p.jabatan,
      jenis_kelamin: p.jenis_kelamin || 'L',
      tempat_lahir: p.tempat_lahir || '',
      tanggal_lahir: p.tanggal_lahir || '',
      alamat: p.alamat || '',
      no_hp: p.no_hp || '',
      email: p.email || '',
      foto_url: p.foto_url || '',
      pendidikan_terakhir: p.pendidikan_terakhir || '',
      spesialisasi: p.spesialisasi || '',
      tanggal_bergabung: p.tanggal_bergabung || '',
      status: p.status,
    });
    setFotoFile(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_lengkap.trim()) {
      toast.error('Nama lengkap tidak boleh kosong');
      return;
    }
    setIsSubmitting(true);
    
    let uploadedFotoUrl = formData.foto_url;
    if (fotoFile) {
      setUploadingFoto(true);
      try {
        const fileExt = fotoFile.name.split('.').pop() || 'jpg';
        const rawIdentifier = formData.nip?.trim() || formData.nama_lengkap.trim().replace(/\s+/g, '_');
        const uniqueFileName = `${rawIdentifier}.${fileExt}`;
        uploadedFotoUrl = await uploadFotoPegawai(fotoFile, uniqueFileName);
      } catch (uploadErr: any) {
        console.error('Gagal mengunggah foto:', uploadErr);
        toast.error('Gagal mengunggah foto pegawai: ' + uploadErr.message);
        setIsSubmitting(false);
        setUploadingFoto(false);
        return;
      } finally {
        setUploadingFoto(false);
      }
    }

    try {
      const payload = {
        ...formData,
        nip: formData.nip || null,
        gelar_depan: formData.gelar_depan || null,
        gelar_belakang: formData.gelar_belakang || null,
        tempat_lahir: formData.tempat_lahir || null,
        tanggal_lahir: formData.tanggal_lahir || null,
        alamat: formData.alamat || null,
        no_hp: formData.no_hp || null,
        email: formData.email || null,
        foto_url: uploadedFotoUrl || null,
        pendidikan_terakhir: formData.pendidikan_terakhir || null,
        spesialisasi: formData.spesialisasi || null,
        tanggal_bergabung: formData.tanggal_bergabung || null,
      };

      if (selectedPegawai) {
        const { error } = await supabase.from('pegawai').update(payload).eq('id', selectedPegawai.id);
        if (error) throw error;
        toast.success('Data pegawai berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('pegawai').insert([payload]);
        if (error) throw error;
        toast.success('Pegawai baru berhasil ditambahkan!');
      }
      setIsFormOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error('Gagal menyimpan data: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (p: Pegawai) => {
    if (!confirm(`Hapus data ${p.nama_lengkap}? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const { error } = await supabase.from('pegawai').delete().eq('id', p.id);
      if (error) throw error;
      toast.success('Pegawai berhasil dihapus.');
      await fetchData();
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const openDetail = (p: Pegawai) => {
    setDetailPegawai(p);
    setIsDetailOpen(true);
  };

  const setField = <K extends keyof typeof formData>(key: K, val: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  // ── Display name helper ────────────────────────────────────────────────────
  const fullDisplayName = (p: Pegawai) => {
    const parts = [p.gelar_depan, p.nama_lengkap, p.gelar_belakang].filter(Boolean);
    return parts.join(' ');
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Data Kepegawaian
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
            Kelola data seluruh pegawai, ustadz, dan tenaga pendidik pesantren.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-95"
        >
          <Plus className="h-4 w-4" /> Tambah Pegawai
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Pegawai', value: totalPegawai, icon: <Users className="h-5 w-5" />, color: 'emerald' },
          { label: 'Ustadz / Ustadzah', value: totalUstadz, icon: <BookOpen className="h-5 w-5" />, color: 'violet' },
          { label: 'Guru Formal', value: totalGuruFormal, icon: <GraduationCap className="h-5 w-5" />, color: 'blue' },
          { label: 'Pegawai Aktif', value: totalAktif, icon: <UserCheck className="h-5 w-5" />, color: 'amber' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5"
          >
            <div className={`h-11 w-11 flex-shrink-0 rounded-xl flex items-center justify-center border ${
              stat.color === 'emerald'
                ? 'bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/10'
                : stat.color === 'violet'
                ? 'bg-violet-50 dark:bg-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-500/10'
                : stat.color === 'blue'
                ? 'bg-blue-50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/10'
                : 'bg-amber-50 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/10'
            }`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">{stat.label}</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{loading ? '—' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama, NIP, atau jabatan..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Jabatan Filter */}
        <div className="relative">
          <select
            value={jabatanFilter}
            onChange={e => setJabatanFilter(e.target.value as JabatanPegawai | 'Semua')}
            className="appearance-none pl-4 pr-9 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
          >
            <option value="Semua">Semua Jabatan</option>
            {JABATAN_LIST.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 items-center">
          {(['Semua', 'Aktif', 'Cuti', 'Tidak Aktif'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as StatusPegawai | 'Semua')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >{s}</button>
          ))}
        </div>
      </div>

      <div className="mb-8">
      {/* ── Results Count ── */}
      {!loading && (
        <p className="text-xs text-slate-400 dark:text-zinc-500 -mt-4">
          Menampilkan <strong className="text-slate-600 dark:text-zinc-300">{filtered.length}</strong> dari {totalPegawai} pegawai
        </p>
      )}
      </div>

      <div className="mb-8">
      {/* ── Employee Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-zinc-800 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-3/4 bg-slate-100 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="h-6 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full" />
              <div className="flex gap-2">
                <div className="h-8 flex-1 bg-slate-100 dark:bg-zinc-800 rounded-lg" />
                <div className="h-8 flex-1 bg-slate-100 dark:bg-zinc-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-20 text-center shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-zinc-700">
            <Users className="h-8 w-8 text-slate-300 dark:text-zinc-600" />
          </div>
          <h3 className="font-bold text-base text-slate-700 dark:text-zinc-200">Tidak Ada Data</h3>
          <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1 max-w-xs mx-auto">
            {searchTerm || jabatanFilter !== 'Semua' ? 'Tidak ada pegawai yang cocok dengan filter.' : 'Belum ada data pegawai. Silakan tambahkan.'}
          </p>
          {(!searchTerm && jabatanFilter === 'Semua') && (
            <button onClick={openAdd} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all">
              + Tambah Pegawai Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p) => {
            const style = getJabatanStyle(p.jabatan);
            const displayName = fullDisplayName(p);
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-4"
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-3.5">
                  {p.foto_url ? (
                    <Image
                      src={p.foto_url}
                      alt={p.nama_lengkap}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-full object-cover border-2 border-slate-100 dark:border-zinc-800 flex-shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className={`h-14 w-14 rounded-full bg-gradient-to-br ${style.avatar} flex items-center justify-center flex-shrink-0 shadow-sm text-white font-extrabold text-base select-none`}>
                      {getInitials(p.nama_lengkap)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight truncate">
                        {displayName}
                      </h3>
                      {p.status === 'Aktif' && (
                        <span className="relative flex h-2 w-2 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>
                    {p.nip && (
                      <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 mt-0.5 truncate">NIP: {p.nip}</p>
                    )}
                  </div>
                </div>

                {/* Jabatan Badge + Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${style.badge}`}>
                    {style.icon}
                    {p.jabatan}
                  </span>
                  <span className={`flex items-center gap-1 text-[10px] font-bold ${
                    p.status === 'Aktif' ? 'text-emerald-600 dark:text-emerald-400' :
                    p.status === 'Cuti' ? 'text-amber-600 dark:text-amber-400' :
                    'text-slate-400 dark:text-zinc-500'
                  }`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${getStatusStyle(p.status)}`} />
                    {p.status}
                  </span>
                </div>

                {/* Specialization / Subject */}
                {p.spesialisasi && (
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    {p.spesialisasi}
                  </p>
                )}

                {/* Quick Contact */}
                <div className="flex gap-2">
                  {p.no_hp ? (
                    <a
                      href={`https://wa.me/62${p.no_hp.replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                      title={`WhatsApp: ${p.no_hp}`}
                    >
                      <Phone className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-zinc-800/60 text-slate-300 dark:text-zinc-600 border border-slate-200 dark:border-zinc-800 rounded-xl text-[11px] font-bold cursor-not-allowed">
                      <Phone className="h-3.5 w-3.5" /> WhatsApp
                    </div>
                  )}
                  {p.email ? (
                    <a
                      href={`mailto:${p.email}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-xl text-[11px] font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                      title={`Email: ${p.email}`}
                    >
                      <Mail className="h-3.5 w-3.5" /> Email
                    </a>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-zinc-800/60 text-slate-300 dark:text-zinc-600 border border-slate-200 dark:border-zinc-800 rounded-xl text-[11px] font-bold cursor-not-allowed">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-zinc-800/80 -mx-1" />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openDetail(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-slate-600 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-500/20 rounded-xl text-xs font-bold transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/5"
                  >
                    <Eye className="h-3.5 w-3.5" /> Detail
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-slate-600 dark:text-zinc-400 hover:text-blue-700 dark:hover:text-blue-400 border border-slate-200 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-500/20 rounded-xl text-xs font-bold transition-all hover:bg-blue-50 dark:hover:bg-blue-500/5"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>

      <div className="mb-8">
      {/* ════════════════════════════════════════════════════════════════
          ── Add / Edit Pegawai Modal
         ════════════════════════════════════════════════════════════════ */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between flex-shrink-0 bg-slate-50/60 dark:bg-zinc-950/40">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedPegawai ? `Edit — ${selectedPegawai.nama_lengkap}` : 'Tambah Pegawai Baru'}
                </h2>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Lengkapi informasi kepegawaian di bawah ini.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
              <div className="p-6 space-y-6">

                <div className="flex justify-center mb-4">
                  <ImageUpload
                    value={fotoFile || formData.foto_url}
                    onChange={(file) => setFotoFile(file)}
                    loading={uploadingFoto}
                    shape="circle"
                    label="Foto Profil Pegawai"
                  />
                </div>

                {/* Section: Identitas */}
                <fieldset className="space-y-4">
                  <legend className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest pb-2 border-b border-slate-100 dark:border-zinc-800 w-full">
                    Identitas Pegawai
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Gelar Depan</label>
                      <input type="text" placeholder="Cth: Dr., Drs., Ustadz" value={formData.gelar_depan || ''} onChange={e => setField('gelar_depan', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Gelar Belakang</label>
                      <input type="text" placeholder="Cth: S.Pd., M.Ag." value={formData.gelar_belakang || ''} onChange={e => setField('gelar_belakang', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Nama Lengkap <span className="text-rose-500">*</span></label>
                    <input type="text" required placeholder="Nama tanpa gelar" value={formData.nama_lengkap} onChange={e => setField('nama_lengkap', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">NIP</label>
                      <input type="text" placeholder="Nomor Induk Pegawai" value={formData.nip || ''} onChange={e => setField('nip', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Jenis Kelamin</label>
                      <div className="flex gap-2">
                        {[['L', 'Laki-laki'], ['P', 'Perempuan']].map(([val, lbl]) => (
                          <button key={val} type="button"
                            onClick={() => setField('jenis_kelamin', val as 'L' | 'P')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                              formData.jenis_kelamin === val
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-emerald-400'
                            }`}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Tempat Lahir</label>
                      <input type="text" placeholder="Kota/Kabupaten" value={formData.tempat_lahir || ''} onChange={e => setField('tempat_lahir', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Tanggal Lahir</label>
                      <input type="date" value={formData.tanggal_lahir || ''} onChange={e => setField('tanggal_lahir', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all" />
                    </div>
                  </div>
                </fieldset>

                {/* Section: Jabatan & Status */}
                <fieldset className="space-y-4">
                  <legend className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest pb-2 border-b border-slate-100 dark:border-zinc-800 w-full">
                    Jabatan & Status
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Jabatan <span className="text-rose-500">*</span></label>
                      <select required value={formData.jabatan} onChange={e => setField('jabatan', e.target.value as JabatanPegawai)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all">
                        {JABATAN_LIST.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Status Kepegawaian</label>
                      <div className="flex gap-2">
                        {STATUS_LIST.map(s => (
                          <button key={s} type="button"
                            onClick={() => setField('status', s)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                              formData.status === s
                                ? s === 'Aktif'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : s === 'Cuti'
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : 'bg-slate-500 text-white border-slate-500'
                                : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400'
                            }`}>{s}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Pendidikan Terakhir</label>
                      <input type="text" placeholder="Cth: S2 Pendidikan Islam" value={formData.pendidikan_terakhir || ''} onChange={e => setField('pendidikan_terakhir', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Spesialisasi / Mapel</label>
                      <input type="text" placeholder="Cth: Fiqih, Matematika" value={formData.spesialisasi || ''} onChange={e => setField('spesialisasi', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Tanggal Bergabung</label>
                    <input type="date" value={formData.tanggal_bergabung || ''} onChange={e => setField('tanggal_bergabung', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all" />
                  </div>
                </fieldset>

                {/* Section: Kontak */}
                <fieldset className="space-y-4">
                  <legend className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest pb-2 border-b border-slate-100 dark:border-zinc-800 w-full">
                    Kontak & Lokasi
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Nomor HP / WhatsApp</label>
                      <input type="tel" placeholder="08xxxxxxxxxx" value={formData.no_hp || ''} onChange={e => setField('no_hp', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Email</label>
                      <input type="email" placeholder="nama@email.com" value={formData.email || ''} onChange={e => setField('email', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Alamat Lengkap</label>
                    <textarea rows={2} placeholder="Jl. Contoh No. 1, Kelurahan, Kecamatan, Kota" value={formData.alamat || ''} onChange={e => setField('alamat', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all resize-none" />
                  </div>
                  
                </fieldset>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-zinc-900/50 flex-shrink-0">
                {selectedPegawai && (
                  <button
                    type="button"
                    onClick={() => { setIsFormOpen(false); handleDelete(selectedPegawai); }}
                    className="px-4 py-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-all"
                  >
                    Hapus Pegawai
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button type="button" onClick={() => setIsFormOpen(false)}
                    className="px-5 py-2.5 bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-bold text-xs transition-colors">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/10 transition-all flex items-center gap-1.5 disabled:opacity-60">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {selectedPegawai ? 'Simpan Perubahan' : 'Tambahkan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ── Detail Pegawai Modal
         ════════════════════════════════════════════════════════════════ */}
      {isDetailOpen && detailPegawai && (() => {
        const p = detailPegawai;
        const style = getJabatanStyle(p.jabatan);
        const displayName = fullDisplayName(p);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)} />
            <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Detail Header */}
              <div className={`bg-gradient-to-br ${style.avatar} px-6 pt-8 pb-6 relative`}>
                <button onClick={() => setIsDetailOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-end gap-4">
                  {p.foto_url ? (
                    <Image
                      src={p.foto_url}
                      alt={p.nama_lengkap}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-2xl object-cover border-4 border-white/30 shadow-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-white/20 border-4 border-white/30 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg flex-shrink-0 select-none">
                      {getInitials(p.nama_lengkap)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-extrabold text-white leading-tight">{displayName}</h2>
                    <p className="text-white/70 text-xs mt-0.5 font-mono">{p.nip ? `NIP: ${p.nip}` : 'Tanpa NIP'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                        {p.jabatan}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'Aktif' ? 'bg-emerald-400/30 text-emerald-100' :
                        p.status === 'Cuti' ? 'bg-amber-400/30 text-amber-100' :
                        'bg-white/20 text-white/70'
                      }`}>{p.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {/* Info rows */}
                {[
                  { icon: <GraduationCap className="h-4 w-4" />, label: 'Pendidikan', value: p.pendidikan_terakhir },
                  { icon: <BookOpen className="h-4 w-4" />, label: 'Spesialisasi', value: p.spesialisasi },
                  { icon: <Calendar className="h-4 w-4" />, label: 'Tanggal Bergabung', value: p.tanggal_bergabung ? new Date(p.tanggal_bergabung).toLocaleDateString('id-ID', { dateStyle: 'long' }) : null },
                  { icon: <Calendar className="h-4 w-4" />, label: 'Tanggal Lahir', value: p.tanggal_lahir ? `${p.tempat_lahir ? p.tempat_lahir + ', ' : ''}${new Date(p.tanggal_lahir).toLocaleDateString('id-ID', { dateStyle: 'long' })}` : p.tempat_lahir },
                  { icon: <Phone className="h-4 w-4" />, label: 'No. HP', value: p.no_hp },
                  { icon: <Mail className="h-4 w-4" />, label: 'Email', value: p.email },
                  { icon: <MapPin className="h-4 w-4" />, label: 'Alamat', value: p.alamat },
                ].filter(row => row.value).map(row => (
                  <div key={row.label} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center flex-shrink-0 border border-slate-100 dark:border-zinc-700">
                      {row.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">{row.label}</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">{row.value}</p>
                    </div>
                  </div>
                ))}

                {/* Quick Contacts */}
                <div className="flex gap-3 pt-2">
                  {p.no_hp && (
                    <a href={`https://wa.me/62${p.no_hp.replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                      <Phone className="h-3.5 w-3.5" /> Hubungi via WhatsApp
                    </a>
                  )}
                  {p.email && (
                    <a href={`mailto:${p.email}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                      <Mail className="h-3.5 w-3.5" /> Kirim Email
                    </a>
                  )}
                </div>
              </div>

              {/* Detail Footer */}
              <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-3.5 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50 flex-shrink-0">
                <button onClick={() => setIsDetailOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                  Tutup
                </button>
                <button onClick={() => { setIsDetailOpen(false); openEdit(p); }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5" /> Edit Data
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </>
  );
}
