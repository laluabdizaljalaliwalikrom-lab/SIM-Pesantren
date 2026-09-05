'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { BroadcastMessage, BroadcastRecipient, BroadcastChannel, BroadcastAudience } from '@/types/database';
import { executeBroadcast, RecipientTargetItem } from '@/services/broadcast-actions';
import EmptyState from '@/components/empty-state';
import {
  Megaphone,
  Send,
  MessageSquare,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Eye,
  Filter,
  Layers,
  Sparkles,
  Phone,
  Clock,
  ChevronRight,
  HelpCircle,
  Smartphone,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export default function SiaranPage() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Form State
  const [judul, setJudul] = useState('');
  const [isiPesan, setIsPesan] = useState('');
  const [saluran, setSaluran] = useState<BroadcastChannel>('whatsapp');
  const [targetAudience, setTargetAudience] = useState<BroadcastAudience>('wali_santri');

  // Target Filter States
  const [sekolahList, setSekolahList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [selectedSekolah, setSelectedSekolah] = useState<string>('Semua');
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');
  const [selectedJabatan, setSelectedJabatan] = useState<string>('Semua');

  // Raw Database Pool
  const [santriList, setSantriList] = useState<any[]>([]);
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [loadingPool, setLoadingPool] = useState(true);

  // Custom Selection State (Checkbox ID list)
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [recipientSearch, setRecipientSearch] = useState('');

  // Sending progress
  const [isSending, setIsSending] = useState(false);

  // History state
  const [historyList, setHistoryList] = useState<BroadcastMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastMessage | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<BroadcastRecipient[]>([]);
  const [loadingModalDetail, setLoadingModalDetail] = useState(false);

  // Pesantren Name for Preview
  const [pesantrenName, setPesantrenName] = useState('Pesantren Al-Hikmah');

  // ── 1. Fetch Pool Data (Santri, Pegawai, Kelas, Sekolah) ──
  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        setLoadingPool(true);
        const [santriRes, pegawaiRes, sekolahRes, kelasRes, pesRes] = await Promise.all([
          supabase
            .from('santri')
            .select(`
              id,
              nis,
              nama_lengkap,
              hp,
              email,
              id_kelas_formal,
              nama_ayah,
              nama_ibu,
              nama_wali,
              wali:profiles!santri_id_wali_fkey(id, nama_lengkap, no_hp),
              kelas_formal:kelas!santri_id_kelas_formal_fkey(id, nama_kelas, id_sekolah)
            `)
            .order('nama_lengkap', { ascending: true }),
          supabase
            .from('pegawai')
            .select('id, nip, nama_lengkap, jabatan, no_hp, email, status')
            .eq('status', 'Aktif')
            .order('nama_lengkap', { ascending: true }),
          supabase.from('sekolah').select('id, nama_sekolah').order('nama_sekolah', { ascending: true }),
          supabase.from('kelas').select('id, nama_kelas, id_sekolah').order('nama_kelas', { ascending: true }),
          supabase.from('pesantren_profile').select('nama_pesantren').maybeSingle(),
        ]);

        if (ignore) return;

        if (santriRes.data) setSantriList(santriRes.data);
        if (pegawaiRes.data) setPegawaiList(pegawaiRes.data);
        if (sekolahRes.data) setSekolahList(sekolahRes.data);
        if (kelasRes.data) setKelasList(kelasRes.data);
        if (pesRes.data?.nama_pesantren) setPesantrenName(pesRes.data.nama_pesantren);
      } catch (err) {
        console.error('Error loading broadcast pool:', err);
      } finally {
        if (!ignore) setLoadingPool(false);
      }
    }

    void loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  // ── 2. Compute Target Recipients based on Audience & Filters ──
  const candidateRecipients = useMemo<RecipientTargetItem[]>(() => {
    if (targetAudience === 'wali_santri') {
      return santriList
        .filter((s) => {
          if (selectedSekolah !== 'Semua' && s.kelas_formal?.id_sekolah !== selectedSekolah) return false;
          if (selectedKelas !== 'Semua' && s.id_kelas_formal !== selectedKelas) return false;
          return true;
        })
        .map((s) => {
          const waliName = s.wali?.nama_lengkap || s.nama_wali || s.nama_ayah || s.nama_ibu || `Wali dari ${s.nama_lengkap}`;
          const waliPhone = s.wali?.no_hp || s.hp || null;
          return {
            id: s.id,
            nama: waliName,
            tipe: 'Wali Santri',
            nomorWa: waliPhone,
            email: s.email || null,
            nis_nip: s.nis,
            kelas_jabatan: s.kelas_formal?.nama_kelas || 'Santri',
          };
        });
    }

    if (targetAudience === 'santri') {
      return santriList
        .filter((s) => {
          if (selectedSekolah !== 'Semua' && s.kelas_formal?.id_sekolah !== selectedSekolah) return false;
          if (selectedKelas !== 'Semua' && s.id_kelas_formal !== selectedKelas) return false;
          return true;
        })
        .map((s) => ({
          id: s.id,
          nama: s.nama_lengkap,
          tipe: 'Santri',
          nomorWa: s.hp,
          email: s.email || null,
          nis_nip: s.nis,
          kelas_jabatan: s.kelas_formal?.nama_kelas || '-',
        }));
    }

    if (targetAudience === 'pegawai') {
      return pegawaiList
        .filter((p) => {
          if (selectedJabatan !== 'Semua' && p.jabatan !== selectedJabatan) return false;
          return true;
        })
        .map((p) => ({
          id: p.id,
          nama: p.nama_lengkap,
          tipe: 'Pegawai',
          nomorWa: p.no_hp,
          email: p.email || null,
          nis_nip: p.nip || '-',
          kelas_jabatan: p.jabatan || 'Pegawai',
        }));
    }

    // Target: Custom (Kombinasi semua, disaring pencarian)
    const all = [
      ...santriList.map((s) => ({
        id: s.id,
        nama: `${s.nama_lengkap} (Santri)`,
        tipe: 'Santri' as const,
        nomorWa: s.hp,
        email: s.email,
        nis_nip: s.nis,
        kelas_jabatan: s.kelas_formal?.nama_kelas,
      })),
      ...pegawaiList.map((p) => ({
        id: p.id,
        nama: `${p.nama_lengkap} (${p.jabatan || 'Pegawai'})`,
        tipe: 'Pegawai' as const,
        nomorWa: p.no_hp,
        email: p.email,
        nis_nip: p.nip,
        kelas_jabatan: p.jabatan,
      })),
    ];
    return all;
  }, [targetAudience, santriList, pegawaiList, selectedSekolah, selectedKelas, selectedJabatan]);

  // Filtered candidate for preview/checklist
  const filteredCandidates = useMemo(() => {
    if (!recipientSearch) return candidateRecipients;
    const q = recipientSearch.toLowerCase();
    return candidateRecipients.filter(
      (c) => c.nama.toLowerCase().includes(q) || (c.nis_nip && c.nis_nip.toLowerCase().includes(q))
    );
  }, [candidateRecipients, recipientSearch]);

  // Final List to be sent:
  const finalRecipientsToSend = useMemo(() => {
    if (targetAudience === 'custom') {
      return candidateRecipients.filter((c) => selectedRecipientIds.has(c.id));
    }
    return candidateRecipients;
  }, [targetAudience, candidateRecipients, selectedRecipientIds]);

  // ── 3. Fetch History List ──
  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('broadcast_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        if (error.code === '42P01') {
          setHistoryList([]);
          return;
        }
        throw error;
      }
      setHistoryList(data || []);
    } catch (err: unknown) {
      console.error('Error fetching broadcast history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      void fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Open Detail Modal
  const handleOpenDetailModal = async (broadcast: BroadcastMessage) => {
    setSelectedBroadcast(broadcast);
    setSelectedRecipients([]);
    setLoadingModalDetail(true);

    try {
      const { data } = await supabase
        .from('broadcast_recipients')
        .select('*')
        .eq('id_broadcast', broadcast.id)
        .order('created_at', { ascending: true });

      setSelectedRecipients(data || []);
    } catch (err) {
      console.error('Error fetching broadcast detail:', err);
    } finally {
      setLoadingModalDetail(false);
    }
  };

  // ── 4. Send Broadcast Handler ──
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!judul.trim()) {
      toast.error('Judul siaran wajib diisi.');
      return;
    }
    if (!isiPesan.trim()) {
      toast.error('Isi pesan siaran wajib diisi.');
      return;
    }
    if (finalRecipientsToSend.length === 0) {
      toast.error('Tidak ada target penerima yang dipilih.');
      return;
    }

    const confirmMsg = `Kirim siaran "${judul}" ke ${finalRecipientsToSend.length} penerima via ${saluran.toUpperCase()}?`;
    if (!confirm(confirmMsg)) return;

    try {
      setIsSending(true);
      toast.info('Memproses pengiriman siaran massal...');

      const result = await executeBroadcast({
        judul: judul.trim(),
        isiPesan: isiPesan.trim(),
        saluran,
        targetAudience,
        targetFilter: {
          sekolah: selectedSekolah,
          kelas: selectedKelas,
          jabatan: selectedJabatan,
        },
        recipients: finalRecipientsToSend,
      });

      if (!result.success) {
        throw new Error(result.error || 'Gagal mengirim siaran.');
      }

      toast.success(
        `Siaran selesai dikirim! Terkirim: ${result.totalSent}, Gagal: ${result.totalFailed}, Dilewati: ${result.totalSkipped}.`
      );

      // Reset form
      setJudul('');
      setIsPesan('');
      setSelectedRecipientIds(new Set());
      setActiveTab('history');
    } catch (err: unknown) {
      console.error('Error executing broadcast:', err);
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan sistem.';
      toast.error('Pengiriman gagal: ' + msg);
    } finally {
      setIsSending(false);
    }
  };

  // Helper placeholder insert
  const insertPlaceholder = (tag: string) => {
    setIsPesan((prev) => prev + ` ${tag} `);
  };

  // Live preview text for sample recipient
  const sampleRecipient = finalRecipientsToSend[0] || {
    nama: 'Bapak Ahmad Subari',
    nis_nip: '2024001',
    kelas_jabatan: 'VII-A',
  };

  const previewFormattedText = useMemo(() => {
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return isiPesan
      .replace(/\{nama\}/gi, sampleRecipient.nama)
      .replace(/\{nis_nip\}/gi, sampleRecipient.nis_nip || '-')
      .replace(/\{kelas_jabatan\}/gi, sampleRecipient.kelas_jabatan || '-')
      .replace(/\{pesantren\}/gi, pesantrenName)
      .replace(/\{tanggal\}/gi, today);
  }, [isiPesan, sampleRecipient, pesantrenName]);

  return (
    <div className="space-y-6">
      {/* ── Page Header (Sesuai Standar GEMINI.md) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Megaphone className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Siaran & Pengumuman Massal
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Kirim pengumuman resmi, surat edaran, dan notifikasi kegiatan via WhatsApp dan Email secara serentak.
          </p>
        </div>

        {/* Tab Navigation (Sesuai Standar GEMINI.md: Segmented Box Tab) */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'create'
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Buat Siaran Baru</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Riwayat Siaran</span>
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left Column: Form Siaran (7 cols) ── */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSendBroadcast} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
              
              {/* 1. Pilih Saluran Pengiriman */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2.5">
                  1. Saluran Pengiriman (Channel)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'whatsapp', label: 'WhatsApp Saja', icon: MessageSquare, desc: 'Gateway Fonnte' },
                    { id: 'email', label: 'Email Saja', icon: Mail, desc: 'HTML Announcement' },
                    { id: 'both', label: 'WhatsApp + Email', icon: Sparkles, desc: 'Keduanya Serentak' },
                  ].map((ch) => {
                    const isSelected = saluran === ch.id;
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setSaluran(ch.id as BroadcastChannel)}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-sm'
                            : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="h-5 w-5 mb-1.5 shrink-0" />
                        <span className="text-xs font-bold">{ch.label}</span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{ch.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Target Audience */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2.5">
                  2. Sasaran Penerima
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'wali_santri', label: 'Wali Santri' },
                    { id: 'santri', label: 'Santri Aktif' },
                    { id: 'pegawai', label: 'Pegawai & Guru' },
                    { id: 'custom', label: 'Pilih Manual' },
                  ].map((aud) => (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => setTargetAudience(aud.id as BroadcastAudience)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        targetAudience === aud.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-650 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {aud.label}
                    </button>
                  ))}
                </div>

                {/* Filter Tambahan jika Wali Santri atau Santri */}
                {(targetAudience === 'wali_santri' || targetAudience === 'santri') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200/70 dark:border-zinc-800">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter Lembaga / Sekolah:</span>
                      <select
                        value={selectedSekolah}
                        onChange={(e) => {
                          setSelectedSekolah(e.target.value);
                          setSelectedKelas('Semua');
                        }}
                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-700 dark:text-zinc-200"
                      >
                        <option value="Semua">-- Semua Lembaga --</option>
                        {sekolahList.map((s) => (
                          <option key={s.id} value={s.id}>{s.nama_sekolah}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter Kelas:</span>
                      <select
                        value={selectedKelas}
                        onChange={(e) => setSelectedKelas(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-700 dark:text-zinc-200"
                      >
                        <option value="Semua">-- Semua Kelas --</option>
                        {kelasList
                          .filter((k) => selectedSekolah === 'Semua' || k.id_sekolah === selectedSekolah)
                          .map((k) => (
                            <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Filter Tambahan jika Pegawai */}
                {targetAudience === 'pegawai' && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200/70 dark:border-zinc-800">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter Jabatan:</span>
                    <select
                      value={selectedJabatan}
                      onChange={(e) => setSelectedJabatan(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-700 dark:text-zinc-200"
                    >
                      <option value="Semua">-- Semua Jabatan --</option>
                      <option value="Ustadz">Ustadz / Ustadzah</option>
                      <option value="Guru Formal">Guru Formal</option>
                      <option value="Guru Mapel">Guru Mapel</option>
                      <option value="Pengasuh">Pengasuh</option>
                      <option value="Kepala Sekolah">Kepala Sekolah</option>
                      <option value="Kepala TU">Kepala TU</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 3. Subjek / Judul Pesan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  3. Judul / Perihal Siaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pemberitahuan Libur Ramadhan & Kepulangan Santri"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              {/* 4. Isi Pesan & Variabel Dinamis */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                    4. Isi Pesan Siaran <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Variabel Dinamis:</span>
                </div>

                {/* Quick Variable Tag Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  {[
                    { tag: '{nama}', desc: 'Nama Penerima' },
                    { tag: '{nis_nip}', desc: 'NIS/NIP' },
                    { tag: '{kelas_jabatan}', desc: 'Kelas/Jabatan' },
                    { tag: '{pesantren}', desc: 'Nama Pesantren' },
                    { tag: '{tanggal}', desc: 'Tgl Hari Ini' },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertPlaceholder(v.tag)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10.5px] font-mono font-bold hover:bg-emerald-100 transition-colors"
                      title={v.desc}
                    >
                      + {v.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={6}
                  placeholder={`Assalamu'alaikum Wr. Wb.\n\nDisampaikan kepada Yth. {nama},\n\nSehubungan dengan agenda kegiatan semester genap di {pesantren}, maka diberitahukan bahwa...\n\nWassalamu'alaikum Wr. Wb.`}
                  value={isiPesan}
                  onChange={(e) => setIsPesan(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed"
                  required
                />
              </div>

              {/* Action Button: Submit Siaran */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800">
                <div className="text-xs text-slate-500 dark:text-zinc-400">
                  Target terdeteksi: <strong className="text-slate-900 dark:text-white font-bold">{finalRecipientsToSend.length} kontak</strong>
                </div>

                <button
                  type="submit"
                  disabled={isSending || finalRecipientsToSend.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Mengirim Massal...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Kirim Siaran Sekarang</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* ── Right Column: Live Preview & Contact Checklist (5 cols) ── */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Message Simulator Preview */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  <span>Simulasi Tampilan Pesan</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 font-semibold uppercase">
                  {saluran === 'email' ? 'Email View' : 'WhatsApp Bubble'}
                </span>
              </div>

              {saluran === 'email' ? (
                // Email Preview Box
                <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-xs">
                  <div className="border-b border-slate-200 dark:border-zinc-800 pb-2 mb-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Subjek:</span>
                    <p className="font-bold text-slate-900 dark:text-white">{judul || '(Judul email pengumuman)'}</p>
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-zinc-300 mb-2">
                    Kepada Yth. {sampleRecipient.nama},
                  </p>
                  <p className="text-slate-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                    {previewFormattedText || 'Tulis isi pesan siaran di samping untuk melihat preview langsung.'}
                  </p>
                </div>
              ) : (
                // WhatsApp Chat Bubble Preview Box
                <div className="bg-[#e5ddd5] dark:bg-zinc-950 p-4 rounded-xl shadow-inner border border-slate-200/80 dark:border-zinc-800 min-h-[160px] flex flex-col justify-end">
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 rounded-2xl rounded-tl-none p-3.5 shadow-sm max-w-[90%] text-xs space-y-1.5 text-slate-800 dark:text-zinc-200">
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">{pesantrenName}</p>
                    <p className="font-semibold italic text-[11px] text-slate-500 dark:text-zinc-400 border-b border-slate-100 dark:border-zinc-800 pb-1">
                      {judul || 'Pemberitahuan Resmi'}
                    </p>
                    <p className="font-semibold text-[11.5px]">Kepada Yth. {sampleRecipient.nama}</p>
                    <p className="whitespace-pre-line text-[11.5px] leading-relaxed">
                      {previewFormattedText || 'Tulis pesan siaran Anda...'}
                    </p>
                    <div className="flex justify-end items-center gap-1 text-[9px] text-slate-400 pt-1">
                      <span>Baru saja</span>
                      <Check className="h-3 w-3 text-emerald-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Target Checklist & Contacts Preview */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Daftar Kontak ({candidateRecipients.length})
                  </h3>
                </div>

                {targetAudience === 'custom' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = new Set(candidateRecipients.map((c) => c.id));
                        setSelectedRecipientIds(allIds);
                      }}
                      className="text-[10px] text-emerald-600 font-bold hover:underline"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedRecipientIds(new Set())}
                      className="text-[10px] text-rose-500 font-bold hover:underline"
                    >
                      Kosongkan
                    </button>
                  </div>
                )}
              </div>

              {/* Search contacts within list */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari penerima..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400"
                />
              </div>

              {/* Scrollable contacts container */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                {loadingPool ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Memuat kontak pesantren...</div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Tidak ada kontak yang cocok.</div>
                ) : (
                  filteredCandidates.map((c) => {
                    const isChecked = targetAudience === 'custom' ? selectedRecipientIds.has(c.id) : true;
                    return (
                      <div key={c.id} className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 px-1 rounded-lg">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {targetAudience === 'custom' && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = new Set(selectedRecipientIds);
                                if (e.target.checked) next.add(c.id);
                                else next.delete(c.id);
                                setSelectedRecipientIds(next);
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          )}
                          <div className="truncate">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{c.nama}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {c.kelas_jabatan} &bull; {c.nomorWa ? `WA: ${c.nomorWa}` : 'Tidak ada WA'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {c.nomorWa && <span title="WhatsApp Tersedia" className="w-2 h-2 rounded-full bg-emerald-500" />}
                          {c.email && <span title="Email Tersedia" className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        // ── Tab 2: Riwayat Siaran (History) ──
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span>Rekam Jejak Siaran Pengumuman</span>
            </h3>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
              <span>Memuat riwayat siaran...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={Megaphone}
                title="Belum Ada Riwayat Siaran"
                description="Semua pengumuman massal via WhatsApp atau Email yang pernah dikirim akan tercatat di sini."
                action={{
                  label: '+ Buat Siaran Baru',
                  onClick: () => setActiveTab('create'),
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 w-36">Waktu Kirim</th>
                    <th className="py-3.5 px-4">Judul Siaran</th>
                    <th className="py-3.5 px-3 text-center">Saluran</th>
                    <th className="py-3.5 px-3">Target</th>
                    <th className="py-3.5 px-3 text-center">Statistik</th>
                    <th className="py-3.5 px-3 text-center w-20">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {historyList.map((item) => {
                    const dateStr = new Date(item.created_at).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                    const timeStr = new Date(item.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-850/40 transition-colors">
                        <td className="py-3 px-4 text-slate-600 dark:text-zinc-400 font-mono">
                          <div className="font-bold text-slate-800 dark:text-zinc-200">{timeStr}</div>
                          <div className="text-[10px] text-slate-400">{dateStr}</div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{item.judul}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{item.isi_pesan}</p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                              item.saluran === 'both'
                                ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                                : item.saluran === 'email'
                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                            }`}
                          >
                            {item.saluran}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 dark:text-zinc-300 capitalize">
                          {item.target_audience.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-2 text-[10px] font-bold">
                            <span className="text-emerald-600" title="Terkirim">{item.total_sent} Berhasil</span>
                            {item.total_failed > 0 && <span className="text-rose-500" title="Gagal">{item.total_failed} Gagal</span>}
                            {item.total_skipped > 0 && <span className="text-amber-500" title="Dilewati">{item.total_skipped} Dilewati</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleOpenDetailModal(item)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Rincian Penerima"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Detail Rincian Penerima Siaran ── */}
      {selectedBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedBroadcast(null)} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-emerald-600" />
                  <span>{selectedBroadcast.judul}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dikirim pada {new Date(selectedBroadcast.created_at).toLocaleString('id-ID')} via {selectedBroadcast.saluran.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setSelectedBroadcast(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200/70 dark:border-zinc-800 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Total Target</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white">{selectedBroadcast.total_target}</p>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">Terkirim</span>
                  <p className="text-base font-bold text-emerald-600">{selectedBroadcast.total_sent}</p>
                </div>
                <div>
                  <span className="text-[10px] text-rose-500 font-bold uppercase">Gagal</span>
                  <p className="text-base font-bold text-rose-500">{selectedBroadcast.total_failed}</p>
                </div>
                <div>
                  <span className="text-[10px] text-amber-500 font-bold uppercase">Dilewati</span>
                  <p className="text-base font-bold text-amber-500">{selectedBroadcast.total_skipped}</p>
                </div>
              </div>

              {/* Isi Pesan */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Konten Pesan:</span>
                <p className="mt-1 p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs whitespace-pre-line text-slate-700 dark:text-zinc-300 leading-relaxed">
                  {selectedBroadcast.isi_pesan}
                </p>
              </div>

              {/* Tabel Penerima */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Daftar Status Kontak Penerima:</span>
                {loadingModalDetail ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Memuat detail kontak...</div>
                ) : selectedRecipients.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">Tidak ada rincian penerima tercatat.</div>
                ) : (
                  <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-slate-400">
                        <tr>
                          <th className="py-2.5 px-3">Nama Penerima</th>
                          <th className="py-2.5 px-3">Kontak</th>
                          <th className="py-2.5 px-3 text-center">Status WA</th>
                          <th className="py-2.5 px-3 text-center">Status Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {selectedRecipients.map((r) => (
                          <tr key={r.id}>
                            <td className="py-2 px-3 font-semibold text-slate-800 dark:text-zinc-200">{r.nama_penerima}</td>
                            <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">{r.nomor_wa || r.email || '-'}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`text-[10px] font-bold ${r.status_wa === 'sent' ? 'text-emerald-600' : r.status_wa === 'failed' ? 'text-rose-500' : 'text-slate-400'}`}>
                                {r.status_wa}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`text-[10px] font-bold ${r.status_email === 'sent' ? 'text-blue-600' : r.status_email === 'failed' ? 'text-rose-500' : 'text-slate-400'}`}>
                                {r.status_email}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedBroadcast(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl font-bold text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
