'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  X,
  FileSpreadsheet,
  Loader2,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { checkExistingPegawai, executeImportPegawai } from '@/services/pegawai-import';
import {
  transformDapodikPegawaiData,
  detectHeaderRowIndex,
  buildFlatRows,
} from '@/utils/dapodik-pegawai-transformer';
import type { PegawaiInsertPayload, FlatDapodikRow } from '@/utils/dapodik-pegawai-transformer';
import { toast } from 'sonner';

interface ImportPegawaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ReviewRow {
  nik?: string | null;
  nip?: string | null;
  nuptk?: string | null;
  nama_lengkap: string;
  jabatan?: string;
  status_import: 'new' | 'exists';
  existing_data?: any;
  duplicate_in_file?: boolean;
  payload?: PegawaiInsertPayload;
  checked: boolean;
  action_on_duplicate: 'ignore' | 'update';
}

const SHEET_PTK_NAME = /ptk|gtk|pendidik|tenaga|guru|kepegawaian/i;

function isPtkSheet(keys: string[]): boolean {
  const k = keys.map((x) => String(x || '').trim().toLowerCase());
  return (
    k.some((x) => x === 'nuptk') ||
    k.some((x) => x.includes('jenis ptk')) ||
    k.some((x) => x.includes('jabatan ptk'))
  );
}

interface AnalyzedSheet {
  sheetName: string;
  headerRowIndex: number;
  namaColIndex: number;
  flatRows: FlatDapodikRow[];
  keys: string[];
}

function analyzeSheet(workbook: XLSX.WorkBook, sheetName: string): AnalyzedSheet | null {
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  const headerRowIndex = detectHeaderRowIndex(rawRows);
  if (headerRowIndex < 0) return null;

  const headerRow = rawRows[headerRowIndex] || [];
  let namaColIndex = -1;
  for (let c = 0; c < headerRow.length; c++) {
    const cellStr = String(headerRow[c] ?? '').trim().toLowerCase();
    if (!cellStr) continue;
    if (['sekolah', 'rombel', 'ayah', 'ibu', 'wali', 'gelar'].some((w) => cellStr.includes(w))) continue;
    if (cellStr === 'nama' || cellStr === 'nama lengkap' || cellStr === 'nama_lengkap' || cellStr === 'nama pegawai' || cellStr.includes('nama')) {
      namaColIndex = c;
      break;
    }
  }
  if (namaColIndex < 0) return null;

  const flatRows = buildFlatRows(rawRows, headerRowIndex, namaColIndex);
  const keys = Object.keys(flatRows[0] || {});

  return { sheetName, headerRowIndex, namaColIndex, flatRows, keys };
}

function pickBestSheet(workbook: XLSX.WorkBook): AnalyzedSheet | null {
  const candidates = workbook.SheetNames.map((sn) => analyzeSheet(workbook, sn)).filter((x): x is AnalyzedSheet => x !== null);

  const ptkSheet = candidates.find((c) => isPtkSheet(c.keys));
  if (ptkSheet) return ptkSheet;

  const namedSheet = candidates.find((c) => SHEET_PTK_NAME.test(c.sheetName));
  if (namedSheet) return namedSheet;

  return candidates[0] || null;
}

export function ImportPegawaiModal({ isOpen, onClose, onSuccess }: ImportPegawaiModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    try {
      const headers = [
        {
          no: '1',
          nama: 'Ahmad Fauzi',
          nuptk: '8636756654120001',
          jk: 'L',
          tempat_lahir: 'Bandung',
          tanggal_lahir: '1985-05-15',
          nip: '197001011990011001',
          status_kepegawaian: 'GTY/PTY',
          jenis_ptk: 'Guru',
          gelar_depan: '',
          gelar_belakang: 'S.Pd',
          jenjang: 'S1',
          jurusan_prodi: 'Matematika',
          sertifikasi: 'Matematika',
          tmt_kerja: '2015-07-01',
          tugas_tambahan: 'Wali Kelas',
          nik: '3201020304050001',
          jabatan_ptk: 'Guru Matematika',
        },
        {
          no: '2',
          nama: 'Siti Maryam',
          nuptk: '8636756654120002',
          jk: 'P',
          tempat_lahir: 'Jakarta',
          tanggal_lahir: '1990-02-20',
          nip: '',
          status_kepegawaian: 'Guru Honor Sekolah',
          jenis_ptk: 'Guru',
          gelar_depan: '',
          gelar_belakang: 'S.Pd',
          jenjang: 'S1',
          jurusan_prodi: 'Pendidikan Agama Islam',
          sertifikasi: '',
          tmt_kerja: '2018-03-10',
          tugas_tambahan: '',
          nik: '3201020304050002',
          jabatan_ptk: 'Guru PAI',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(headers);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Pegawai');

      worksheet['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 5 }, { wch: 14 },
        { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 14 },
        { wch: 16 }, { wch: 8 }, { wch: 24 }, { wch: 24 }, { wch: 12 },
        { wch: 20 }, { wch: 18 }, { wch: 20 },
      ];

      XLSX.writeFile(workbook, 'Template_Import_Pegawai.xlsx');
      toast.success('Template Excel berhasil diunduh!');
    } catch {
      toast.error('Gagal mengunduh template.');
    }
  };

  const processFile = (selectedFile: File) => {
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
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

        const sheet = pickBestSheet(workbook);

        if (!sheet) {
          toast.error('Tidak ditemukan sheet berisi kolom "Nama" pada berkas ini.');
          resetStates();
          return;
        }

        const { flatRows, keys } = sheet;

        if (flatRows.length === 0) {
          toast.error('Berkas Excel kosong atau tidak memiliki baris data.');
          resetStates();
          return;
        }

        // Validasi kolom wajib & identitas
        const hasNama = keys.some((key) => {
          const k = key.trim().toLowerCase();
          if (['sekolah', 'rombel', 'ayah', 'ibu', 'wali', 'gelar'].some((w) => k.includes(w))) return false;
          return k === 'nama' || k === 'nama lengkap' || k === 'nama_lengkap' || k === 'nama pegawai' || k.includes('nama');
        });

        if (!hasNama) {
          toast.error(`Berkas harus memiliki kolom "Nama". Kolom terdeteksi: ${keys.slice(0, 6).join(', ')}...`);
          resetStates();
          return;
        }

        const hasIdentifier = keys.some((key) => {
          const k = key.trim().toLowerCase();
          return k === 'nik' || k === 'nip' || k === 'nuptk' || k.includes('nik') || k.includes('nip') || k.includes('nuptk');
        });

        const normalized = transformDapodikPegawaiData(flatRows);

        if (normalized.length === 0) {
          toast.error('Tidak ada baris data valid untuk diimpor.');
          resetStates();
          return;
        }

        if (!hasIdentifier) {
          toast.warning('Kolom NIK/NIP/NUPTK tidak terdeteksi. Seluruh data akan dianggap data baru.');
        }

        const checkResult = await checkExistingPegawai(normalized);

        if (checkResult.error) {
          toast.error(checkResult.error);
          resetStates();
          return;
        }

        const formattedRows: ReviewRow[] = checkResult.data.map((item: PegawaiInsertPayload & { status_import: 'new' | 'exists'; existing_data?: any; duplicate_in_file?: boolean }) => {
          const { status_import, existing_data, duplicate_in_file, ...purePayload } = item;
          return {
            nik: item.nik ? String(item.nik).trim() : null,
            nip: item.nip ? String(item.nip).trim() : null,
            nuptk: item.nuptk ? String(item.nuptk).trim() : null,
            nama_lengkap: String(item.nama_lengkap || '').trim(),
            jabatan: item.jabatan,
            status_import: item.status_import,
            existing_data: item.existing_data,
            duplicate_in_file: item.duplicate_in_file,
            payload: purePayload,
            checked: true,
            action_on_duplicate: 'ignore',
          };
        });

        setReviewRows(formattedRows);
        toast.success(`Pratinjau data dimuat. ${formattedRows.length} baris siap ditinjau.`);
      } catch {
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

  const handleSelectAll = (checked: boolean) => {
    setReviewRows((prev) => prev.map((r) => ({ ...r, checked })));
  };

  const handleRowCheck = (index: number, checked: boolean) => {
    setReviewRows((prev) => {
      const copy = [...prev];
      copy[index].checked = checked;
      return copy;
    });
  };

  const handleActionChange = (index: number, action: 'ignore' | 'update') => {
    setReviewRows((prev) => {
      const copy = [...prev];
      copy[index].action_on_duplicate = action;
      return copy;
    });
  };

  const handleExecuteImport = async () => {
    const selectedRows = reviewRows.filter((r) => r.checked);
    if (selectedRows.length === 0) {
      toast.warning('Pilih minimal satu baris pegawai untuk diimpor.');
      return;
    }

    setIsProcessing(true);
    try {
      const newRows = selectedRows
        .filter((r) => r.status_import === 'new')
        .map((r) => {
          const p: PegawaiInsertPayload = r.payload || ({} as PegawaiInsertPayload);
          return {
            ...p,
            nama_lengkap: p.nama_lengkap || r.nama_lengkap,
            jabatan: p.jabatan || r.jabatan || 'Lainnya',
            status: 'Aktif',
            qr_code_url: null,
            id_sekolah: null,
          };
        });

      const updateRows = selectedRows
        .filter((r) => r.status_import === 'exists' && r.action_on_duplicate === 'update' && r.existing_data?.id)
        .map((r) => {
          const f: PegawaiInsertPayload = r.payload || ({} as PegawaiInsertPayload);
          const e: any = r.existing_data || {};
          return {
            id: e.id,
            nik: f.nik || e.nik || null,
            nip: e.nip || f.nip || null,
            nuptk: f.nuptk || e.nuptk || null,
            nama_lengkap: f.nama_lengkap || e.nama_lengkap || '',
            gelar_depan: f.gelar_depan ?? e.gelar_depan ?? null,
            gelar_belakang: f.gelar_belakang ?? e.gelar_belakang ?? null,
            jabatan: f.jabatan || e.jabatan || 'Lainnya',
            jenis_kelamin: f.jenis_kelamin ?? e.jenis_kelamin ?? null,
            tempat_lahir: f.tempat_lahir ?? e.tempat_lahir ?? null,
            tanggal_lahir: f.tanggal_lahir ?? e.tanggal_lahir ?? null,
            alamat: f.alamat ?? e.alamat ?? null,
            no_hp: f.no_hp ?? e.no_hp ?? null,
            email: f.email ?? e.email ?? null,
            foto_url: f.foto_url || e.foto_url || null,
            pendidikan_terakhir: f.pendidikan_terakhir ?? e.pendidikan_terakhir ?? null,
            spesialisasi: f.spesialisasi ?? e.spesialisasi ?? null,
            tanggal_bergabung: f.tanggal_bergabung ?? e.tanggal_bergabung ?? null,
            status: e.status || 'Aktif',
            qr_code_url: e.qr_code_url || null,
            id_sekolah: e.id_sekolah || null,
          };
        });

      const ignoredCount = selectedRows.filter(
        (r) => r.status_import === 'exists' && (r.action_on_duplicate === 'ignore' || !r.existing_data?.id)
      ).length;

      if (newRows.length === 0 && updateRows.length === 0) {
        toast.info(`Impor selesai. ${ignoredCount} data duplikat diabaikan.`);
        onSuccess();
        onClose();
        resetStates();
        return;
      }

      const result = await executeImportPegawai(newRows, updateRows);

      if (result.success) {
        toast.success(
          `Berhasil menambahkan ${result.insertedCount} pegawai dan memperbarui ${result.updatedCount} data. (${ignoredCount} duplikat diabaikan)`
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

  const totalSelected = reviewRows.filter((r) => r.checked).length;
  const countNew = reviewRows.filter((r) => r.status_import === 'new').length;
  const countDuplicate = reviewRows.filter((r) => r.status_import === 'exists').length;
  const allChecked = reviewRows.length > 0 && reviewRows.every((r) => r.checked);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 flex flex-col max-h-[90vh]">

        <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Import & Tinjau Data Pegawai (Dapodik)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {!file && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Unduh Format Tabel</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Pastikan format kolom sesuai sebelum diunggah (wajib: <strong>Nama</strong>).
                  Identitas <strong>NIK / NIP / NUPTK</strong> dipakai untuk mendeteksi data yang sudah ada.
                </p>
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

          {isChecking && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
              <p className="text-sm text-slate-500 dark:text-zinc-400 font-semibold">Menganalisis data & mengecek duplikasi di Supabase...</p>
            </div>
          )}

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
                Mendukung format .xlsx, .xls, atau .csv
              </p>
            </div>
          )}

          {file && !isChecking && reviewRows.length > 0 && (
            <div className="space-y-4">

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

              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm max-h-[40vh] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                    <tr className="text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 w-28">Status Impor</th>
                      <th className="py-3 px-4 w-40">NIK / NIP / NUPTK</th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4 w-40">Jabatan Terdeteksi</th>
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
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={row.checked}
                              onChange={(e) => handleRowCheck(index, e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
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
                          <td className="py-3.5 px-4 font-mono font-medium">
                            <div className="space-y-0.5">
                              {row.nik && <span className="block">NIK: {row.nik}</span>}
                              {row.nip && <span className="block">NIP: {row.nip}</span>}
                              {row.nuptk && <span className="block">NUPTK: {row.nuptk}</span>}
                              {!row.nik && !row.nip && !row.nuptk && <span className="text-slate-400 italic">-</span>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{row.nama_lengkap}</p>
                              {isExists && row.existing_data?.id && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Lama: <span className="italic">{row.existing_data.nama_lengkap}</span>
                                </p>
                              )}
                              {isExists && row.duplicate_in_file && (
                                <p className="flex items-center gap-1 text-[10px] text-amber-600 mt-0.5">
                                  <AlertTriangle className="h-3 w-3" />
                                  Duplikat dalam file yang sama
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/30">
                              {row.jabatan || 'Lainnya'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {isExists && row.existing_data?.id ? (
                              <select
                                value={row.action_on_duplicate}
                                onChange={(e) => handleActionChange(index, e.target.value as 'ignore' | 'update')}
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
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>
          )}

        </div>

        <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-900/50 flex-shrink-0">
          <div className="text-xs text-slate-500 dark:text-zinc-400 font-semibold text-center sm:text-left">
            {file && !isChecking && reviewRows.length > 0 ? (
              <span>
                <strong className="text-slate-800 dark:text-white">{totalSelected}</strong> Pegawai Terpilih &bull;{' '}
                <span className="text-emerald-600 dark:text-emerald-400">{countNew} Baru</span> &bull;{' '}
                <span className="text-amber-600 dark:text-amber-500">{countDuplicate} Duplikat</span>
              </span>
            ) : (
              <span>Unggah berkas untuk melihat ringkasan data.</span>
            )}
          </div>

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
