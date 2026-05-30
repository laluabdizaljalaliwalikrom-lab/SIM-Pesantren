'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Download, 
  X, 
  FileSpreadsheet, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Database
} from 'lucide-react';
import { importSantri, checkExistingSantri, executeImport } from '@/services/santri-import';
import { toast } from 'sonner';
import { transformDapodikData } from '@/utils/dapodik-transformer';

interface ImportSantriModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  kelasList: any[];
}

interface ReviewRow {
  nis: string;
  nama_lengkap: string;
  nisn?: string;
  nik?: string;
  tanggal_lahir?: string;
  status?: string;
  status_import: 'new' | 'exists';
  existing_data?: any;
  rombel_saat_ini?: string;
  id_kelas_formal?: string;
  id_kelas_non_formal?: string;
  matched_kelas_formal_name?: string;
  matched_kelas_non_formal_name?: string;
  // UI States
  checked: boolean;
  action_on_duplicate: 'ignore' | 'update';
}

export function ImportSantriModal({ isOpen, onClose, onSuccess, kelasList }: ImportSantriModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Download Template Excel secara Dinamis menggunakan XLSX
  const handleDownloadTemplate = () => {
    try {
      const headers = [
        { nis: '2026001', nama_lengkap: 'Ahmad Fauzi', nisn: '0102030405', nik: '3201020304050001', tanggal_lahir: '2010-05-15', status: 'aktif' },
        { nis: '2026002', nama_lengkap: 'Siti Aminah', nisn: '0102030406', nik: '3201020304050002', tanggal_lahir: '2011-08-20', status: 'aktif' },
      ];

      const worksheet = XLSX.utils.json_to_sheet(headers);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Santri');
      
      const maxColWidths = [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 10 }];
      worksheet['!cols'] = maxColWidths;

      XLSX.writeFile(workbook, 'Template_Import_Santri.xlsx');
      toast.success('Template Excel berhasil diunduh!');
    } catch (err) {
      toast.error('Gagal mengunduh template.');
    }
  };

  // 2. Parse file Excel/CSV ke JSON
  const processFile = (selectedFile: File) => {
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
      toast.error('Format berkas tidak didukung. Gunakan .xlsx, .xls, atau .csv');
      return;
    }

    setFile(selectedFile);
    setIsChecking(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Deteksi letak baris header secara dinamis untuk menghindari kegagalan akibat variasi jumlah baris kosong
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        let headerRowIndex = -1;
        
        // 1. Coba deteksi dengan kriteria ketat: baris harus memiliki kolom NIS/NIPD/NISN DAN kolom Nama
        for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
          const row = rawRows[i];
          if (Array.isArray(row)) {
            const rowStrArray = row.map(cell => String(cell || '').trim().toLowerCase());
            
            const hasNisCol = rowStrArray.some(cell => 
              ['nipd', 'nis', 'nisn', 'nomor induk', 'no. induk', 'no induk'].includes(cell) ||
              cell.includes('nipd') || 
              (cell.includes('nis') && !cell.includes('sekolah') && !cell.includes('rombel') && !cell.includes('bukan'))
            );
            
            const hasNamaCol = rowStrArray.some(cell => 
              ['nama', 'nama lengkap', 'nama peserta didik', 'nama siswa'].includes(cell) ||
              (cell.includes('nama') && !cell.includes('sekolah') && !cell.includes('rombel') && !cell.includes('ayah') && !cell.includes('ibu') && !cell.includes('wali'))
            );

            if (hasNisCol && hasNamaCol) {
              headerRowIndex = i;
              break;
            }
          }
        }

        // 2. Fallback ke pencarian parsial yang lebih longgar jika pencarian ketat gagal
        if (headerRowIndex === -1) {
          for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
            const row = rawRows[i];
            if (Array.isArray(row)) {
              const hasHeaderKeyword = row.some(cell => {
                const cellStr = String(cell || '').trim().toLowerCase();
                if (cellStr.includes('sekolah') || cellStr.includes('rombel') || cellStr.includes('tahun')) return false;
                return cellStr.includes('nipd') || cellStr.includes('nis') || cellStr.includes('nama');
              });
              if (hasHeaderKeyword) {
                headerRowIndex = i;
                break;
              }
            }
          }
        }

        // Default fallback ke baris pertama jika tidak terdeteksi
        if (headerRowIndex === -1) {
          headerRowIndex = 0;
        }

        // Konversi sheet ke JSON mulai dari baris header yang dideteksi secara dinamis
        const rawJson = XLSX.utils.sheet_to_json<any>(worksheet, { range: headerRowIndex });

        if (rawJson.length === 0) {
          toast.error('Berkas Excel kosong atau tidak memiliki baris data.');
          resetStates();
          return;
        }

        // Cek kecocokan kolom wajib dengan mengambil nama kolom langsung dari baris header rawRows
        const detectedKeys = Array.isArray(rawRows[headerRowIndex])
          ? rawRows[headerRowIndex].map(cell => String(cell || '').trim()).filter(Boolean)
          : [];
        
        const hasNis = detectedKeys.some(key => {
          const k = key.trim().toLowerCase();
          return k === 'nis' || k === 'nipd' || k === 'nisn' || k.includes('nis') || k.includes('nipd');
        });
        
        const hasNama = detectedKeys.some(key => {
          const k = key.trim().toLowerCase();
          // Hindari pencocokan dengan metadata sekolah/rombel/wali
          if (k.includes('sekolah') || k.includes('rombel') || k.includes('ayah') || k.includes('ibu') || k.includes('wali')) {
            return false;
          }
          return k === 'nama_lengkap' || k === 'nama' || k.includes('nama');
        });

        if (!hasNis || !hasNama) {
          // Log header yang terbaca ke konsol untuk memudahkan debugging
          console.log('Detected Headers:', detectedKeys);
          toast.error(`Berkas harus memiliki kolom "NIPD" / "nis" dan "Nama" / "nama_lengkap". Baris header terdeteksi di indeks ${headerRowIndex}. Kolom terdeteksi: ${detectedKeys.slice(0, 6).join(', ')}...`);
          resetStates();
          return;
        }

        // Petakan kolom Dapodik secara teratur ke format database menggunakan helper transformDapodikData
        // (Fungsi ini otomatis menormalisasi JK, Tanggal Lahir, Alamat, dan menghapus baris kosong)
        const normalizedJson = transformDapodikData(rawJson);

        if (normalizedJson.length === 0) {
          toast.error('Tidak ada baris data valid untuk diimpor.');
          resetStates();
          return;
        }

        // Panggil Server Action untuk mengecek duplikasi di database Supabase
        const checkResult = await checkExistingSantri(normalizedJson);
        
        if (checkResult.error) {
          toast.error(checkResult.error);
          resetStates();
          return;
        }

        // Mapping ke struktur row pratinjau review
        const formattedRows: ReviewRow[] = checkResult.data.map(item => {
          let matchedFormalClass = null;
          let matchedNonFormalClass = null;
          
          if (item.rombel_saat_ini) {
            const cleanRombel = String(item.rombel_saat_ini).trim().toLowerCase();
            const matches = (kelasList || []).filter(
              (k) => String(k.nama_kelas).trim().toLowerCase() === cleanRombel
            );
            matchedFormalClass = matches.find((k) => k.sekolah?.kategori === 'Formal') || null;
            matchedNonFormalClass = matches.find((k) => k.sekolah?.kategori === 'Non-Formal') || null;
          }

          return {
            nis: String(item.nis || '').trim(),
            nama_lengkap: String(item.nama_lengkap || '').trim(),
            nisn: item.nisn ? String(item.nisn).trim() : undefined,
            nik: item.nik ? String(item.nik).trim() : undefined,
            tanggal_lahir: item.tanggal_lahir,
            status: item.status,
            status_import: item.status_import,
            existing_data: item.existing_data,
            rombel_saat_ini: item.rombel_saat_ini || undefined,
            id_kelas_formal: matchedFormalClass?.id || undefined,
            id_kelas_non_formal: matchedNonFormalClass?.id || undefined,
            matched_kelas_formal_name: matchedFormalClass ? `${matchedFormalClass.nama_kelas} (${matchedFormalClass.sekolah?.nama_sekolah})` : undefined,
            matched_kelas_non_formal_name: matchedNonFormalClass ? `${matchedNonFormalClass.nama_kelas} (${matchedNonFormalClass.sekolah?.nama_sekolah})` : undefined,
            checked: true, // Default tercentang untuk di-import
            action_on_duplicate: 'ignore', // Default abaikan jika duplikat
          };
        });

        setReviewRows(formattedRows);
        toast.success(`Pratinjau data dimuat. ${formattedRows.length} baris siap ditinjau.`);
      } catch (err) {
        toast.error('Gagal memproses berkas Excel.');
        resetStates();
      } finally {
        setIsChecking(false);
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  const resetStates = () => {
    setFile(null);
    setReviewRows([]);
    setIsProcessing(false);
    setIsChecking(false);
  };

  // 3. Drag & Drop Event Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // 4. Toggle Checkbox Handlers
  const handleSelectAll = (checked: boolean) => {
    setReviewRows(prev => prev.map(r => ({ ...r, checked })));
  };

  const handleRowCheck = (index: number, checked: boolean) => {
    setReviewRows(prev => {
      const copy = [...prev];
      copy[index].checked = checked;
      return copy;
    });
  };

  const handleActionChange = (index: number, action: 'ignore' | 'update') => {
    setReviewRows(prev => {
      const copy = [...prev];
      copy[index].action_on_duplicate = action;
      return copy;
    });
  };

  // 5. Submit / Eksekusi Impor
  const handleExecuteImport = async () => {
    const selectedRows = reviewRows.filter(r => r.checked);
    if (selectedRows.length === 0) {
      toast.warning('Pilih minimal satu baris santri untuk diimpor.');
      return;
    }

    setIsProcessing(true);
    try {
      // Kelompokkan data baru (.insert)
      const newRows = selectedRows
        .filter(r => r.status_import === 'new')
        .map(r => ({
          nis: r.nis,
          nama_lengkap: r.nama_lengkap,
          nisn: r.nisn || null,
          nik: r.nik || null,
          tanggal_lahir: r.tanggal_lahir || '2000-01-01',
          status: r.status || 'aktif',
          id_kamar: null,
          id_wali: null,
          id_kelas_formal: r.id_kelas_formal || null,
          id_kelas_non_formal: r.id_kelas_non_formal || null
        }));

      // Kelompokkan data update (.upsert)
      const updateRows = selectedRows
        .filter(r => r.status_import === 'exists' && r.action_on_duplicate === 'update')
        .map(r => ({
          id: r.existing_data?.id, // Gunakan UUID dari DB agar ter-update
          nis: r.nis,
          nama_lengkap: r.nama_lengkap,
          nisn: r.nisn || r.existing_data?.nisn || null,
          nik: r.nik || r.existing_data?.nik || null,
          tanggal_lahir: r.tanggal_lahir || r.existing_data?.tanggal_lahir || '2000-01-01',
          status: r.status || r.existing_data?.status || 'aktif',
          id_kamar: r.existing_data?.id_kamar || null,
          id_wali: r.existing_data?.id_wali || null,
          id_kelas_formal: r.id_kelas_formal || r.existing_data?.id_kelas_formal || null,
          id_kelas_non_formal: r.id_kelas_non_formal || r.existing_data?.id_kelas_non_formal || null
        }));

      const ignoredCount = selectedRows.filter(r => r.status_import === 'exists' && r.action_on_duplicate === 'ignore').length;

      if (newRows.length === 0 && updateRows.length === 0) {
        toast.info(`Impor selesai. ${ignoredCount} data duplikat diabaikan.`);
        onSuccess();
        onClose();
        resetStates();
        return;
      }

      // Panggil Server Action executeImport
      const result = await executeImport(newRows, updateRows);
      
      if (result.success) {
        toast.success(
          `Berhasil menambahkan ${result.insertedCount} santri dan memperbarui ${result.updatedCount} data. (${ignoredCount} duplikat diabaikan)`
        );
        onSuccess();
        onClose();
        resetStates();
      } else {
        toast.error(result.error || 'Terjadi kesalahan saat mengimpor data.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal terhubung ke server.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Statistik Review
  const totalSelected = reviewRows.filter(r => r.checked).length;
  const countNew = reviewRows.filter(r => r.status_import === 'new').length;
  const countDuplicate = reviewRows.filter(r => r.status_import === 'exists').length;
  const allChecked = reviewRows.length > 0 && reviewRows.every(r => r.checked);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Import & Tinjau Data Santri</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Download Template & Rules */}
          {!file && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Unduh Format Tabel</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Pastikan format kolom sesuai sebelum diunggah (wajib: <strong>nis</strong> & <strong>nama_lengkap</strong>).</p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700/60 px-3.5 py-2 rounded-xl transition-all shadow-sm flex-shrink-0"
              >
                <Download className="h-4 w-4" />
                Template Excel
              </button>
            </div>
          )}

          {/* Loading Indicator for file analysis */}
          {isChecking && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
              <p className="text-sm text-slate-500 dark:text-zinc-400 font-semibold">Menganalisis data & mengecek duplikasi di Supabase...</p>
            </div>
          )}

          {/* Drag and Drop Zone */}
          {!file && !isChecking && (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-500/5' 
                  : 'border-slate-300 dark:border-zinc-800 hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-zinc-850'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">
                Pilih atau seret file Excel/Dapodik ke sini
              </p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                Mendukung format .xlsx, .xls, atau .csv (Maks. 5MB)
              </p>
            </div>
          )}

          {/* Review Table (File Parsed and Checked) */}
          {file && !isChecking && reviewRows.length > 0 && (
            <div className="space-y-4">
              
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Database className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{reviewRows.length} Total Baris Terdeteksi</p>
                  </div>
                </div>
                <button
                  onClick={resetStates}
                  className="px-2.5 py-1.5 border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  Ganti File
                </button>
              </div>

              {/* Review Table Container */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm max-h-[40vh] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                    <tr className="text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-350 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 w-28">Status Impor</th>
                      <th className="py-3 px-4 w-28">NIS</th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Kelas Terdeteksi</th>
                      <th className="py-3 px-4 w-44">Aksi Jika Duplikat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-slate-700 dark:text-zinc-300">
                    {reviewRows.map((row, index) => {
                      const isExists = row.status_import === 'exists';
                      return (
                        <tr 
                          key={index} 
                          className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors ${
                            isExists ? 'bg-amber-500/5 dark:bg-amber-500/5' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={row.checked}
                              onChange={(e) => handleRowCheck(index, e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {isExists ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                Sudah Ada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                Baru
                              </span>
                            )}
                          </td>
                          {/* NIS */}
                          <td className="py-3.5 px-4 font-mono font-medium">{row.nis}</td>
                          {/* Nama */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{row.nama_lengkap}</p>
                              {isExists && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Lama: <span className="italic">{row.existing_data?.nama_lengkap} (NIS: {row.existing_data?.nis})</span>
                                </p>
                              )}
                            </div>
                          </td>
                          {/* Kelas Terdeteksi */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {row.rombel_saat_ini ? (
                                <p className="text-[10px] text-slate-400">Rombel: <span className="font-semibold text-slate-650 dark:text-zinc-400">{row.rombel_saat_ini}</span></p>
                              ) : null}
                              {row.matched_kelas_formal_name ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-200/30">
                                  Formal: {row.matched_kelas_formal_name}
                                </span>
                              ) : null}
                              {row.matched_kelas_non_formal_name ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-200/30">
                                  Non-Formal: {row.matched_kelas_non_formal_name}
                                </span>
                              ) : null}
                              {!row.matched_kelas_formal_name && !row.matched_kelas_non_formal_name ? (
                                <span className="text-[10px] text-slate-400 italic">Tidak ada kelas cocok</span>
                              ) : null}
                            </div>
                          </td>
                          {/* Action on Duplicate */}
                          <td className="py-3.5 px-4">
                            {isExists ? (
                              <select
                                value={row.action_on_duplicate}
                                onChange={(e) => handleActionChange(index, e.target.value as any)}
                                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none transition-all"
                              >
                                <option value="ignore">Abaikan (Default)</option>
                                <option value="update">Update Data</option>
                              </select>
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-600 italic text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress Loading Executing Import */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                  Memproses impor terpilih ke Supabase...
                </span>
                <span className="font-bold text-emerald-600">Sedang diproses...</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full animate-progress-mock" style={{ width: '90%' }}></div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer (Summary & Action Button) */}
        <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-900/50 flex-shrink-0">
          {/* Footer Stats Summary */}
          <div className="text-xs text-slate-500 dark:text-zinc-400 font-semibold text-center sm:text-left">
            {file && !isChecking && reviewRows.length > 0 ? (
              <span>
                <strong className="text-slate-800 dark:text-white">{totalSelected}</strong> Santri Terpilih &bull;{' '}
                <span className="text-emerald-600 dark:text-emerald-400">{countNew} Baru</span> &bull;{' '}
                <span className="text-amber-600 dark:text-amber-500">{countDuplicate} Duplikat</span>
              </span>
            ) : (
              <span>Unggah berkas untuk melihat ringkasan data.</span>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors w-full sm:w-auto"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={reviewRows.length === 0 || totalSelected === 0 || isProcessing || isChecking}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Proses Import Sekarang
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
