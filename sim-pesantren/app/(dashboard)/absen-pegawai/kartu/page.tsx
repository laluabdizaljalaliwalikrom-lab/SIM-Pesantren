'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getPegawaiList, saveQrCode } from '@/services/absensi-pegawai-actions';
import type { Pegawai, PesantrenProfile } from '@/types/database';
import {
  QrCode,
  Loader2,
  Printer,
  RefreshCw,
  BadgeCheck,
  ArrowLeft,
  Search,
  RotateCcw,
  Download,
  ChevronDown,
  ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import QRCodeLib from 'qrcode';

// Corporate color profile: Luxurious emerald green base with gold accent
const corporateColor = {
  gradient: 'from-emerald-900 via-emerald-800 to-emerald-650',
  solid: '#d97706',
  bg: 'bg-emerald-50/20',
  text: 'text-emerald-900 dark:text-emerald-300'
};

const getColor = (j: string) => corporateColor;

const getInitials = (name: string) => {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
};

const formatNama = (p: Pegawai) => {
  const parts: string[] = [];
  if (p.gelar_depan) parts.push(p.gelar_depan);
  parts.push(p.nama_lengkap);
  if (p.gelar_belakang) parts.push(p.gelar_belakang);
  return parts.join(' ');
};

const formatNamaPesantren = (name?: string | null) => {
  if (!name) return 'SIM Pesantren';
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
  return name;
};

const formatNamaPesantrenString = (name?: string | null) => {
  if (!name) return 'SIM Pesantren';
  const words = name.trim().split(/\s+/);
  if (words.length === 4) {
    return `${words[0]} ${words[1]}<br/>${words[2]} ${words[3]}`;
  }
  return name;
};

const CARD_PRINT_CSS = `@page{size:A4 portrait;margin:0}*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{font-family:'Inter',sans-serif;background:#fff;color:#1e293b}.page{width:210mm;height:297mm;box-sizing:border-box;padding:12mm 10mm;display:flex;flex-direction:column;align-items:center;gap:12mm;page-break-after:always}.page:last-child{page-break-after:avoid}.pair{display:flex;justify-content:center;gap:12mm}.card{width:54mm;height:85.6mm;border-radius:4.5mm;overflow:hidden;position:relative;display:flex;flex-direction:column;border:.5pt solid rgba(4,47,38,0.4);box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03);flex-shrink:0}.card-bg-svg{position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none}.blob{position:absolute;border-radius:50%;opacity:0.12;filter:blur(6mm);pointer-events:none;z-index:2}.blob-1{top:15mm;right:-6mm;width:25mm;height:25mm;background:#047857}.blob-2{bottom:10mm;left:-6mm;width:25mm;height:25mm;background:#fbbf24}.blob-3{top:35mm;left:4mm;width:15mm;height:15mm;background:#10b981}.header{position:relative;display:flex;align-items:center;gap:2.5mm;padding:2.5mm 3.5mm 2mm;border-bottom:0.2pt solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.2);z-index:2;width:100%}.logo-wrap{background:rgba(255,255,255,0.95);padding:0.4mm;border-radius:1.2mm;box-shadow:0 1px 2px rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;flex-shrink:0}.logo{width:5mm;height:5mm;object-fit:contain}.logo-ph{width:5mm;height:5mm;border-radius:1.2mm;background:#ffffff;color:#047857;display:flex;align-items:center;justify-content:center;font-size:2mm;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,0.05);flex-shrink:0}.logo-wrap-sm{background:rgba(255,255,255,0.95);padding:0.4mm;border-radius:1mm;box-shadow:0 1px 2px rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;flex-shrink:0}.logo-sm{width:4mm;height:4mm;object-fit:contain}.logo-ph-sm{width:4mm;height:4mm;border-radius:1mm;background:#ffffff;color:#047857;display:flex;align-items:center;justify-content:center;font-size:1.8mm;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,0.05);flex-shrink:0}.header-text{display:flex;flex-direction:column;text-align:left;flex:1;min-width:0}.inst{font-size:1.9mm;font-weight:800;color:rgba(255,255,255,0.95);text-transform:uppercase;letter-spacing:0.3pt;line-height:1.2}.inst-sm{font-size:1.7mm;font-weight:800;color:rgba(255,255,255,0.95);text-transform:uppercase;letter-spacing:0.3pt;line-height:1.2}.glass-container{margin:1.8mm;padding:2.2mm 2mm 2.2mm;border-radius:3mm;background:rgba(255,255,255,0.07);border:0.25pt solid rgba(251,191,36,0.25);box-shadow:0 4px 16px rgba(0,0,0,0.15);flex:1;display:flex;flex-direction:column;align-items:center;justify-content:space-between;z-index:2}.glass-container-back{margin:2.2mm;padding:3.5mm 3.5mm 3.2mm;border-radius:3mm;background:rgba(255,255,255,0.06);border:0.25pt solid rgba(251,191,36,0.2);box-shadow:0 4px 16px rgba(0,0,0,0.15);flex:1;display:flex;flex-direction:column;justify-content:space-between;z-index:2}.photo-area{position:relative;display:flex;justify-content:center;z-index:2}.photo-ring{position:relative;border-radius:50%;padding:0.4mm;border:0.4mm solid;background:rgba(255,255,255,0.1);box-shadow:0 3px 5px -1px rgba(0,0,0,0.1)}.photo{width:14mm;height:14mm;border-radius:50%;object-fit:cover}.photo-ph{width:14mm;height:14mm;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:3.8mm;font-weight:700}.badge-check-icon{position:absolute;bottom:0;right:0;width:3.5mm;height:3.5mm;background:#d97706;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:1.6mm;font-weight:bold;box-shadow:0 1px 2px rgba(0,0,0,0.15);border:0.2mm solid #ffffff}.info{display:flex;flex-direction:column;align-items:center;padding:0 2mm;margin-top:0.8mm;width:100%;text-align:center;justify-content:flex-start;z-index:2}.name{font-size:2.4mm;font-weight:800;color:#ffffff;line-height:1.2;max-width:48mm;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;letter-spacing:0.2pt}.nip{font-size:1.6mm;color:#fbbf24;font-family:'Courier New',monospace;letter-spacing:0.4pt;margin-top:0.3mm}.nip-ph{height:0.8mm;margin-top:0.3mm}.jabatan{font-size:1.4mm;font-weight:800;text-align:center;padding:0.3mm 2.2mm;border-radius:2.5mm;margin-top:0.8mm;background:rgba(217,119,6,0.2);color:#fde047;border:0.25pt solid rgba(217,119,6,0.4);text-transform:uppercase;letter-spacing:0.5pt}.satminkal{font-size:1.3mm;color:#d1fae5;font-weight:700;letter-spacing:0.2pt;margin-top:0.6mm;text-transform:uppercase}.qr-area{display:flex;justify-content:center;z-index:2;margin-top:1mm}.qr-wrap{background:#ffffff;padding:1mm;border-radius:2mm;border:0.25pt solid rgba(255,255,255,0.2);box-shadow:0 2px 4px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center}.qr{width:23mm;height:23mm}.contact-area{display:flex;flex-direction:column;gap:1.5mm;width:100%;z-index:2}.contact-item{display:flex;flex-direction:column;border-bottom:0.2pt solid rgba(255,255,255,0.1);padding-bottom:0.8mm}.contact-item:last-child{border-bottom:none;padding-bottom:0}.contact-label{font-size:1.4mm;font-weight:800;color:#fbbf24;text-transform:uppercase;letter-spacing:0.5pt;margin-bottom:0.1mm}.contact-value{font-size:1.8mm;font-weight:600;color:#ffffff;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.custom-box{padding:1.5mm 3.5mm;border-radius:1.2mm;background:rgba(255,255,255,0.04);border:0.25pt solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;z-index:2;margin:1mm 0}.custom-text{font-size:1.4mm;color:#ffffff;line-height:1.35;text-align:center;font-weight:500}.footer-sign{display:flex;justify-content:between;align-items:center;margin-top:auto;z-index:2;padding-top:2mm;border-top:0.25pt solid rgba(255,255,255,0.1);width:100%}.sign-info{display:flex;flex-direction:column;text-align:left}.sign-title{font-size:1.2mm;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:0.3pt}.sign-name{font-size:1.5mm;font-weight:800;color:#ffffff;text-transform:uppercase;letter-spacing:0.2pt;margin-top:0.2mm}.sign-stamp{display:flex;flex-direction:column;align-items:center}.sign-line{width:11mm;border-bottom:0.2pt dashed rgba(255,255,255,0.3);height:2.5mm}.stamp-label{font-size:1mm;font-weight:700;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.3pt;margin-top:0.3mm}@media print{body{margin:0;background:#ffffff}.card{box-shadow:none;border:.5pt solid rgba(4,47,38,0.5)}}`;

interface CardFlipProps {
  pegawai: Pegawai & { satminkal?: string[] };
  profile: PesantrenProfile | null;
  isFlipped: boolean;
  onFlip: () => void;
}

function CardPreview({ pegawai, profile, isFlipped, onFlip }: CardFlipProps) {
  const c = getColor(pegawai.jabatan);

  return (
    <div className="group cursor-pointer select-none" style={{ perspective: '1200px' }} onClick={onFlip} title="Klik untuk balik kartu" data-card={pegawai.id}>
      <div className={`relative w-[216px] h-[344px] transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
        
        {/* FRONT SIDE */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl overflow-hidden shadow-xl border border-emerald-900/30 flex flex-col">
          <svg className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none rounded-2xl" viewBox="0 0 180 285" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cardGradFront" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#022c22" />
                <stop offset="50%" stopColor="#064e3b" />
                <stop offset="100%" stopColor="#022c22" />
              </linearGradient>
            </defs>
            <rect width="180" height="285" fill="url(#cardGradFront)" rx="9" />
            <g fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.06">
              <path d="M 90,95 C 95,115 115,130 90,150 C 65,130 85,115 90,95 Z" />
              <path d="M 90,105 C 93,115 105,125 90,138 C 75,125 87,115 90,105 Z" />
              <path d="M 90,95 C 105,100 115,90 120,80 C 110,85 100,90 90,95 Z" />
              <path d="M 90,95 C 75,100 65,90 60,80 C 70,85 80,90 90,95 Z" />
              <path d="M 90,150 C 105,145 115,155 120,165 C 110,160 100,155 90,150 Z" />
              <path d="M 90,150 C 75,145 65,155 60,165 C 70,160 80,155 90,150 Z" />
            </g>
            <g fill="none" stroke="#fbbf24" strokeWidth="1.2" opacity="0.22">
              <path d="M 0,25 C 10,25 25,10 25,0 M 0,15 C 8,15 15,8 15,0 M 0,35 C 15,35 35,15 35,0 M 12,12 C 18,6 20,5 25,5 M 5,25 C 5,20 6,18 10,12" />
              <circle cx="10" cy="10" r="1.5" fill="#fbbf24" />
              <circle cx="20" cy="20" r="1" fill="#fbbf24" />
              <path d="M 180,25 C 170,25 155,10 155,0 M 180,15 C 172,15 165,8 165,0 M 180,35 C 165,35 145,15 145,0 M 168,12 C 162,6 160,5 155,5 M 175,25 C 175,20 174,18 170,12" />
              <circle cx="170" cy="10" r="1.5" fill="#fbbf24" />
              <circle cx="160" cy="20" r="1" fill="#fbbf24" />
              <path d="M 0,260 C 10,260 25,275 25,285 M 0,270 C 8,270 15,277 15,285 M 0,250 C 15,250 35,270 35,285 M 12,273 C 18,279 20,280 25,280 M 5,260 C 5,265 6,267 10,273" />
              <circle cx="10" cy="275" r="1.5" fill="#fbbf24" />
              <circle cx="20" cy="265" r="1" fill="#fbbf24" />
              <path d="M 180,260 C 170,260 155,275 155,285 M 180,270 C 172,270 165,277 165,285 M 180,250 C 165,250 145,270 145,285 M 168,273 C 162,279 160,280 155,280 M 175,260 C 175,265 174,267 170,273" />
              <circle cx="170" cy="275" r="1.5" fill="#fbbf24" />
              <circle cx="160" cy="265" r="1" fill="#fbbf24" />
            </g>
          </svg>
          {/* Background Decorative Blobs */}
          <div className="absolute top-[80px] -right-12 w-28 h-28 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-[40px] -left-12 w-28 h-28 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-center gap-2 px-3 pt-3.5 pb-2 border-b border-white/15 z-10 w-full bg-black/20">
            {profile?.logo_url ? (
              <div className="bg-white/95 p-0.5 rounded shadow-sm flex items-center justify-center flex-shrink-0">
                <Image src={profile.logo_url} alt="Logo" width={20} height={20} className="object-contain" unoptimized />
              </div>
            ) : (
              <div className="w-5 h-5 rounded bg-white text-emerald-950 flex items-center justify-center font-bold text-[8px] shadow-sm flex-shrink-0">SP</div>
            )}
            <div className="flex flex-col text-left justify-center flex-1 min-w-0">
              <span className="text-[8.5px] font-extrabold text-white tracking-wide uppercase leading-tight line-clamp-2">
                {formatNamaPesantren(profile?.nama_pesantren)}
              </span>
            </div>
          </div>

          {/* Frosted Glass Container */}
          <div className="mx-2 my-2 p-2.5 rounded-xl bg-white/[0.07] dark:bg-black/[0.3] border border-amber-500/25 backdrop-blur-md flex-1 flex flex-col items-center justify-between shadow-xl shadow-black/30 z-10">
            {/* Profile Photo */}
            <div className="relative p-0.5 rounded-full border bg-white/10" style={{ borderColor: c.solid }}>
              {pegawai.foto_url ? (
                <div className="w-[56px] h-[56px] rounded-full overflow-hidden bg-white/5">
                  <Image src={pegawai.foto_url} alt={pegawai.nama_lengkap} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                </div>
              ) : (
                <div className={`w-[56px] h-[56px] rounded-full bg-gradient-to-br from-emerald-800 to-emerald-950 flex items-center justify-center text-white text-lg font-bold`}>
                  {getInitials(pegawai.nama_lengkap)}
                </div>
              )}
              <div className="absolute bottom-0 right-0 bg-amber-500 p-0.5 rounded-full shadow border border-white">
                <BadgeCheck className="h-3 w-3 text-white" />
              </div>
            </div>

            {/* Employee Info */}
            <div className="flex flex-col items-center mt-1 text-center justify-start w-full">
              <p className="text-[10.5px] font-extrabold text-white uppercase tracking-wide leading-tight line-clamp-2 max-w-[175px]">
                {formatNama(pegawai)}
              </p>
              {pegawai.nip ? (
                <p className="text-[7.5px] text-amber-400 mt-0.5 font-mono tracking-widest uppercase">ID. {pegawai.nip}</p>
              ) : (
                <div className="h-1" />
              )}
              
              <div className="mt-1 px-2.5 py-0.5 rounded-full text-[6.5px] font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                {pegawai.jabatan}
              </div>

              {pegawai.satminkal && pegawai.satminkal.length > 0 && (
                <p className="text-[6.5px] font-bold text-emerald-200 mt-1 uppercase tracking-wide">
                  {pegawai.satminkal.join(', ')}
                </p>
              )}
            </div>

            {/* Enlarged QR Code (Maximum Readability) */}
            <div className="mt-1.5 flex justify-center w-full">
              {pegawai.qr_code_url ? (
                <div className="bg-white p-1.5 rounded-xl border border-white/20 shadow-2xl transition-transform hover:scale-105 duration-300 flex items-center justify-center">
                  <img src={pegawai.qr_code_url} alt="QR" width={92} height={92} className="w-[92px] h-[92px] object-contain" />
                </div>
              ) : (
                <div className="w-[92px] h-[92px] rounded-xl border border-dashed border-white/20 flex items-center justify-center bg-white/5">
                  <QrCode className="h-7 w-7 text-white/30" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl overflow-hidden shadow-xl border border-emerald-900/30 flex flex-col">
          <svg className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none rounded-2xl" viewBox="0 0 180 285" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cardGradBack" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#022c22" />
                <stop offset="50%" stopColor="#064e3b" />
                <stop offset="100%" stopColor="#022c22" />
              </linearGradient>
            </defs>
            <rect width="180" height="285" fill="url(#cardGradBack)" rx="9" />
            <g fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.06">
              <path d="M 90,95 C 95,115 115,130 90,150 C 65,130 85,115 90,95 Z" />
              <path d="M 90,105 C 93,115 105,125 90,138 C 75,125 87,115 90,105 Z" />
              <path d="M 90,95 C 105,100 115,90 120,80 C 110,85 100,90 90,95 Z" />
              <path d="M 90,95 C 75,100 65,90 60,80 C 70,85 80,90 90,95 Z" />
              <path d="M 90,150 C 105,145 115,155 120,165 C 110,160 100,155 90,150 Z" />
              <path d="M 90,150 C 75,145 65,155 60,165 C 70,160 80,155 90,150 Z" />
            </g>
            <g fill="none" stroke="#fbbf24" strokeWidth="1.2" opacity="0.22">
              <path d="M 0,25 C 10,25 25,10 25,0 M 0,15 C 8,15 15,8 15,0 M 0,35 C 15,35 35,15 35,0 M 12,12 C 18,6 20,5 25,5 M 5,25 C 5,20 6,18 10,12" />
              <circle cx="10" cy="10" r="1.5" fill="#fbbf24" />
              <circle cx="20" cy="20" r="1" fill="#fbbf24" />
              <path d="M 180,25 C 170,25 155,10 155,0 M 180,15 C 172,15 165,8 165,0 M 180,35 C 165,35 145,15 145,0 M 168,12 C 162,6 160,5 155,5 M 175,25 C 175,20 174,18 170,12" />
              <circle cx="170" cy="10" r="1.5" fill="#fbbf24" />
              <circle cx="160" cy="20" r="1" fill="#fbbf24" />
              <path d="M 0,260 C 10,260 25,275 25,285 M 0,270 C 8,270 15,277 15,285 M 0,250 C 15,250 35,270 35,285 M 12,273 C 18,279 20,280 25,280 M 5,260 C 5,265 6,267 10,273" />
              <circle cx="10" cy="275" r="1.5" fill="#fbbf24" />
              <circle cx="20" cy="265" r="1" fill="#fbbf24" />
              <path d="M 180,260 C 170,260 155,275 155,285 M 180,270 C 172,270 165,277 165,285 M 180,250 C 165,250 145,270 145,285 M 168,273 C 162,279 160,280 155,280 M 175,260 C 175,265 174,267 170,273" />
              <circle cx="170" cy="275" r="1.5" fill="#fbbf24" />
              <circle cx="160" cy="265" r="1" fill="#fbbf24" />
            </g>
          </svg>
          {/* Background Decorative Blobs */}
          <div className="absolute top-[60px] -right-12 w-28 h-28 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-[40px] -left-12 w-28 h-28 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-center gap-2 px-3.5 pt-3 pb-2 border-b border-white/10 z-10 w-full bg-black/10">
            {profile?.logo_url ? (
              <div className="bg-white/95 p-0.5 rounded shadow-sm flex items-center justify-center flex-shrink-0">
                <Image src={profile.logo_url} alt="Logo" width={16} height={16} className="object-contain" unoptimized />
              </div>
            ) : (
              <div className="w-4 h-4 rounded bg-white text-emerald-950 flex items-center justify-center font-bold text-[7px] shadow-sm flex-shrink-0">SP</div>
            )}
            <div className="flex flex-col text-left justify-center flex-1 min-w-0">
              <span className="text-[7.5px] font-extrabold text-white tracking-wide uppercase leading-tight line-clamp-2">
                {formatNamaPesantren(profile?.nama_pesantren)}
              </span>
            </div>
          </div>

          {/* Frosted Glass Container */}
          <div className="mx-2.5 my-2.5 p-3.5 rounded-xl bg-white/[0.06] dark:bg-black/[0.25] border border-amber-500/20 backdrop-blur-md flex-1 flex flex-col justify-between shadow-lg shadow-black/25 z-10">
            {/* Contact Details */}
            <div className="space-y-1.5 text-left w-full">
              {[
                { label: 'Alamat', value: profile?.alamat },
                { label: 'Telepon', value: profile?.telp },
                { label: 'Email', value: profile?.email },
                { label: 'Website', value: profile?.website },
              ].filter((item) => item.value).map((item) => (
                <div key={item.label} className="flex flex-col border-b border-white/10 pb-1 last:border-0 last:pb-0">
                  <span className="text-[5.5px] font-extrabold text-amber-400 uppercase tracking-widest">{item.label}</span>
                  <span className="text-[7.5px] font-semibold text-white/90 leading-snug truncate">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Footer Text / Terms of Use */}
            {profile?.kartu_belakang_teks && (
              <div className="px-3.5 py-1.5 rounded bg-white/5 border border-white/10 text-left w-full my-1.5">
                <p className="text-[5.5px] text-white leading-normal whitespace-pre-line text-center">
                  {profile.kartu_belakang_teks}
                </p>
              </div>
            )}

            {/* Authorized Signature area */}
            <div className="pt-2 border-t border-white/10 flex justify-between items-center w-full">
              <div className="flex flex-col text-left">
                <span className="text-[4.5px] font-bold text-amber-400 uppercase tracking-wider">Authorized By</span>
                <span className="text-[6px] font-extrabold text-white uppercase tracking-wide mt-0.5">Pimpinan Pesantren</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 border-b border-dashed border-white/30 h-3"></div>
                <span className="text-[3.5px] font-bold text-white/75 uppercase tracking-widest mt-0.5">Stamp & Sign</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function KartuPegawaiPage() {
  const [pegawaiList, setPegawaiList] = useState<(Pegawai & { satminkal?: string[] })[]>([]);
  const [profile, setProfile] = useState<PesantrenProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [downloadingPng, setDownloadingPng] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pegawaiResult, profileResult, sekolahResult] = await Promise.all([
        getPegawaiList(),
        supabase.from('pesantren_profile').select('*').maybeSingle(),
        supabase.from('sekolah').select('id, nama_sekolah'),
      ]);

      const sekolahMap: Record<string, string> = {};
      if (sekolahResult.data) {
        sekolahResult.data.forEach((s: any) => {
          sekolahMap[s.id] = s.nama_sekolah;
        });
      }

      if (pegawaiResult.success) {
        const list = (pegawaiResult.data || []).map((p: Pegawai) => {
          const satminkalName = p.id_sekolah ? sekolahMap[p.id_sekolah] : null;
          return {
            ...p,
            satminkal: satminkalName ? [satminkalName] : [],
          };
        });
        setPegawaiList(list);
      }
      if (profileResult.data) setProfile(profileResult.data);
    } catch { toast.error('Terjadi kesalahan'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!openDropdown) return;
    const handler = () => setOpenDropdown(null);
    const timer = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handler); };
  }, [openDropdown]);

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const generateQr = async (pegawai: Pegawai) => {
    try {
      setGenerating(pegawai.id);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const dataUrl = await QRCodeLib.toDataURL(`${baseUrl}/absen-pegawai/scan?id=${pegawai.id}`, {
        width: 400,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });
      const result = await saveQrCode(pegawai.id, dataUrl);
      if (result.success) {
        setPegawaiList((prev) => prev.map((p) => (p.id === pegawai.id ? { ...p, qr_code_url: dataUrl } : p)));
        toast.success(`QR Code ${pegawai.nama_lengkap} berhasil dibuat`);
      } else { toast.error(result.error || 'Gagal menyimpan QR'); }
    } catch (err: any) { toast.error('Gagal generate QR: ' + err.message); }
    finally { setGenerating(null); }
  };

  const generateAllQr = async () => {
    try {
      setGenerating('all');
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      for (const p of pegawaiList) {
        const dataUrl = await QRCodeLib.toDataURL(`${baseUrl}/absen-pegawai/scan?id=${p.id}`, {
          width: 400,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        });
        await saveQrCode(p.id, dataUrl);
        setPegawaiList((prev) => prev.map((x) => (x.id === p.id ? { ...x, qr_code_url: dataUrl } : x)));
      }
      toast.success('Semua QR Code berhasil dibuat');
    } catch (err: any) { toast.error('Gagal generate QR: ' + err.message); }
    finally { setGenerating(null); }
  };

  const handleDownloadPng = async (pegawai: Pegawai & { satminkal?: string[] }, side: 'front' | 'back') => {
    try {
      const key = `${pegawai.id}-${side}`;
      setDownloadingPng(key);
      setOpenDropdown(null);

      const cardHtml = buildPrintCardHtml(pegawai, side);
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
      container.innerHTML = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>${CARD_PRINT_CSS}</style>${cardHtml}`;
      document.body.appendChild(container);

      const cardEl = container.querySelector('.card') as HTMLElement;
      if (!cardEl) { document.body.removeChild(container); return; }

      await new Promise(r => setTimeout(r, 200));

      const { domToPng } = await import('modern-screenshot');
      const dataUrl = await domToPng(cardEl, { scale: 3, backgroundColor: null });

      document.body.removeChild(container);

      const link = document.createElement('a');
      link.download = `kartu-${pegawai.nama_lengkap.replace(/\s+/g, '_')}-${side === 'front' ? 'depan' : 'belakang'}.png`;
      link.href = dataUrl;
      link.click();

      toast.success(`Kartu ${side === 'front' ? 'depan' : 'belakang'} berhasil diunduh`);
    } catch (err: any) {
      toast.error('Gagal mengunduh: ' + err.message);
    } finally {
      setDownloadingPng(null);
    }
  };

  const handleDownloadAllPng = async (side: 'front' | 'back') => {
    try {
      setDownloadingPng(`all-${side}`);
      setOpenDropdown(null);
      const { domToPng } = await import('modern-screenshot');

      for (const p of filtered) {
        const cardHtml = buildPrintCardHtml(p, side);
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
        container.innerHTML = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>${CARD_PRINT_CSS}</style>${cardHtml}`;
        document.body.appendChild(container);

        const cardEl = container.querySelector('.card') as HTMLElement;
        if (!cardEl) { document.body.removeChild(container); continue; }

        await new Promise(r => setTimeout(r, 200));

        const dataUrl = await domToPng(cardEl, { scale: 3, backgroundColor: null });
        document.body.removeChild(container);

        const link = document.createElement('a');
        link.download = `kartu-${p.nama_lengkap.replace(/\s+/g, '_')}-${side === 'front' ? 'depan' : 'belakang'}.png`;
        link.href = dataUrl;
        link.click();

        await new Promise(r => setTimeout(r, 300));
      }

      toast.success(`Semua kartu ${side === 'front' ? 'depan' : 'belakang'} berhasil diunduh`);
    } catch (err: any) {
      toast.error('Gagal mengunduh: ' + err.message);
    } finally {
      setDownloadingPng(null);
    }
  };

  const buildPrintCardHtml = (p: Pegawai & { satminkal?: string[] }, side: 'front' | 'back') => {
    const c = getColor(p.jabatan);
    const nama = formatNama(p);
    if (side === 'front') {
      return `
        <div class="card card-front">
          <svg class="card-bg-svg" viewBox="0 0 180 285" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cardGradPrintFront" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#022c22" />
                <stop offset="50%" stop-color="#064e3b" />
                <stop offset="100%" stop-color="#022c22" />
              </linearGradient>
            </defs>
            <rect width="180" height="285" fill="url(#cardGradPrintFront)" />
            <g fill="none" stroke="#fbbf24" stroke-width="0.8" opacity="0.06">
              <path d="M 90,95 C 95,115 115,130 90,150 C 65,130 85,115 90,95 Z" />
              <path d="M 90,105 C 93,115 105,125 90,138 C 75,125 87,115 90,105 Z" />
              <path d="M 90,95 C 105,100 115,90 120,80 C 110,85 100,90 90,95 Z" />
              <path d="M 90,95 C 75,100 65,90 60,80 C 70,85 80,90 90,95 Z" />
              <path d="M 90,150 C 105,145 115,155 120,165 C 110,160 100,155 90,150 Z" />
              <path d="M 90,150 C 75,145 65,155 60,165 C 70,160 80,155 90,150 Z" />
            </g>
            <g fill="none" stroke="#fbbf24" stroke-width="1.2" opacity="0.22">
              <path d="M 0,25 C 10,25 25,10 25,0 M 0,15 C 8,15 15,8 15,0 M 0,35 C 15,35 35,15 35,0 M 12,12 C 18,6 20,5 25,5 M 5,25 C 5,20 6,18 10,12" />
              <circle cx="10" cy="10" r="1.5" fill="#fbbf24" />
              <circle cx="20" cy="20" r="1" fill="#fbbf24" />
              <path d="M 180,25 C 170,25 155,10 155,0 M 180,15 C 172,15 165,8 165,0 M 180,35 C 165,35 145,15 145,0 M 168,12 C 162,6 160,5 155,5 M 175,25 C 175,20 174,18 170,12" />
              <circle cx="170" cy="10" r="1.5" fill="#fbbf24" />
              <circle cx="160" cy="20" r="1" fill="#fbbf24" />
              <path d="M 0,260 C 10,260 25,275 25,285 M 0,270 C 8,270 15,277 15,285 M 0,250 C 15,250 35,270 35,285 M 12,273 C 18,279 20,280 25,280 M 5,260 C 5,265 6,267 10,273" />
              <circle cx="10" cy="275" r="1.5" fill="#fbbf24" />
              <circle cx="20" cy="265" r="1" fill="#fbbf24" />
              <path d="M 180,260 C 170,260 155,275 155,285 M 180,270 C 172,270 165,277 165,285 M 180,250 C 165,250 145,270 145,285 M 168,273 C 162,279 160,280 155,280 M 175,260 C 175,265 174,267 170,273" />
              <circle cx="170" cy="275" r="1.5" fill="#fbbf24" />
              <circle cx="160" cy="265" r="1" fill="#fbbf24" />
            </g>
          </svg>
          <div class="blob blob-1"></div>
          <div class="blob blob-2"></div>
          <div class="blob blob-3"></div>
          
          <div class="header">
            ${profile?.logo_url ? `<div class="logo-wrap"><img src="${profile.logo_url}" class="logo" /></div>` : `<div class="logo-ph">SP</div>`}
            <div class="header-text">
              <span class="inst">${formatNamaPesantrenString(profile?.nama_pesantren)}</span>
            </div>
          </div>

          <div class="glass-container">
            <div class="photo-area">
              <div class="photo-ring" style="border-color: ${c.solid};">
                ${p.foto_url ? `<img src="${p.foto_url}" class="photo" />` : `<div class="photo-ph" style="background: linear-gradient(135deg, ${c.solid}, ${c.solid}bb);">${getInitials(p.nama_lengkap)}</div>`}
                <div class="badge-check-icon">✓</div>
              </div>
            </div>

            <div class="info">
              <div class="name">${nama}</div>
              ${p.nip ? `<div class="nip">ID. ${p.nip}</div>` : '<div class="nip-ph"></div>'}
              <div class="jabatan">${p.jabatan}</div>
              ${p.satminkal && p.satminkal.length > 0 ? `<div class="satminkal">${p.satminkal.join(', ').toUpperCase()}</div>` : ''}
            </div>

            <div class="qr-area">
              ${p.qr_code_url ? `<div class="qr-wrap"><img src="${p.qr_code_url}" class="qr" /></div>` : ''}
            </div>
          </div>
        </div>
      `;
    }
    const cl: string[] = [];
    if (profile?.alamat) cl.push(`<div class="contact-item"><span class="contact-label">Alamat</span><span class="contact-value">${profile.alamat}</span></div>`);
    if (profile?.telp) cl.push(`<div class="contact-item"><span class="contact-label">Telepon</span><span class="contact-value">${profile.telp}</span></div>`);
    if (profile?.email) cl.push(`<div class="contact-item"><span class="contact-label">Email</span><span class="contact-value">${profile.email}</span></div>`);
    if (profile?.website) cl.push(`<div class="contact-item"><span class="contact-label">Website</span><span class="contact-value">${profile.website}</span></div>`);
    const customText = profile?.kartu_belakang_teks ? `<div class="custom-box"><p class="custom-text">${profile.kartu_belakang_teks.replace(/\n/g, '<br/>')}</p></div>` : '';
    
    return `
      <div class="card card-back">
        <svg class="card-bg-svg" viewBox="0 0 180 285" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cardGradPrintBack" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#022c22" />
              <stop offset="50%" stop-color="#064e3b" />
              <stop offset="100%" stop-color="#022c22" />
            </linearGradient>
          </defs>
          <rect width="180" height="285" fill="url(#cardGradPrintBack)" />
          <g fill="none" stroke="#fbbf24" stroke-width="0.8" opacity="0.06">
            <path d="M 90,95 C 95,115 115,130 90,150 C 65,130 85,115 90,95 Z" />
            <path d="M 90,105 C 93,115 105,125 90,138 C 75,125 87,115 90,105 Z" />
            <path d="M 90,95 C 105,100 115,90 120,80 C 110,85 100,90 90,95 Z" />
            <path d="M 90,95 C 75,100 65,90 60,80 C 70,85 80,90 90,95 Z" />
            <path d="M 90,150 C 105,145 115,155 120,165 C 110,160 100,155 90,150 Z" />
            <path d="M 90,150 C 75,145 65,155 60,165 C 70,160 80,155 90,150 Z" />
          </g>
          <g fill="none" stroke="#fbbf24" stroke-width="1.2" opacity="0.22">
            <path d="M 0,25 C 10,25 25,10 25,0 M 0,15 C 8,15 15,8 15,0 M 0,35 C 15,35 35,15 35,0 M 12,12 C 18,6 20,5 25,5 M 5,25 C 5,20 6,18 10,12" />
            <circle cx="10" cy="10" r="1.5" fill="#fbbf24" />
            <circle cx="20" cy="20" r="1" fill="#fbbf24" />
            <path d="M 180,25 C 170,25 155,10 155,0 M 180,15 C 172,15 165,8 165,0 M 180,35 C 165,35 145,15 145,0 M 168,12 C 162,6 160,5 155,5 M 175,25 C 175,20 174,18 170,12" />
            <circle cx="170" cy="10" r="1.5" fill="#fbbf24" />
            <circle cx="160" cy="20" r="1" fill="#fbbf24" />
            <path d="M 0,260 C 10,260 25,275 25,285 M 0,270 C 8,270 15,277 15,285 M 0,250 C 15,250 35,270 35,285 M 12,273 C 18,279 20,280 25,280 M 5,260 C 5,265 6,267 10,273" />
            <circle cx="10" cy="275" r="1.5" fill="#fbbf24" />
            <circle cx="20" cy="265" r="1" fill="#fbbf24" />
            <path d="M 180,260 C 170,260 155,275 155,285 M 180,270 C 172,270 165,277 165,285 M 180,250 C 165,250 145,270 145,285 M 168,273 C 162,279 160,280 155,280 M 175,260 C 175,265 174,267 170,273" />
            <circle cx="170" cy="275" r="1.5" fill="#fbbf24" />
            <circle cx="160" cy="265" r="1" fill="#fbbf24" />
          </g>
        </svg>
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        
        <div class="header">
          ${profile?.logo_url ? `<div class="logo-wrap-sm"><img src="${profile.logo_url}" class="logo-sm" /></div>` : `<div class="logo-ph-sm">SP</div>`}
          <div class="header-text">
            <span class="inst-sm">${formatNamaPesantrenString(profile?.nama_pesantren)}</span>
          </div>
        </div>

        <div class="glass-container-back">
          <div class="contact-area">${cl.join('')}</div>
          
          ${customText}

          <div class="footer-sign">
            <div class="sign-info">
              <span class="sign-title">Authorized By</span>
              <span class="sign-name">Pimpinan Pesantren</span>
            </div>
            <div class="sign-stamp">
              <div class="sign-line"></div>
              <span class="stamp-label">Stamp & Sign</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrint = (pegawai?: Pegawai & { satminkal?: string[] }) => {
    const items = pegawai ? [pegawai] : filtered;
    const pw = window.open('', '_blank');
    if (!pw) { toast.error('Popup diblokir browser'); return; }

    const chunks: (Pegawai & { satminkal?: string[] })[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      chunks.push(items.slice(i, i + 2));
    }

    const html = chunks.map((chunk) => {
      const pairsHtml = chunk.map((p) => `<div class="pair">${buildPrintCardHtml(p, 'front')}${buildPrintCardHtml(p, 'back')}</div>`).join('');
      return `<div class="page">${pairsHtml}</div>`;
    }).join('');
    pw.document.write(`<!DOCTYPE html><html><head><title>Kartu Pegawai</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>${CARD_PRINT_CSS}</style></head><body>${html}</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 500);
  };

  const filtered = pegawaiList.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.nama_lengkap.toLowerCase().includes(q) || p.nip?.toLowerCase().includes(q) || p.jabatan.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/absen-pegawai" className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BadgeCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              Kartu Pegawai
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 text-sm">Generate QR Code & cetak kartu identitas pegawai</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={generateAllQr} disabled={generating === 'all'} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors">
            {generating === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Generate Semua QR
          </button>
          <button onClick={() => handlePrint()} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Printer className="h-4 w-4" />
            Cetak Semua
          </button>
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'all' ? null : 'all')}
              disabled={downloadingPng !== null}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {downloadingPng?.startsWith('all-') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PNG
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {openDropdown === 'all' && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => handleDownloadAllPng('front')}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-violet-500" />
                  Semua Depan
                </button>
                <button
                  onClick={() => handleDownloadAllPng('back')}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 border-t border-slate-100 dark:border-zinc-700"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-violet-500" />
                  Semua Belakang
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Cari nama, NIP, atau jabatan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-12 text-center">
          <QrCode className="h-12 w-12 mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
          <p className="text-slate-500 dark:text-zinc-400 font-medium">Tidak ada data pegawai</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((pegawai) => (
            <div key={pegawai.id} className="flex flex-col items-center gap-4">
              <CardPreview pegawai={pegawai} profile={profile} isFlipped={flippedCards.has(pegawai.id)} onFlip={() => toggleFlip(pegawai.id)} />
              <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500">
                <RotateCcw className="h-3 w-3" />
                Klik kartu untuk balik
              </div>
              <div className="flex gap-2 w-full max-w-[216px]">
                <button onClick={() => generateQr(pegawai)} disabled={generating === pegawai.id || generating === 'all'}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                  {generating === pegawai.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {pegawai.qr_code_url ? 'Regenerate' : 'QR'}
                </button>
                <button onClick={() => handlePrint(pegawai)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium transition-colors">
                  <Printer className="h-3.5 w-3.5" />
                  Cetak
                </button>
                <div className="relative flex-1">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === pegawai.id ? null : pegawai.id)}
                    disabled={downloadingPng !== null}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-violet-700 dark:text-violet-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {downloadingPng === pegawai.id || downloadingPng?.startsWith(`${pegawai.id}-`) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    PNG
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {openDropdown === pegawai.id && (
                    <div className="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 overflow-hidden">
                      <button
                        onClick={() => handleDownloadPng(pegawai, 'front')}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Depan
                      </button>
                      <button
                        onClick={() => handleDownloadPng(pegawai, 'back')}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors border-t border-slate-100 dark:border-zinc-700"
                      >
                        Belakang
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
