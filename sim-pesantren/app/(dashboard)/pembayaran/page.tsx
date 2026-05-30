'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri, Tagihan } from '@/types/database';
import {
  Search,
  Check,
  CreditCard,
  Printer,
  ChevronRight,
  User,
  AlertCircle,
  TrendingDown,
  DollarSign,
  Loader2,
  Calendar,
  Layers,
  PrinterIcon
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function CashierPaymentPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Santri[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected Santri & Bills
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);
  const [bills, setBills] = useState<(Tagihan & { checked?: boolean })[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);

  // Payment dialog modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Receipt modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [paidBillsReceipt, setPaidBillsReceipt] = useState<Tagihan[]>([]);
  const [receiptCashReceived, setReceiptCashReceived] = useState<number>(0);

  // Search handler
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('santri')
        .select(`
          *,
          kamar:id_kamar (*),
          kelas_formal:id_kelas_formal (*)
        `)
        .or(`nama_lengkap.ilike.%${query}%,nisn.ilike.%${query}%,nis.ilike.%${query}%`)
        .eq('status', 'aktif')
        .limit(8);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err: any) {
      console.error('Error searching student:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  // Fetch unpaid bills when student is selected
  const fetchStudentBills = useCallback(async (santriId: string) => {
    setLoadingBills(true);
    try {
      const { data, error } = await supabase
        .from('tagihan')
        .select(`
          *,
          master_biaya:id_master_biaya (*)
        `)
        .eq('id_santri', santriId)
        .eq('status', 'Belum Lunas')
        .order('tahun', { ascending: false })
        .order('bulan', { ascending: false });

      if (error) throw error;
      // Mark all as initially checked for faster input
      const billsWithChecked = (data || []).map((b: any) => ({ ...b, checked: true }));
      setBills(billsWithChecked);
    } catch (err: any) {
      console.error('Error fetching bills:', err);
      toast.error('Gagal mengambil data tagihan.');
    } finally {
      setLoadingBills(false);
    }
  }, []);

  // Sync search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleSelectSantri = (santri: Santri) => {
    setSelectedSantri(santri);
    setSearchQuery('');
    setSearchResults([]);
    fetchStudentBills(santri.id);
  };

  // Toggle selection for individual bills
  const handleToggleBill = (billId: string) => {
    setBills(prev =>
      prev.map(b => (b.id === billId ? { ...b, checked: !b.checked } : b))
    );
  };

  // Select all or deselect all
  const handleToggleAllBills = (checked: boolean) => {
    setBills(prev => prev.map(b => ({ ...b, checked })));
  };

  // Calculations
  const selectedBills = bills.filter(b => b.checked);
  const totalTunggakan = bills.reduce((sum, b) => sum + Number(b.nominal), 0);
  const totalSelectedAmount = selectedBills.reduce((sum, b) => sum + Number(b.nominal), 0);

  const getBulanName = (monthNumber: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[monthNumber - 1] || '';
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Payment processors
  const cashReceived = Number(cashAmount.replace(/[^0-9]/g, '')) || 0;
  const changeDue = cashReceived - totalSelectedAmount;

  const handleOpenPayment = () => {
    if (selectedBills.length === 0) {
      toast.error('Pilih minimal satu tagihan untuk dibayar.');
      return;
    }
    setCashAmount(totalSelectedAmount.toString());
    setIsPayModalOpen(true);
  };

  const handleProcessPayment = async () => {
    if (cashReceived < totalSelectedAmount) {
      toast.error('Jumlah uang yang dimasukkan kurang dari total tagihan.');
      return;
    }

    setProcessingPayment(true);
    try {
      const selectedIds = selectedBills.map(b => b.id);

      // Perform bulk updates to table tagihan
      const { error } = await supabase
        .from('tagihan')
        .update({ status: 'Lunas' })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success('Pembayaran berhasil diproses!');
      setIsPayModalOpen(false);

      // Set state for receipt display
      setPaidBillsReceipt(selectedBills);
      setReceiptCashReceived(cashReceived);
      
      // Prompt user to print receipt
      if (confirm('Pembayaran Sukses. Cetak Kuitansi?')) {
        setIsReceiptModalOpen(true);
      }

      // Reload bills
      if (selectedSantri) {
        fetchStudentBills(selectedSantri.id);
      }
    } catch (err: any) {
      console.error('Error paying bills:', err);
      toast.error('Gagal memproses pembayaran: ' + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-emerald-600" /> Terminal Kasir Pembayaran
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
          Kasir Penerimaan Pembayaran dan Tagihan Santri Aktif Pesantren.
        </p>
      </div>

      {/* Main Grid: Search & Profil (Left/Top) and Bills Table (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Search & Profil Ringkas */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Card: Pencarian Santri */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Pencarian Santri</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Masukkan Nama, NIS, atau NISN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-850 dark:text-zinc-100 focus:outline-none transition-all"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              )}
            </div>

            {/* Floating Autocomplete Search Results */}
            {searchResults.length > 0 && (
              <div className="border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-850">
                {searchResults.map((santri) => (
                  <button
                    key={santri.id}
                    onClick={() => handleSelectSantri(santri)}
                    className="w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800/60 flex items-center justify-between text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {santri.nama_lengkap.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{santri.nama_lengkap}</p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">NIS: {santri.nis} | NISN: {santri.nisn || '—'}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card: Profil Ringkas */}
          {selectedSantri ? (
            <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 dark:from-emerald-950/20 dark:to-emerald-900/10 border border-emerald-250/25 dark:border-emerald-500/10 p-5 rounded-2xl shadow-sm space-y-5">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Profil Santri</h3>
              
              <div className="flex items-center gap-4">
                {selectedSantri.foto_url ? (
                  <Image
                    src={selectedSantri.foto_url}
                    alt={selectedSantri.nama_lengkap}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full object-cover border-2 border-emerald-500/30 shadow-md flex-shrink-0"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-emerald-600 text-white border-2 border-emerald-500/30 flex items-center justify-center font-bold text-lg uppercase shadow-md flex-shrink-0">
                    {selectedSantri.nama_lengkap.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight truncate">
                    {selectedSantri.nama_lengkap}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 mt-1">NIS: {selectedSantri.nis}</p>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                    Kelas: {selectedSantri.kelas_formal?.nama_kelas || '—'}
                  </p>
                </div>
              </div>

              {/* Total Tunggakan Stats Box */}
              <div className="bg-white dark:bg-zinc-900/50 border border-emerald-500/10 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-wider">Total Tunggakan</p>
                  <p className="text-lg font-black text-rose-600 dark:text-rose-450 mt-1">{formatRupiah(totalTunggakan)}</p>
                </div>
                <div className="h-10 w-10 bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 text-center rounded-2xl shadow-sm flex flex-col items-center justify-center">
              <div className="h-12 w-12 bg-slate-50 dark:bg-zinc-850 rounded-xl flex items-center justify-center text-slate-400 dark:text-zinc-650 border border-slate-100 dark:border-zinc-800 mb-3 shadow-inner">
                <User className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-xs text-slate-600 dark:text-zinc-300">Belum Ada Santri Terpilih</h4>
              <p className="text-[10px] text-slate-450 dark:text-zinc-500 mt-1 max-w-[200px]">
                Silakan cari dan pilih santri di kotak pencarian diatas untuk memulai kasir pembayaran.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Daftar Tagihan */}
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[450px]">
            
            {/* Table Header Controls */}
            <div className="p-5 border-b border-slate-150 dark:border-zinc-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Daftar Tagihan Belum Lunas</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Pilih atau centang tagihan yang akan dibayarkan.</p>
              </div>
              
              {selectedSantri && bills.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleAllBills(true)}
                    className="px-2.5 py-1.5 border border-slate-200 dark:border-zinc-800 text-[10px] font-bold rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Pilih Semua
                  </button>
                  <button
                    onClick={() => handleToggleAllBills(false)}
                    className="px-2.5 py-1.5 border border-slate-200 dark:border-zinc-800 text-[10px] font-bold rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Batal Semua
                  </button>
                </div>
              )}
            </div>

            {/* Bills Data Grid */}
            <div className="flex-1 overflow-x-auto">
              {!selectedSantri ? (
                <div className="h-full flex flex-col items-center justify-center p-10 text-center text-slate-400 py-24">
                  <AlertCircle className="h-10 w-10 stroke-[1.5] text-slate-300 dark:text-zinc-700 mb-3" />
                  <h4 className="font-bold text-xs text-slate-600 dark:text-zinc-400">Menunggu Pilihan Santri</h4>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Rincian tagihan akan tampil setelah memilih salah satu santri aktif.</p>
                </div>
              ) : loadingBills ? (
                <div className="h-full flex items-center justify-center p-10 py-24">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                </div>
              ) : bills.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-10 text-center text-slate-400 py-24">
                  <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-500/10 mb-3">
                    <Check className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-700 dark:text-zinc-300">Semua Tagihan Lunas</h4>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Santri ini tidak memiliki tunggakan tagihan aktif.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-5 w-12 text-center">Pilih</th>
                      <th className="py-3 px-5">Nama Tagihan</th>
                      <th className="py-3 px-5">Periode</th>
                      <th className="py-3 px-5 text-right">Nominal</th>
                      <th className="py-3 px-5 text-right">Terbayar</th>
                      <th className="py-3 px-5 text-right">Sisa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-xs">
                    {bills.map((bill) => {
                      const costName = bill.master_biaya?.nama_biaya || 'Tagihan Bulanan';
                      const periodName = `${getBulanName(bill.bulan)} ${bill.tahun}`;
                      const amount = Number(bill.nominal);
                      
                      return (
                        <tr
                          key={bill.id}
                          onClick={() => handleToggleBill(bill.id)}
                          className={`hover:bg-slate-50/60 dark:hover:bg-zinc-850/20 cursor-pointer transition-colors ${
                            bill.checked ? 'bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]' : ''
                          }`}
                        >
                          <td className="py-3.5 px-5 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={!!bill.checked}
                              onChange={() => handleToggleBill(bill.id)}
                              className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                            />
                          </td>
                          <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Layers className="h-3.5 w-3.5 text-slate-400" />
                            {costName}
                          </td>
                          <td className="py-3.5 px-5 text-slate-500 dark:text-zinc-400 font-medium">
                            <Calendar className="h-3.5 w-3.5 inline mr-1 text-slate-455" />
                            {periodName}
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono text-slate-700 dark:text-zinc-300">{formatRupiah(amount)}</td>
                          <td className="py-3.5 px-5 text-right font-mono text-slate-400">Rp0</td>
                          <td className="py-3.5 px-5 text-right font-bold font-mono text-slate-900 dark:text-white">{formatRupiah(amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Checkout Section */}
            {selectedSantri && bills.length > 0 && (
              <div className="bg-slate-50/70 dark:bg-zinc-950/40 border-t border-slate-150 dark:border-zinc-850 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-wider">Total Terpilih ({selectedBills.length} Tagihan)</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-450 mt-1">{formatRupiah(totalSelectedAmount)}</p>
                </div>
                
                <button
                  onClick={handleOpenPayment}
                  disabled={selectedBills.length === 0}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/10 transition-all active:scale-95 duration-200 text-sm"
                >
                  <CreditCard className="h-4.5 w-4.5" />
                  Bayar Sekarang
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal 1: Input Pembayaran Kasir */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsPayModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-950/40">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Form Pembayaran Kasir</h3>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              
              {/* Payment Summary */}
              <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800/80 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Tagihan:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(totalSelectedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Uang Diterima:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-450">{formatRupiah(cashReceived)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-zinc-850/80 pt-2 flex justify-between">
                  <span className="text-slate-400 font-bold">Kembalian:</span>
                  <span className={`font-black ${changeDue >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {changeDue >= 0 ? formatRupiah(changeDue) : 'Belum Cukup'}
                  </span>
                </div>
              </div>

              {/* Cash Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Uang Fisik Diterima</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">Rp</span>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nominal cash..."
                    value={cashAmount ? formatRupiah(Number(cashAmount.replace(/[^0-9]/g, ''))).replace('Rp', '').trim() : ''}
                    onChange={e => setCashAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-3 text-lg font-bold font-mono text-slate-900 dark:text-white focus:outline-none transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Fast Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[totalSelectedAmount, 50000, 100000, 150000, 200000, 300000].map((num) => (
                  <button
                    key={num}
                    onClick={() => setCashAmount(num.toString())}
                    className="py-2 text-[10px] font-bold border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-slate-600 dark:text-zinc-300"
                  >
                    {formatRupiah(num)}
                  </button>
                ))}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end gap-2 bg-slate-50/50 dark:bg-zinc-900/50">
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-600 dark:text-zinc-300"
              >
                Batal
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={cashReceived < totalSelectedAmount || processingPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
              >
                {processingPayment && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                Proses Bayar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal 2: Receipt Kuitansi Pembayaran */}
      {isReceiptModalOpen && selectedSantri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" onClick={() => setIsReceiptModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-950/40 print:hidden">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-emerald-600" /> Kuitansi Pembayaran
              </h3>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Modal Printable Content */}
            <div id="receipt-print-area" className="p-8 space-y-6 overflow-y-auto flex-1 bg-white text-slate-900">
              
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-4 border-b-2 border-dashed border-slate-200">
                <h2 className="text-base font-black tracking-widest text-emerald-700 uppercase">PONDOK PESANTREN AL-FALAH</h2>
                <p className="text-[10px] text-slate-500">Jl. Kyai Haji Hasyim Asy'ari No. 12, Jawa Timur</p>
                <p className="text-[10px] text-slate-500 font-mono">Tlp: (0321) 888888 | WhatsApp: +62 812-3456-7890</p>
              </div>

              {/* Receipt Info */}
              <div className="grid grid-cols-2 gap-y-1.5 text-[10px] text-slate-600">
                <div>
                  <span className="text-slate-400">No. Kuitansi:</span>
                  <span className="font-mono font-bold block">PP-{Date.now().toString().slice(-8)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Tanggal:</span>
                  <span className="font-bold block">{new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                </div>
                <div className="pt-2">
                  <span className="text-slate-400">Nama Santri:</span>
                  <span className="font-bold block uppercase">{selectedSantri.nama_lengkap}</span>
                </div>
                <div className="text-right pt-2">
                  <span className="text-slate-400">Kelas / Kamar:</span>
                  <span className="font-bold block">{selectedSantri.kelas_formal?.nama_kelas || '—'} / {selectedSantri.kamar?.nama_kamar || '—'}</span>
                </div>
              </div>

              {/* Table Bill items paid */}
              <div className="space-y-2 border-t border-b border-slate-200 py-3">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Rincian Pembayaran</div>
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 font-bold text-slate-500">
                      <th className="py-1">Tagihan</th>
                      <th className="py-1">Periode</th>
                      <th className="py-1 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {paidBillsReceipt.map((bill) => (
                      <tr key={bill.id}>
                        <td className="py-1.5 font-bold uppercase">{bill.master_biaya?.nama_biaya || 'Tagihan'}</td>
                        <td className="py-1.5">{getBulanName(bill.bulan)} {bill.tahun}</td>
                        <td className="py-1.5 text-right">{formatRupiah(Number(bill.nominal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Receipt Totals */}
              <div className="flex flex-col items-end gap-1.5 text-[10px]">
                <div className="w-48 flex justify-between font-mono">
                  <span className="text-slate-400">Jumlah Tagihan:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(totalSelectedAmount)}</span>
                </div>
                <div className="w-48 flex justify-between font-mono">
                  <span className="text-slate-400">Uang Diterima:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(receiptCashReceived)}</span>
                </div>
                <div className="w-48 flex justify-between font-mono border-t border-slate-200 pt-1">
                  <span className="font-bold">Kembalian:</span>
                  <span className="font-black text-emerald-700">{formatRupiah(receiptCashReceived - totalSelectedAmount)}</span>
                </div>
              </div>

              {/* Receipt Footer Signatures */}
              <div className="grid grid-cols-2 pt-8 text-center text-[10px] text-slate-500">
                <div>
                  <p>Penyetor,</p>
                  <div className="h-12" />
                  <p className="border-b border-slate-300 w-24 mx-auto font-bold uppercase">{selectedSantri.nama_lengkap.split(' ')[0]}</p>
                </div>
                <div>
                  <p>Petugas Kasir,</p>
                  <div className="h-12" />
                  <p className="border-b border-slate-300 w-24 mx-auto font-bold">Keuangan Admin</p>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-400 border-t border-dashed border-slate-200 pt-4">
                Terima kasih atas pembayaran Anda. Kuitansi ini sah sebagai bukti pembayaran resmi.
              </div>

            </div>

            {/* Modal Receipt Footer Controls */}
            <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50 print:hidden">
              <span className="text-[10px] text-slate-400">Tekan Cetak untuk print kuitansi fisik</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-650 dark:text-zinc-300"
                >
                  Tutup
                </button>
                <button
                  onClick={triggerPrint}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Cetak Kuitansi
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Print Specific Inline Styling for Receipt printer */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area, #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
            color: black !important;
          }
          .print\:hidden {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
