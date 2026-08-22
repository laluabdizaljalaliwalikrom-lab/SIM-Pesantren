'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getSantriListForAbsensi, saveSantriQrCode } from '@/services/absensi-santri-actions';
import type { Santri, PesantrenProfile, Kelas } from '@/types/database';
import {
  QrCode,
  Loader2,
  Printer,
  RefreshCw,
  ArrowLeft,
  Search,
  RotateCcw,
  Sparkles,
  Filter,
  ShieldCheck,
  CreditCard,
  Download,
  ChevronDown,
  ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import QRCodeLib from 'qrcode';

/* ─── Helpers: Format Nama Pesantren ─── */
const formatNamaPesantren = (name?: string | null) => {
  if (!name) return 'SIM PESANTREN';
  const words = name.trim().split(/\s+/);
  if (words.length === 4) {
    return (
      <>
        {words[0]} {words[1]}
        <br />
        {words[2]} {words[3]}
      </>
    );
  }
  if (words.length > 2) {
    const half = Math.ceil(words.length / 2);
    return (
      <>
        {words.slice(0, half).join(' ')}
        <br />
        {words.slice(half).join(' ')}
      </>
    );
  }
  return name;
};

const formatNamaPesantrenString = (name?: string | null) => {
  if (!name) return 'SIM PESANTREN';
  const words = name.trim().split(/\s+/);
  if (words.length === 4) {
    return `${words[0]} ${words[1]}<br/>${words[2]} ${words[3]}`;
  }
  if (words.length > 2) {
    const half = Math.ceil(words.length / 2);
    return `${words.slice(0, half).join(' ')}<br/>${words.slice(half).join(' ')}`;
  }
  return name;
};

/* ─── Print CSS Standard 5.5 x 8.5 cm (55 x 85 mm) ─── */
const CARD_PRINT_CSS = `
@page { size: A4 portrait; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #1e293b; }
.page { width: 210mm; min-height: 297mm; padding: 12mm 10mm; display: flex; flex-direction: column; gap: 10mm; }
.row { display: flex; gap: 8mm; flex-wrap: wrap; justify-content: center; }

/* === Kartu ID Card Standard (5.5 x 8.5 cm) === */
.card {
  width: 55mm;
  height: 85mm;
  border-radius: 3.5mm;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 0.5pt solid #cbd5e1;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}

/* Header */
.card-header {
  background: linear-gradient(135deg, #065f46 0%, #047857 60%, #0284c7 100%);
  padding: 3mm 3mm 2.5mm;
  display: flex;
  align-items: center;
  gap: 2mm;
  border-bottom: 1.5pt solid #f59e0b;
}
.header-logo {
  width: 6.5mm;
  height: 6.5mm;
  object-fit: contain;
  background: #fff;
  border-radius: 1.2mm;
  padding: 0.4mm;
  flex-shrink: 0;
}
.header-logo-ph {
  width: 6.5mm;
  height: 6.5mm;
  background: #f59e0b;
  border-radius: 1.2mm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3mm;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}
.header-text {
  flex: 1;
  text-align: center;
  min-width: 0;
}
.header-inst {
  font-size: 2mm;
  font-weight: 800;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.2pt;
  line-height: 1.25;
}

/* Body Container */
.card-body {
  flex: 1;
  padding: 3mm 3mm 2.5mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  background: radial-gradient(circle at 100% 100%, #ecfdf5 0%, #f0fdf4 40%, #ffffff 80%);
  position: relative;
}

/* Photo */
.photo-wrap {
  width: 23mm;
  height: 23mm;
  border-radius: 1.8mm;
  overflow: hidden;
  border: 0.6pt solid #cbd5e1;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  background: #f1f5f9;
  position: relative;
}
.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
}
.photo-ph {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7mm;
  font-weight: 800;
  color: #047857;
  background: #d1fae5;
}

/* Info */
.info-wrap {
  text-align: center;
  width: 100%;
}
.santri-name {
  font-size: 2.5mm;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
  line-height: 1.2;
  margin-bottom: 0.8mm;
  max-width: 48mm;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.santri-nisn {
  font-size: 1.7mm;
  font-weight: 700;
  color: #d97706;
  font-family: 'Courier New', Courier, monospace;
  letter-spacing: 0.3pt;
  margin-bottom: 0.8mm;
}
.santri-school {
  font-size: 1.25mm;
  font-weight: 700;
  color: #047857;
  text-transform: uppercase;
  white-space: nowrap;
  letter-spacing: -0.1pt;
}

/* QR Code */
.qr-wrap {
  background: #ffffff;
  padding: 1mm;
  border-radius: 1.8mm;
  border: 0.6pt solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qr-img {
  width: 25mm;
  height: 25mm;
  display: block;
}

@media print {
  body { margin: 0; background: #fff; }
  .card { box-shadow: none; border: 0.5pt solid #94a3b8; }
}
`;

interface CardFlipProps {
  santri: Santri;
  profile: PesantrenProfile | null;
  isFlipped: boolean;
  onFlip: () => void;
}

function CardPreview({ santri, profile, isFlipped, onFlip }: CardFlipProps) {
  const initials = santri.nama_lengkap
    ? santri.nama_lengkap
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'S';

  const sekolahNama = (santri as any).kelas_formal?.sekolah?.nama_sekolah || (santri as any).sekolah_asal || 'SIM PESANTREN';

  return (
    <div
      className="group cursor-pointer select-none"
      style={{ perspective: '1200px' }}
      onClick={onFlip}
      title="Klik untuk membalik kartu"
    >
      <div
        className={`relative w-[220px] h-[340px] transition-transform duration-700 [transform-style:preserve-3d] ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* === SISI DEPAN (FRONT) === */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl overflow-hidden shadow-xl border border-emerald-100 dark:border-slate-800 flex flex-col bg-gradient-to-b from-white via-emerald-50/40 to-teal-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40 text-slate-900 dark:text-white">
          
          {/* Abstract Geometric Waves & Watermark */}
          <svg className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-20 dark:opacity-10 z-0" viewBox="0 0 220 350" fill="none">
            <circle cx="210" cy="340" r="120" stroke="#059669" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="210" cy="340" r="90" stroke="#0284c7" strokeWidth="0.8" />
            <circle cx="210" cy="340" r="60" stroke="#d97706" strokeWidth="0.6" strokeDasharray="3 3" />
            <path d="M -20 180 C 40 140, 100 220, 240 160" stroke="#059669" strokeWidth="1.2" opacity="0.4" />
            <path d="M -20 200 C 50 160, 120 240, 240 180" stroke="#0284c7" strokeWidth="0.8" opacity="0.3" />
            <polygon points="10,340 35,290 60,340" stroke="#059669" strokeWidth="0.8" fill="none" opacity="0.3" />
            <circle cx="10" cy="80" r="45" stroke="#f59e0b" strokeWidth="0.7" strokeDasharray="2 2" opacity="0.4" />
          </svg>

          {/* Header Elegant Modern */}
          <div className="relative z-10 px-3 py-2.5 bg-gradient-to-r from-emerald-800 via-teal-800 to-sky-800 text-white flex items-center gap-2.5 border-b-2 border-amber-400">
            {profile?.logo_url ? (
              <Image
                src={profile.logo_url}
                alt="Logo"
                width={26}
                height={26}
                className="w-6 h-6 object-contain bg-white p-0.5 rounded-md shadow-sm shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-md bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shadow-sm shrink-0">
                P
              </div>
            )}
            <div className="flex-1 min-w-0 text-center">
              <h4 className="text-[9.5px] font-black text-white uppercase tracking-wide leading-tight drop-shadow-sm">
                {formatNamaPesantren(profile?.nama_pesantren)}
              </h4>
            </div>
          </div>

          {/* Body Clean with Abstract Details */}
          <div className="relative z-10 flex-1 p-3 flex flex-col items-center justify-between">
            
            {/* Foto Santri Persegi (1:1), Fokus Bagian Atas */}
            <div className="relative mt-0.5">
              <div className="w-[78px] h-[78px] rounded-lg overflow-hidden border border-emerald-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                {santri.foto_url ? (
                  <Image
                    src={santri.foto_url}
                    alt={santri.nama_lengkap}
                    width={78}
                    height={78}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center justify-center text-2xl">
                    {initials}
                  </div>
                )}
              </div>
            </div>

            {/* Detail Santri */}
            <div className="text-center w-full space-y-1">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide leading-tight line-clamp-2 px-1">
                {santri.nama_lengkap}
              </h3>
              
              <p className="text-[10px] font-bold font-mono text-amber-600 dark:text-amber-400 tracking-wider">
                NISN: {santri.nisn || santri.nis || '-'}
              </p>

              <p className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tight whitespace-nowrap px-0.5" title={sekolahNama}>
                {sekolahNama}
              </p>
            </div>

            {/* QR Code Container (Diperbesar) */}
            <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-xl border border-emerald-200/80 dark:border-slate-700 shadow-sm">
              {santri.qr_code_url ? (
                <img src={santri.qr_code_url} alt="QR Code" className="w-[88px] h-[88px] object-contain" />
              ) : (
                <div className="w-[88px] h-[88px] bg-slate-100 flex items-center justify-center text-slate-400 rounded-lg">
                  <QrCode className="w-8 h-8" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === SISI BELAKANG (BACK) === */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl overflow-hidden shadow-xl border border-emerald-100 dark:border-slate-800 flex flex-col bg-gradient-to-b from-white via-emerald-50/40 to-teal-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40 text-slate-900 dark:text-white">
          
          {/* Abstract Geometric Waves for Back */}
          <svg className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-20 dark:opacity-10 z-0" viewBox="0 0 220 350" fill="none">
            <circle cx="10" cy="340" r="110" stroke="#059669" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="210" cy="80" r="60" stroke="#0284c7" strokeWidth="0.8" />
            <path d="M 240 180 C 180 140, 120 220, -20 160" stroke="#059669" strokeWidth="1" opacity="0.3" />
          </svg>

          {/* Header Identik */}
          <div className="relative z-10 px-3 py-2.5 bg-gradient-to-r from-emerald-800 via-teal-800 to-sky-800 text-white flex items-center gap-2.5 border-b-2 border-amber-400">
            {profile?.logo_url ? (
              <Image
                src={profile.logo_url}
                alt="Logo"
                width={26}
                height={26}
                className="w-6 h-6 object-contain bg-white p-0.5 rounded-md shadow-sm shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-md bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shadow-sm shrink-0">
                P
              </div>
            )}
            <div className="flex-1 min-w-0 text-center">
              <h4 className="text-[9.5px] font-black text-white uppercase tracking-wide leading-tight drop-shadow-sm">
                {formatNamaPesantren(profile?.nama_pesantren)}
              </h4>
            </div>
          </div>

          {/* Body Belakang */}
          <div className="relative z-10 flex-1 p-3 flex flex-col justify-between">
            
            {/* Motto & Rules */}
            <div className="space-y-2.5">
              <div className="text-center border-b border-emerald-100 dark:border-slate-800 pb-2">
                <p className="text-[10px] font-serif font-bold text-amber-700 dark:text-amber-400 italic">
                  "Al-'Ilmu Nuurun wal Jahl 'Aarun"
                </p>
                <p className="text-[7.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Ilmu Adalah Cahaya, Adab di Atas Ilmu
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider text-[8px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Tata Tertib Kartu:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[7.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  <li>Kartu tanda pengenal resmi santri.</li>
                  <li>Wajib dibawa saat presensi & KBM.</li>
                  <li>Tidak dapat dipindahtangankan.</li>
                  <li>Jika menemukan, kembalikan ke Sekretariat.</li>
                </ul>
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-2 border-t border-emerald-100 dark:border-slate-800 flex justify-between items-end text-[8px]">
              <div>
                <p className="text-slate-400 font-bold uppercase text-[7px]">Pimpinan Pesantren</p>
                <p className="text-slate-900 dark:text-white font-extrabold mt-3 text-[8.5px] border-b border-slate-400 pb-0.5 inline-block">
                  {profile?.nama_pengasuh || 'Pimpinan Pesantren'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[7px] font-extrabold text-emerald-700 dark:text-emerald-400 tracking-wider">
                  SIM PESANTREN
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KartuSantriPage() {
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [profile, setProfile] = useState<PesantrenProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [downloadingPng, setDownloadingPng] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [santriRes, profileRes, kelasRes] = await Promise.all([
        getSantriListForAbsensi(selectedKelas || undefined),
        supabase.from('pesantren_profile').select('*').maybeSingle(),
        supabase.from('kelas').select('*').order('nama_kelas'),
      ]);

      if (santriRes.success) {
        setSantriList(santriRes.data || []);
      } else {
        toast.error(santriRes.error || 'Gagal memuat data santri');
      }

      if (profileRes.data) setProfile(profileRes.data as PesantrenProfile);
      if (kelasRes.data) setKelasList(kelasRes.data);
    } catch {
      toast.error('Terjadi kesalahan memuat data');
    } finally {
      setLoading(false);
    }
  }, [selectedKelas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdown(null);
        setBulkDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSingleGenerate = async (santri: Santri) => {
    try {
      setGenerating(santri.id);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const qrData = `${baseUrl}/absen-santri/scan?id=${santri.id}`;
      const dataUrl = await QRCodeLib.toDataURL(qrData, { width: 300, margin: 1 });

      const res = await saveSantriQrCode(santri.id, dataUrl);
      if (res.success) {
        toast.success(`QR Code santri ${santri.nama_lengkap} berhasil dibuat!`);
        setSantriList((prev) => prev.map((s) => (s.id === santri.id ? { ...s, qr_code_url: dataUrl } : s)));
      } else {
        toast.error(res.error || 'Gagal menyimpan QR');
      }
    } catch {
      toast.error('Gagal generate QR Code');
    } finally {
      setGenerating(null);
    }
  };

  const handleBulkGenerate = async () => {
    const listToGen = santriList.filter((s) => !s.qr_code_url);
    if (listToGen.length === 0) {
      toast.info('Semua santri sudah memiliki QR Code');
      return;
    }

    setGenerating('all');
    let successCount = 0;

    for (const s of listToGen) {
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const qrData = `${baseUrl}/absen-santri/scan?id=${s.id}`;
        const dataUrl = await QRCodeLib.toDataURL(qrData, { width: 300, margin: 1 });
        const res = await saveSantriQrCode(s.id, dataUrl);
        if (res.success) {
          successCount++;
          setSantriList((prev) => prev.map((x) => (x.id === s.id ? { ...x, qr_code_url: dataUrl } : x)));
        }
      } catch {
        // continue
      }
    }

    setGenerating(null);
    toast.success(`Berhasil membuat ${successCount} QR Code santri baru!`);
  };

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = santriList.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.nama_lengkap.toLowerCase().includes(q) || (s.nis && s.nis.toLowerCase().includes(q)) || (s.nisn && s.nisn.toLowerCase().includes(q));
  });

  /* ─── Exact WYSIWYG Card HTML Generator for PNG Export ─── */
  const buildExactCardHtml = (santri: Santri, side: 'front' | 'back') => {
    const initials = santri.nama_lengkap
      ? santri.nama_lengkap
          .split(/\s+/)
          .slice(0, 2)
          .map((n) => n[0])
          .join('')
          .toUpperCase()
      : 'S';
    const sekolahNama = (santri as any).kelas_formal?.sekolah?.nama_sekolah || (santri as any).sekolah_asal || 'SIM PESANTREN';

    if (side === 'front') {
      return `
      <div style="width:220px;height:340px;border-radius:16px;overflow:hidden;position:relative;display:flex;flex-direction:column;background:linear-gradient(to bottom, #ffffff 0%, #ecfdf5 40%, #ccfbf1 100%);color:#0f172a;border:1px solid #a7f3d0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        
        <!-- Abstract Geometric Waves & Watermark -->
        <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0.22;z-index:0;" viewBox="0 0 220 350" fill="none">
          <circle cx="210" cy="340" r="120" stroke="#059669" stroke-width="1" stroke-dasharray="4 4" />
          <circle cx="210" cy="340" r="90" stroke="#0284c7" stroke-width="0.8" />
          <circle cx="210" cy="340" r="60" stroke="#d97706" stroke-width="0.6" stroke-dasharray="3 3" />
          <path d="M -20 180 C 40 140, 100 220, 240 160" stroke="#059669" stroke-width="1.2" opacity="0.4" />
          <path d="M -20 200 C 50 160, 120 240, 240 180" stroke="#0284c7" stroke-width="0.8" opacity="0.3" />
          <polygon points="10,340 35,290 60,340" stroke="#059669" stroke-width="0.8" fill="none" opacity="0.3" />
          <circle cx="10" cy="80" r="45" stroke="#f59e0b" stroke-width="0.7" stroke-dasharray="2 2" opacity="0.4" />
        </svg>

        <!-- Header Elegant Modern -->
        <div style="position:relative;z-index:10;padding:10px 12px;background:linear-gradient(to right, #065f46, #115e59, #075985);color:#ffffff;display:flex;align-items:center;gap:10px;border-bottom:2px solid #f59e0b;">
          ${profile?.logo_url ? `<img src="${profile.logo_url}" style="width:26px;height:26px;object-fit:contain;background:#ffffff;padding:2px;border-radius:6px;flex-shrink:0;box-shadow:0 1px 2px rgba(0,0,0,0.1);"/>` : `<div style="width:26px;height:26px;border-radius:6px;background:#f59e0b;color:#020617;font-weight:900;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">P</div>`}
          <div style="flex:1;min-width:0;text-align:center;">
            <h4 style="font-size:9.5px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:0.3px;line-height:1.2;margin:0;">
              ${formatNamaPesantrenString(profile?.nama_pesantren)}
            </h4>
          </div>
        </div>

        <!-- Body -->
        <div style="position:relative;z-index:10;flex:1;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;box-sizing:border-box;">
          
          <!-- Foto Santri Persegi 1:1, object-top -->
          <div style="margin-top:2px;">
            <div style="width:78px;height:78px;border-radius:8px;overflow:hidden;border:1px solid #a7f3d0;box-shadow:0 1px 3px rgba(0,0,0,0.1);background:#ffffff;">
              ${santri.foto_url ? `<img src="${santri.foto_url}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block;"/>` : `<div style="width:100%;height:100%;background:#ecfdf5;color:#047857;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:24px;">${initials}</div>`}
            </div>
          </div>

          <!-- Detail Santri -->
          <div style="text-align:center;width:100%;margin:4px 0;">
            <h3 style="font-size:12px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.3px;line-height:1.2;margin:0 0 3px 0;max-width:196px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${santri.nama_lengkap}
            </h3>
            <div style="font-size:10px;font-weight:700;font-family:'Courier New',Courier,monospace;color:#d97706;letter-spacing:0.5px;margin-bottom:3px;">
              NISN: ${santri.nisn || santri.nis || '-'}
            </div>
            <div style="font-size:8px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:-0.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${sekolahNama}
            </div>
          </div>

          <!-- QR Code Container -->
          <div style="background:rgba(255,255,255,0.95);padding:6px;border-radius:12px;border:1px solid rgba(167,243,208,0.8);box-shadow:0 1px 3px rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:center;">
            ${santri.qr_code_url ? `<img src="${santri.qr_code_url}" style="width:88px;height:88px;object-fit:contain;display:block;"/>` : `<div style="width:88px;height:88px;background:#f1f5f9;border-radius:8px;"></div>`}
          </div>
        </div>
      </div>`;
    }

    // Sisi Belakang (Back)
    return `
    <div style="width:220px;height:340px;border-radius:16px;overflow:hidden;position:relative;display:flex;flex-direction:column;background:linear-gradient(to bottom, #ffffff 0%, #ecfdf5 40%, #ccfbf1 100%);color:#0f172a;border:1px solid #a7f3d0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      
      <!-- Abstract Geometric Waves Back -->
      <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0.22;z-index:0;" viewBox="0 0 220 350" fill="none">
        <circle cx="10" cy="340" r="110" stroke="#059669" stroke-width="1" stroke-dasharray="3 3" />
        <circle cx="210" cy="80" r="60" stroke="#0284c7" stroke-width="0.8" />
        <path d="M 240 180 C 180 140, 120 220, -20 160" stroke="#059669" stroke-width="1" opacity="0.3" />
      </svg>

      <!-- Header Identik -->
      <div style="position:relative;z-index:10;padding:10px 12px;background:linear-gradient(to right, #065f46, #115e59, #075985);color:#ffffff;display:flex;align-items:center;gap:10px;border-bottom:2px solid #f59e0b;">
        ${profile?.logo_url ? `<img src="${profile.logo_url}" style="width:26px;height:26px;object-fit:contain;background:#ffffff;padding:2px;border-radius:6px;flex-shrink:0;box-shadow:0 1px 2px rgba(0,0,0,0.1);"/>` : `<div style="width:26px;height:26px;border-radius:6px;background:#f59e0b;color:#020617;font-weight:900;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">P</div>`}
        <div style="flex:1;min-width:0;text-align:center;">
          <h4 style="font-size:9.5px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:0.3px;line-height:1.2;margin:0;">
            ${formatNamaPesantrenString(profile?.nama_pesantren)}
          </h4>
        </div>
      </div>

      <!-- Body Belakang -->
      <div style="position:relative;z-index:10;flex:1;padding:12px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;">
        
        <!-- Motto & Rules -->
        <div>
          <div style="text-align:center;border-bottom:1px solid #d1fae5;padding-bottom:8px;">
            <div style="font-size:10px;font-family:Georgia,serif;font-style:italic;font-weight:bold;color:#b45309;">
              "Al-'Ilmu Nuurun wal Jahl 'Aarun"
            </div>
            <div style="font-size:7.5px;font-weight:500;color:#64748b;margin-top:2px;">
              Ilmu Adalah Cahaya, Adab di Atas Ilmu
            </div>
          </div>

          <div style="margin-top:10px;">
            <div style="font-size:8px;font-weight:800;color:#065f46;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
              Tata Tertib Kartu:
            </div>
            <ul style="font-size:7.5px;color:#334155;line-height:1.45;margin:0;padding-left:14px;font-weight:500;">
              <li>Kartu tanda pengenal resmi santri.</li>
              <li>Wajib dibawa saat presensi & KBM.</li>
              <li>Tidak dapat dipindahtangankan.</li>
              <li>Jika menemukan, kembalikan ke Sekretariat.</li>
            </ul>
          </div>
        </div>

        <!-- Signature Area -->
        <div style="padding-top:8px;border-top:1px solid #d1fae5;display:flex;justify-content:space-between;align-items:flex-end;font-size:8px;">
          <div>
            <div style="font-size:7px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Pimpinan Pesantren</div>
            <div style="font-size:8.5px;font-weight:800;color:#0f172a;margin-top:12px;border-bottom:1px solid #94a3b8;padding-bottom:2px;display:inline-block;">
              ${profile?.nama_pengasuh || 'Pimpinan Pesantren'}
            </div>
          </div>
          <div style="text-align:right;">
            <span style="font-size:7px;font-weight:800;color:#047857;letter-spacing:0.5px;">
              SIM PESANTREN
            </span>
          </div>
        </div>
      </div>
    </div>`;
  };

  const handleDownloadPng = async (santri: Santri, side: 'front' | 'back') => {
    try {
      setDownloadingPng(`${santri.id}-${side}`);
      setOpenDropdown(null);

      const cardHtml = buildExactCardHtml(santri, side);
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
      container.innerHTML = cardHtml;
      document.body.appendChild(container);

      const cardEl = container.firstElementChild as HTMLElement;
      if (!cardEl) {
        document.body.removeChild(container);
        toast.error('Gagal memproses elemen kartu');
        return;
      }

      await new Promise((r) => setTimeout(r, 200));

      const { domToPng } = await import('modern-screenshot');
      const dataUrl = await domToPng(cardEl, { scale: 3, backgroundColor: null });

      document.body.removeChild(container);

      const link = document.createElement('a');
      link.download = `kartu-santri-${santri.nama_lengkap.replace(/\s+/g, '_')}-${side === 'front' ? 'depan' : 'belakang'}.png`;
      link.href = dataUrl;
      link.click();

      toast.success(`Kartu santri (${side === 'front' ? 'depan' : 'belakang'}) berhasil diunduh`);
    } catch (err: any) {
      toast.error('Gagal mengunduh kartu: ' + err.message);
    } finally {
      setDownloadingPng(null);
    }
  };

  const handleDownloadAllPng = async (side: 'front' | 'back') => {
    try {
      setDownloadingPng(`all-${side}`);
      setBulkDropdownOpen(false);
      const { domToPng } = await import('modern-screenshot');

      for (const s of filtered) {
        const cardHtml = buildExactCardHtml(s, side);
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
        container.innerHTML = cardHtml;
        document.body.appendChild(container);

        const cardEl = container.firstElementChild as HTMLElement;
        if (!cardEl) {
          document.body.removeChild(container);
          continue;
        }

        await new Promise((r) => setTimeout(r, 150));

        const dataUrl = await domToPng(cardEl, { scale: 3, backgroundColor: null });
        document.body.removeChild(container);

        const link = document.createElement('a');
        link.download = `kartu-santri-${s.nama_lengkap.replace(/\s+/g, '_')}-${side === 'front' ? 'depan' : 'belakang'}.png`;
        link.href = dataUrl;
        link.click();

        await new Promise((r) => setTimeout(r, 250));
      }

      toast.success(`Semua kartu santri (${side === 'front' ? 'depan' : 'belakang'}) berhasil diunduh`);
    } catch (err: any) {
      toast.error('Gagal mengunduh kartu massal: ' + err.message);
    } finally {
      setDownloadingPng(null);
    }
  };

  const handlePrint = (singleSantri?: Santri) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('Gagal membuka jendela cetak. Periksa pop-up blocker browser.');
      return;
    }

    const targetList = singleSantri ? [singleSantri] : filtered;
    const cardsHtml = targetList
      .map((s) => {
        const sekolahNama = (s as any).kelas_formal?.sekolah?.nama_sekolah || (s as any).sekolah_asal || 'SIM PESANTREN';
        return `
        <div class="card">
          <div class="card-header">
            ${profile?.logo_url ? `<img src="${profile.logo_url}" class="header-logo"/>` : `<div class="header-logo-ph">P</div>`}
            <div class="header-text">
              <span class="header-inst">${formatNamaPesantrenString(profile?.nama_pesantren)}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="photo-wrap">
              ${s.foto_url ? `<img src="${s.foto_url}" class="photo-img"/>` : `<div class="photo-ph">${s.nama_lengkap[0]}</div>`}
            </div>
            <div class="info-wrap">
              <div class="santri-name">${s.nama_lengkap}</div>
              <div class="santri-nisn">NISN: ${s.nisn || s.nis || '-'}</div>
              <div class="santri-school">${sekolahNama}</div>
            </div>
            <div class="qr-wrap">
              ${s.qr_code_url ? `<img src="${s.qr_code_url}" class="qr-img"/>` : ''}
            </div>
          </div>
        </div>`;
      })
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Kartu Tanda Santri (5.5 x 8.5 cm)</title>
          <style>${CARD_PRINT_CSS}</style>
        </head>
        <body>
          <div class="page">
            <div class="row">
              ${cardsHtml}
            </div>
          </div>
        </body>
      </html>
    `);

    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 600);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div>
        <Link
          href="/absen-santri"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Riwayat
        </Link>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-sm border border-white/10">
              <Sparkles className="w-3.5 h-3.5" /> ID Card Santri Resmi — 5.5 x 8.5 cm
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-amber-400" /> Cetak & Unduh Kartu Santri
            </h1>
            <p className="text-emerald-100/90 text-sm max-w-xl">
              Cetak massal A4 atau unduh PNG beresolusi tinggi (depan & belakang) berstandar ID Card potret resmi 5.5 × 8.5 cm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Generate QR Massal */}
            <button
              onClick={handleBulkGenerate}
              disabled={generating !== null}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              {generating === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Generate QR Massal
            </button>

            {/* Cetak Massal */}
            <button
              onClick={() => handlePrint()}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Cetak ({filtered.length})
            </button>

            {/* Unduh PNG Massal Dropdown */}
            <div className="relative dropdown-container">
              <button
                onClick={() => setBulkDropdownOpen(!bulkDropdownOpen)}
                disabled={downloadingPng !== null || filtered.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50"
              >
                {downloadingPng?.startsWith('all-') ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Unduh PNG Massal
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {bulkDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                  <button
                    onClick={() => handleDownloadAllPng('front')}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-600" /> Unduh Semua (Depan)
                  </button>
                  <button
                    onClick={() => handleDownloadAllPng('back')}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-zinc-700 transition-colors border-t border-slate-100 dark:border-zinc-700 flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4 text-teal-600" /> Unduh Semua (Belakang)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_kelas}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, NIS, atau NISN santri..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Klik kartu untuk melihat sisi belakang · Gunakan tombol di bawah kartu untuk cetak / unduh PNG
      </p>

      {/* Main Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium">Memuat kartu santri...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center text-slate-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
          <p className="text-base font-bold">Tidak Ada Santri Ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
          {filtered.map((santri) => (
            <div key={santri.id} className="flex flex-col items-center gap-3">
              <CardPreview
                santri={santri}
                profile={profile}
                isFlipped={!!flippedCards[santri.id]}
                onFlip={() => toggleFlip(santri.id)}
              />

              {/* Action Buttons per Kartu */}
              <div className="flex items-center gap-1.5 w-full max-w-[220px]">
                {/* Generate QR */}
                <button
                  onClick={() => handleSingleGenerate(santri)}
                  disabled={generating === santri.id || generating === 'all'}
                  title="Generate QR Code"
                  className="flex-1 py-1.5 px-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {generating === santri.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                  QR
                </button>

                {/* Print Single */}
                <button
                  onClick={() => handlePrint(santri)}
                  title="Cetak Kartu"
                  className="flex-1 py-1.5 px-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Cetak
                </button>

                {/* Download PNG Single Dropdown */}
                <div className="relative flex-1 dropdown-container">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === santri.id ? null : santri.id)}
                    disabled={downloadingPng !== null}
                    title="Unduh Gambar PNG"
                    className="w-full py-1.5 px-2 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {downloadingPng?.startsWith(`${santri.id}-`) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    )}
                    PNG
                    <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                  </button>

                  {openDropdown === santri.id && (
                    <div className="absolute bottom-full left-0 mb-1 w-28 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden py-0.5">
                      <button
                        onClick={() => handleDownloadPng(santri, 'front')}
                        className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-sky-50 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Sisi Depan
                      </button>
                      <button
                        onClick={() => handleDownloadPng(santri, 'back')}
                        className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-sky-50 dark:hover:bg-zinc-700 transition-colors border-t border-slate-100 dark:border-zinc-700"
                      >
                        Sisi Belakang
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
