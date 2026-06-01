'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri, Tagihan } from '@/types/database';
import { sendPaymentNotification } from '@/services/whatsapp-actions';
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
  PrinterIcon,
  History,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function CashierPaymentPage() {
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'kasir' | 'riwayat'>('kasir');
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Santri[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected Santri & Bills
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);
  const [bills, setBills] = useState<(Tagihan & { checked?: boolean; bayarSekarang?: string })[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);

  // Payment dialog modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Receipt modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [paidBillsReceipt, setPaidBillsReceipt] = useState<Tagihan[]>([]);
  const [receiptCashReceived, setReceiptCashReceived] = useState<number>(0);
  
  // Dynamic Pesantren and active cashier profile state
  const [pesantrenProfile, setPesantrenProfile] = useState({
    nama_pesantren: 'SIM Pesantren',
    alamat: '',
    telepon: '',
    email: ''
  });
  const [activeCashierName, setActiveCashierName] = useState('Admin');

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
          kelas_formal:id_kelas_formal (*),
          wali:id_wali (id, nama_lengkap, no_hp)
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
      // Mark all as initially unchecked
      const billsWithChecked = (data || []).map((b: any) => ({
        ...b,
        checked: false,
        bayarSekarang: ''
      }));
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

  // Load Pesantren Profile & Logged In Cashier Profile details
  useEffect(() => {
    const loadProfileAndCashier = async () => {
      try {
        // Load Pesantren Profile details
        const { data: pesData } = await supabase
          .from('pesantren_profile')
          .select('nama_pesantren, alamat, telepon, email')
          .maybeSingle();
        if (pesData) {
          setPesantrenProfile({
            nama_pesantren: pesData.nama_pesantren || 'SIM Pesantren',
            alamat: pesData.alamat || '',
            telepon: pesData.telepon || '',
            email: pesData.email || ''
          });
        }

        // Load active logged in user profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: uProfile } = await supabase
            .from('profiles')
            .select('nama_lengkap')
            .eq('id', user.id)
            .maybeSingle();
          if (uProfile) {
            setActiveCashierName(uProfile.nama_lengkap || 'Admin');
          }
        }
      } catch (err) {
        console.error('Error fetching profiles on mount:', err);
      }
    };
    loadProfileAndCashier();
  }, []);

  const handleSelectSantri = (santri: Santri) => {
    setSelectedSantri(santri);
    setSearchQuery('');
    setSearchResults([]);
    fetchStudentBills(santri.id);
  };

  // Toggle selection for individual bills
  const handleToggleBill = (billId: string) => {
    setBills(prev =>
      prev.map(b => {
        if (b.id === billId) {
          const sisa = Number(b.nominal) - (Number(b.terbayar) || 0);
          const nextChecked = !b.checked;
          return {
            ...b,
            checked: nextChecked,
            bayarSekarang: nextChecked && !b.bayarSekarang ? sisa.toString() : b.bayarSekarang
          };
        }
        return b;
      })
    );
  };

  // Select all or deselect all
  const handleToggleAllBills = (checked: boolean) => {
    setBills(prev =>
      prev.map(b => {
        if (!checked) return { ...b, checked: false };
        const sisa = Number(b.nominal) - (Number(b.terbayar) || 0);
        return {
          ...b,
          checked: true,
          bayarSekarang: b.bayarSekarang ? b.bayarSekarang : sisa.toString()
        };
      })
    );
  };

  // Set individual payment amount for a bill
  const handleUpdateBillPaymentAmount = (billId: string, val: string) => {
    setBills(prev =>
      prev.map(b => {
        if (b.id === billId) {
          const sisa = Number(b.nominal) - (Number(b.terbayar) || 0);
          // Clamp the input amount between 0 and sisa
          const numVal = Number(val.replace(/[^0-9]/g, '')) || 0;
          const clamped = Math.min(numVal, sisa);
          return {
            ...b,
            bayarSekarang: clamped.toString()
          };
        }
        return b;
      })
    );
  };

  // Calculations
  const selectedBills = bills.filter(b => b.checked);
  const totalTunggakan = bills.reduce((sum, b) => sum + (Number(b.nominal) - (Number(b.terbayar) || 0)), 0);
  const totalSelectedAmount = selectedBills.reduce((sum, b) => sum + (Number(b.bayarSekarang) || 0), 0);

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
    // Verify that all selected bills have payment amount > 0
    const hasZeroPayment = selectedBills.some(b => (Number(b.bayarSekarang) || 0) <= 0);
    if (hasZeroPayment) {
      toast.error('Nominal bayar untuk tagihan terpilih tidak boleh Rp0.');
      return;
    }

    setCashAmount(totalSelectedAmount.toString());
    setIsPayModalOpen(true);
  };

  const handleProcessPayment = async () => {
    setProcessingPayment(true);
    try {
      // 1. Get current logged in user (admin)
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id || null;

      // 2. Waterfall distribution: prioritaskan tagihan terlama (tahun ASC, bulan ASC)
      const sortedBills = [...selectedBills].sort((a, b) => 
        Number(a.tahun) - Number(b.tahun) || Number(a.bulan) - Number(b.bulan)
      );
      const paymentPlan = sortedBills.map(bill => {
        const billMax = Number(bill.bayarSekarang) || 0;
        const sisa = Number(bill.nominal) - (Number(bill.terbayar) || 0);
        const maxForBill = Math.min(billMax, sisa);
        return { bill, maxForBill };
      });

      let remainingCash = cashReceived;
      const planWithAmounts = paymentPlan.map(({ bill, maxForBill }) => {
        const payNow = Math.min(maxForBill, Math.max(0, remainingCash));
        remainingCash -= payNow;
        return { bill, payNow };
      });

      const updatePromises = planWithAmounts.map(async ({ bill, payNow }) => {
        const currentTerbayar = Number(bill.terbayar) || 0;
        const nextTerbayar = currentTerbayar + payNow;
        const nominal = Number(bill.nominal);
        const nextStatus = nextTerbayar >= nominal ? 'Lunas' : 'Belum Lunas';

        // Update tagihan status and terbayar
        const { error: updateError } = await supabase
          .from('tagihan')
          .update({
            terbayar: nextTerbayar,
            status: nextStatus
          })
          .eq('id', bill.id);

        if (updateError) throw updateError;

        // Insert audit log to pembayaran
        const { error: insertError } = await supabase
          .from('pembayaran')
          .insert({
            id_santri: selectedSantri?.id,
            id_tagihan: bill.id,
            id_admin: adminId,
            jumlah: payNow,
            status: nextStatus,
            tanggal_bayar: new Date().toISOString()
          });

        if (insertError) throw insertError;
        
        return payNow;
      });

      const paidAmounts = await Promise.all(updatePromises);

      toast.success('Pembayaran berhasil diproses!');

      // Kirim notifikasi WhatsApp ke kontak santri
      try {
        const rawPhone = (selectedSantri as any)?.hp;
        if (!rawPhone) {
          toast.info('Tidak ada nomor HP kontak santri untuk notifikasi WhatsApp.');
        } else {
          let cleaned = rawPhone.replace(/\D/g, '');
          if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
          else if (!cleaned.startsWith('62')) cleaned = '62' + cleaned;

          const totalNominal = selectedBills.reduce((s: number, b: any) => s + (Number(b.nominal) || 0), 0);
          const jumlahBayar = paidAmounts.reduce((s: number, a: number) => s + a, 0);
          const sisaBefore = selectedBills.reduce((s: number, b: any) => s + (Number(b.nominal) - (Number(b.terbayar) || 0)), 0);
          const sisaAfter = sisaBefore - jumlahBayar;

          const items = selectedBills.map((b: any) => {
            const name = b.master_biaya?.nama_biaya || 'Tagihan';
            const period = `${getBulanName(b.bulan)} ${b.tahun}`;
            return `• ${name} (${period})`;
          }).join('\n');

          const msg = `Assalamu'alaikum Wr. Wb.

Yth. Orang Tua/Wali Santri,

Dengan hormat, kami sampaikan bahwa ananda *${selectedSantri?.nama_lengkap}* telah melakukan pembayaran pesantren dengan rincian sebagai berikut:

${items}

Total Tagihan: Rp${totalNominal.toLocaleString('id-ID')}
Jumlah Dibayar: Rp${jumlahBayar.toLocaleString('id-ID')}
Sisa Tagihan: Rp${Math.max(0, sisaAfter).toLocaleString('id-ID')}

Terima kasih atas perhatian dan kerjasamanya.

Wassalamu'alaikum Wr. Wb.

*${pesantrenProfile.nama_pesantren}*`;

          toast.info('Mengirim notifikasi WhatsApp...');
          const res = await sendPaymentNotification(cleaned, msg);
          if (res.status) {
            toast.success('Notifikasi WhatsApp berhasil dikirim.');
          } else if (res.skipped) {
            toast.info('Notifikasi WhatsApp dilewati (token Fonnte belum dikonfigurasi).');
          } else {
            toast.error('Gagal mengirim notifikasi WhatsApp. Silakan cek konfigurasi Fonnte.');
          }
        }
      } catch (e) {
        console.error('Error sending WhatsApp notification:', e);
        toast.error('Terjadi kesalahan saat mengirim notifikasi WhatsApp.');
      }

      setIsPayModalOpen(false);

      const receiptBills = selectedBills.map((b, i) => ({
        ...b,
        jumlahDibayar: paidAmounts[i] || 0
      }));

      // Set state for receipt display
      setPaidBillsReceipt(receiptBills);
      setReceiptCashReceived(cashReceived);
      
      // Prompt user to print receipt
      if (confirm('Pembayaran Sukses. Cetak Kuitansi?')) {
        setIsReceiptModalOpen(true);
      }

      // Reload bills
      if (selectedSantri) {
        fetchStudentBills(selectedSantri.id);
      }
      // Also fetch history
      fetchPaymentHistory();
    } catch (err: any) {
      console.error('Error paying bills:', err);
      toast.error('Gagal memproses pembayaran: ' + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Fetch payment history
  const fetchPaymentHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      let query = supabase
        .from('pembayaran')
        .select(`
          id,
          jumlah,
          tanggal_bayar,
          created_at,
          santri:id_santri (id, nama_lengkap, nis, kamar:id_kamar (nama_kamar), kelas_formal:id_kelas_formal (nama_kelas), wali:id_wali (id, nama_lengkap, no_hp)),
          tagihan:id_tagihan (
            id,
            bulan,
            tahun,
            master_biaya:id_master_biaya (nama_biaya)
          ),
          admin:id_admin (id, nama_lengkap)
        `);

      if (selectedSantri) {
        query = query.eq('id_santri', selectedSantri.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error detail:', error);
        throw error;
      }
      setPaymentHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching payment history:', err);
      toast.error('Gagal mengambil riwayat pembayaran: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedSantri]);

  // Fetch history on mount, when tab switches, or selected student changes
  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  const handleCancelTransaction = async (paymentId: string, billId: string, amountPaid: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan/menghapus transaksi pembayaran ini? Nominal terbayar pada tagihan akan dikembalikan.')) {
      return;
    }

    try {
      // 1. Fetch current tagihan status
      const { data: billData, error: fetchError } = await supabase
        .from('tagihan')
        .select('terbayar, nominal')
        .eq('id', billId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (billData) {
        const nextTerbayar = Math.max(0, (Number(billData.terbayar) || 0) - amountPaid);
        const nextStatus = nextTerbayar >= Number(billData.nominal) ? 'Lunas' : 'Belum Lunas';

        // 2. Revert tagihan values
        const { error: updateError } = await supabase
          .from('tagihan')
          .update({
            terbayar: nextTerbayar,
            status: nextStatus
          })
          .eq('id', billId);

        if (updateError) throw updateError;
      }

      // 3. Delete pembayaran record
      const { error: deleteError } = await supabase
        .from('pembayaran')
        .delete()
        .eq('id', paymentId);

      if (deleteError) throw deleteError;

      toast.success('Transaksi berhasil dibatalkan.');

      // 4. Reload data
      fetchPaymentHistory();
      if (selectedSantri) {
        fetchStudentBills(selectedSantri.id);
      }
    } catch (err: any) {
      console.error('Error canceling transaction:', err);
      toast.error('Gagal membatalkan transaksi: ' + err.message);
    }
  };

  const handleSendBillReminder = async () => {
    const rawPhone = (selectedSantri as any)?.hp;
    if (!rawPhone) {
      toast.info('Tidak ada nomor HP kontak santri.');
      return;
    }
    if (bills.length === 0) {
      toast.info('Tidak ada tagihan yang belum lunas.');
      return;
    }

    try {
      let cleaned = rawPhone.replace(/\D/g, '');
      if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
      else if (!cleaned.startsWith('62')) cleaned = '62' + cleaned;

      const items = bills.map((b: any, i: number) => {
        const name = b.master_biaya?.nama_biaya || 'Tagihan';
        const period = `${getBulanName(b.bulan)} ${b.tahun}`;
        const nominal = Number(b.nominal) || 0;
        const terbayar = Number(b.terbayar) || 0;
        const sisa = nominal - terbayar;
        return `${i + 1}. ${name} (${period}) - Rp${nominal.toLocaleString('id-ID')} (Sisa: Rp${sisa.toLocaleString('id-ID')})`;
      }).join('\n');

      const msg = `Assalamu'alaikum Wr. Wb.

Yth. Orang Tua/Wali Santri,

Berikut adalah rincian tagihan ananda *${selectedSantri?.nama_lengkap}* yang masih belum lunas:

${items}

*Total Tunggakan: Rp${totalTunggakan.toLocaleString('id-ID')}*

Mohon untuk segera melakukan pembayaran. Terima kasih atas perhatian dan kerjasamanya.

Wassalamu'alaikum Wr. Wb.

*${pesantrenProfile.nama_pesantren}*`;

      toast.info('Mengirim notifikasi tagihan via WhatsApp...');
      const res = await sendPaymentNotification(cleaned, msg);
      if (res.status) {
        toast.success('Tagihan berhasil dikirim via WhatsApp.');
      } else if (res.skipped) {
        toast.info('Notifikasi dilewati (Fonnte belum dikonfigurasi).');
      } else {
        toast.error('Gagal mengirim tagihan via WhatsApp.');
      }
    } catch (e) {
      console.error('Error sending bill reminder:', e);
      toast.error('Terjadi kesalahan saat mengirim tagihan.');
    }
  };

  const handleReprintReceipt = (payment: any) => {
    if (!payment.santri || !payment.tagihan) {
      toast.error('Data kuitansi tidak lengkap.');
      return;
    }
    // Prepare fake selected bills list for printing
    const receiptBill = {
      id: payment.tagihan.id,
      bulan: payment.tagihan.bulan,
      tahun: payment.tagihan.tahun,
      nominal: payment.jumlah, // override with actually paid amount
      master_biaya: payment.tagihan.master_biaya
    };
    setSelectedSantri(payment.santri);
    setPaidBillsReceipt([receiptBill]);
    setReceiptCashReceived(payment.jumlah);
    setIsReceiptModalOpen(true);
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen">
      
      {/* Page Title & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-600" /> Terminal Kasir Pembayaran
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
            Kasir Penerimaan Pembayaran dan Tagihan Santri Aktif Pesantren.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl self-start md:self-auto border border-slate-200 dark:border-zinc-800/80">
          <button
            onClick={() => setActiveTab('kasir')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'kasir'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Terminal Kasir
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'riwayat'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Riwayat Pembayaran
          </button>
        </div>
      </div>


      {/* Main Content Area */}
      {activeTab === 'kasir' ? (
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

                {/* Kirim Tagihan via WhatsApp */}
                <button
                  onClick={handleSendBillReminder}
                  disabled={bills.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all active:scale-95 duration-200 text-xs"
                >
                  <MessageCircle className="h-4 w-4" />
                  Kirim Tagihan via WhatsApp
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 text-center rounded-2xl shadow-sm flex flex-col items-center justify-center">
                <div className="h-12 w-12 bg-slate-50 dark:bg-zinc-850 rounded-xl flex items-center justify-center text-slate-400 dark:text-zinc-650 border border-slate-100 dark:border-zinc-800 mb-3 shadow-inner">
                  <User className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-xs text-slate-600 dark:text-zinc-300">Belum Ada Santri Terpilih</h4>
                <p className="text-[10px] text-slate-455 dark:text-zinc-500 mt-1 max-w-[200px]">
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
                        <th className="py-3 px-5 text-right w-36">Bayar Sekarang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-xs">
                      {bills.map((bill) => {
                        const costName = bill.master_biaya?.nama_biaya || 'Tagihan Bulanan';
                        const periodName = `${getBulanName(bill.bulan)} ${bill.tahun}`;
                        const nominal = Number(bill.nominal);
                        const terbayar = Number(bill.terbayar) || 0;
                        const sisa = nominal - terbayar;
                        
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
                            <td className="py-3.5 px-5 text-right font-mono text-slate-700 dark:text-zinc-300">{formatRupiah(nominal)}</td>
                            <td className="py-3.5 px-5 text-right font-mono text-slate-400">{formatRupiah(terbayar)}</td>
                            <td className="py-3.5 px-5 text-right font-mono text-slate-550">{formatRupiah(sisa)}</td>
                            <td className="py-3.5 px-5 text-right" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={bill.bayarSekarang || ''}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const cleaned = e.target.value.replace(/[^0-9]/g, '');
                                  const numVal = Number(cleaned) || 0;
                                  setBills(prev => prev.map(b => {
                                    if (b.id !== bill.id) return b;
                                    const sisa = Number(b.nominal) - (Number(b.terbayar) || 0);
                                    const clamped = Math.min(numVal, sisa);
                                    return {
                                      ...b,
                                      checked: numVal > 0 ? true : b.checked,
                                      bayarSekarang: clamped.toString()
                                    };
                                  }));
                                }}
                                placeholder="0"
                                className="w-full text-right bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-950 dark:text-white focus:outline-none transition-all"
                              />
                            </td>
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
      ) : (
        /* Tab: Riwayat Pembayaran */
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[450px]">
          <div className="p-5 border-b border-slate-150 dark:border-zinc-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Riwayat Transaksi Pembayaran</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {selectedSantri 
                  ? `Menampilkan riwayat transaksi untuk santri: ${selectedSantri.nama_lengkap}`
                  : "Silakan pilih santri terlebih dahulu untuk menampilkan riwayat transaksi mereka."}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loadingHistory ? (
              <div className="h-full flex items-center justify-center p-10 py-24">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-10 text-center text-slate-400 py-24">
                <AlertCircle className="h-10 w-10 stroke-[1.5] text-slate-350 dark:text-zinc-650 mb-3" />
                <h4 className="font-bold text-xs text-slate-600 dark:text-zinc-400">Belum Ada Transaksi</h4>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Seluruh riwayat pembayaran kasir akan tercantum di sini.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-5">Waktu Transaksi</th>
                    <th className="py-3 px-5">Nama Santri</th>
                    <th className="py-3 px-5">Master Biaya &amp; Periode</th>
                    <th className="py-3 px-5 text-right">Jumlah Bayar</th>
                    <th className="py-3 px-5">Petugas</th>
                    <th className="py-3 px-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-xs">
                  {paymentHistory.map((payment) => {
                    const studentName = payment.santri?.nama_lengkap || '—';
                    const billName = payment.tagihan?.master_biaya?.nama_biaya || 'Tagihan';
                    const period = payment.tagihan ? `${getBulanName(payment.tagihan.bulan)} ${payment.tagihan.tahun}` : '—';
                    const amountPaid = Number(payment.jumlah) || 0;
                    const cashierName = payment.admin?.nama_lengkap || 'Keuangan Admin';
                    const transactionTime = payment.tanggal_bayar 
                      ? new Date(payment.tanggal_bayar).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                      : new Date(payment.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

                    return (
                      <tr key={payment.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-850/20 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-slate-500 dark:text-zinc-400">{transactionTime}</td>
                        <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                          <div>
                            <p>{studentName}</p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">NIS: {payment.santri?.nis || '—'}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-slate-700 dark:text-zinc-300">
                          <span className="font-semibold">{billName}</span>
                          <span className="block text-[10px] text-slate-400 dark:text-zinc-500">{period}</span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(amountPaid)}
                        </td>
                        <td className="py-3.5 px-5 text-slate-650 dark:text-zinc-300 font-medium">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                              {cashierName.charAt(0)}
                            </div>
                            {cashierName}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleReprintReceipt(payment)}
                            title="Cetak Kuitansi"
                            className="inline-flex items-center justify-center p-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-600 dark:text-zinc-300 rounded-lg transition-colors"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleCancelTransaction(payment.id, payment.tagihan?.id, payment.jumlah)}
                            title="Batalkan Transaksi"
                            className="inline-flex items-center justify-center p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-lg transition-colors"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

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
                  <span className="text-slate-400">Total Pembayaran:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(totalSelectedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Uang Diterima:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-450">{formatRupiah(cashReceived)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-zinc-850/80 pt-2 flex justify-between">
                  <span className="text-slate-400 font-bold">Kembalian / Status:</span>
                  <span className={`font-black ${changeDue >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                    {changeDue >= 0 ? formatRupiah(changeDue) : `Kurang ${formatRupiah(Math.abs(changeDue))} (Uang Kurang)`}
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
                {Array.from(new Set([totalSelectedAmount, 50000, 100000, 150000, 200000, 300000])).map((num) => (
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
                className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-650 dark:text-zinc-300"
              >
                Batal
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={cashReceived <= 0 || processingPayment}
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
          
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-950/40 print:hidden">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-emerald-600" /> Kuitansi Pembayaran (58mm)
              </h3>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Modal Printable Content - Designed for 58mm Thermal Printer */}
            <div className="overflow-y-auto flex-1 bg-white text-slate-900 p-4">
              <div id="receipt-print-area" className="mx-auto bg-white text-black font-mono text-[11px] leading-tight select-none">
                
                {/* Header with Box */}
                <div className="border border-black text-center py-2 px-1 mb-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider">{pesantrenProfile.nama_pesantren}</h2>
                  <p className="text-[9px] text-gray-650">{pesantrenProfile.alamat}</p>
                  <p className="text-[9px] text-gray-500">
                    {pesantrenProfile.telepon && `Telp: ${pesantrenProfile.telepon}`}
                    {pesantrenProfile.email && ` | Email: ${pesantrenProfile.email}`}
                  </p>
                </div>

                {/* Title */}
                <div className="text-center mb-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider">Kuitansi Pembayaran</h3>
                </div>

                {/* Divider */}
                <div className="border-t border-black my-1.5"></div>

                {/* Metadata */}
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>No. Kuitansi:</span>
                    <span className="font-bold">INV/{new Date().getFullYear()}/{new Date().toLocaleString('id-ID', { month: 'short' }).toUpperCase()}/{String(Date.now()).slice(-5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>{new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' }).toUpperCase()} {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Santri:</span>
                    <span className="font-bold truncate max-w-[130px] uppercase">{selectedSantri.nama_lengkap}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NIS:</span>
                    <span className="font-mono">{selectedSantri.nis}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kelas:</span>
                    <span className="text-right break-words max-w-[55%]">{selectedSantri.kelas_formal?.nama_kelas || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kamar:</span>
                    <span className="text-right break-words max-w-[55%]">{selectedSantri.kamar?.nama_kamar || '—'}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-black my-1.5"></div>

                {/* Items Table */}
                <div className="text-[10px]">
                  <div className="flex justify-between font-bold border-b border-black pb-0.5 mb-0.5 uppercase">
                    <span>Item Tagihan</span>
                    <span className="font-mono">Nominal</span>
                  </div>
                  {paidBillsReceipt.map((bill) => {
                    const name = bill.master_biaya?.nama_biaya || 'Tagihan';
                    const period = `${getBulanName(bill.bulan)} ${bill.tahun}`;
                    return (
                      <div key={bill.id} className="py-0.5 border-b border-dashed border-gray-300">
                        <div className="flex justify-between">
                          <span className="uppercase text-[9px] break-words max-w-[65%]">{name}</span>
                          <span className="font-mono text-right flex-shrink-0">{formatRupiah(Number(bill.nominal))}</span>
                        </div>
                        <div className="text-[9px] text-gray-500 font-normal">Periode: {period}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals Section */}
                {(() => {
                  const totalNominal = paidBillsReceipt.reduce((s, b) => s + (Number(b.nominal) || 0), 0);
                  const jumlahBayar = paidBillsReceipt.reduce((s, b) => s + (Number((b as any).jumlahDibayar) || 0), 0);
                  const sisaChecked = paidBillsReceipt.reduce((s, b) => s + (Number(b.nominal) - (Number(b.terbayar) || 0)), 0);
                  return (
                    <div className="text-[10px] mt-1">
                      <div className="border-t-2 border-black pt-1 space-y-0.5">
                        <div className="flex justify-between font-bold">
                          <span>Total Tagihan:</span>
                          <span className="font-mono">{formatRupiah(totalNominal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Jumlah Bayar:</span>
                          <span className="font-mono">{formatRupiah(jumlahBayar)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Uang Diterima:</span>
                          <span className="font-mono">{formatRupiah(receiptCashReceived)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kembalian:</span>
                          <span className="font-mono">{formatRupiah(Math.max(0, receiptCashReceived - jumlahBayar))}</span>
                        </div>
                        <div className="border-t border-black pt-0.5 flex justify-between font-bold">
                          <span>Sisa Tagihan:</span>
                          <span className="font-mono">{formatRupiah(Math.max(0, sisaChecked - jumlahBayar))}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Divider */}
                <div className="border-t border-black my-1.5"></div>

                {/* Footer Signatures */}
                <div className="text-center text-[9px] pt-1 pb-1">
                  <p>Kasir,</p>
                  <div className="h-10"></div>
                  <p className="border-b border-black w-24 mx-auto truncate uppercase">{activeCashierName}</p>
                </div>

                <div className="border border-black text-center text-[9px] py-1 px-1 leading-tight mt-2">
                  <span className="font-bold">Simpan kuitansi ini sebagai bukti pembayaran sah.</span>
                  <br />Terima kasih atas kepercayaan Anda.
                  <br />{pesantrenProfile.telepon && `Info: ${pesantrenProfile.telepon}`}
                </div>

              </div>
            </div>

            {/* Modal Receipt Footer Controls */}
            <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50 print:hidden">
              <span className="text-[10px] text-slate-400">Cocok untuk printer 58mm</span>
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
            width: 58mm !important;
            padding: 2mm !important;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
          }
          .print\:hidden {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
