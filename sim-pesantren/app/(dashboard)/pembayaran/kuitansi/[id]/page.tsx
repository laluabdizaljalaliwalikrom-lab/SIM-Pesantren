import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import React from 'react';
import { KuitansiPrintToolbar } from '@/components/kuitansi-print-toolbar';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
}

function formatRupiah(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val);
}

function getBulanName(monthNumber: number) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return months[monthNumber - 1] || '';
}

export default async function KuitansiPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-center p-8">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sesi Tidak Valid</h1>
          <p className="text-sm text-slate-500 mt-2">Silakan login ulang untuk mengakses kuitansi.</p>
        </div>
      </div>
    );
  }

  const { data: group, error } = await supabase
    .from('pembayaran_group')
    .select('id, nomor_kuitansi, total_tagihan, total_bayar, uang_diterima, kembalian, created_at, id_santri, id_admin')
    .eq('id', id)
    .maybeSingle();

  if (error || !group) {
    notFound();
  }

  const [santriRes, adminRes, itemsRes, pesantrenRes] = await Promise.all([
    supabase.from('santri').select('id, nama_lengkap, nis, nisn, kamar:id_kamar (nama_kamar), kelas_formal:id_kelas_formal (nama_kelas)').eq('id', group.id_santri).maybeSingle(),
    group.id_admin ? supabase.from('profiles').select('id, nama_lengkap').eq('id', group.id_admin).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('pembayaran').select('id, jumlah, tagihan:id_tagihan (id, bulan, tahun, nominal, terbayar, master_biaya:id_master_biaya (nama_biaya))').eq('id_group', group.id),
    supabase.from('pesantren_profile').select('nama_pesantren, alamat, telepon, email').maybeSingle(),
  ]);

  const pesantrenProfile = pesantrenRes.data;
  const pesantrenName = pesantrenProfile?.nama_pesantren || 'SIM Pesantren';
  const pesantrenAlamat = pesantrenProfile?.alamat || '';
  const pesantrenTelp = pesantrenProfile?.telepon || '';
  const pesantrenEmail = pesantrenProfile?.email || '';

  const santri: any = santriRes.data;
  const adminName: string = (adminRes.data as any)?.nama_lengkap || 'Kasir';
  const items: any[] = itemsRes.data || [];
  const kamar = Array.isArray(santri?.kamar) ? santri.kamar[0] : santri?.kamar;
  const kelasFormal = Array.isArray(santri?.kelas_formal) ? santri.kelas_formal[0] : santri?.kelas_formal;
  const totalTagihan = Number(group.total_tagihan) || 0;
  const totalBayar = Number(group.total_bayar) || 0;
  const uangDiterima = Number(group.uang_diterima) || 0;
  const kembalian = Number(group.kembalian) || 0;
  const tanggalBayar = group.created_at;
  const formattedDate = new Date(tanggalBayar).toLocaleDateString('id-ID', { dateStyle: 'medium' }).toUpperCase();
  const formattedTime = new Date(tanggalBayar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const nomorKuitansi = group.nomor_kuitansi || `INV/${new Date(tanggalBayar).getFullYear()}/${String(new Date(tanggalBayar).getMonth() + 1).padStart(2, '0')}/${String(Math.random()).slice(-5)}`;

  if (!santri) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <KuitansiPrintToolbar />

      <div className="flex justify-center py-8 print:py-0">
        <div
          id="receipt-print-area"
          className="bg-white text-black font-mono text-[11px] leading-tight select-none shadow-lg print:shadow-none"
          style={{ width: '58mm', padding: '2mm' }}
        >
          <div className="border border-black text-center py-2 px-1 mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider">{pesantrenName}</h2>
            <p className="text-[9px] text-gray-700">{pesantrenAlamat}</p>
            {(pesantrenTelp || pesantrenEmail) && (
              <p className="text-[9px] text-gray-600">
                {pesantrenTelp && `Telp: ${pesantrenTelp}`}
                {pesantrenEmail && ` | Email: ${pesantrenEmail}`}
              </p>
            )}
          </div>

          <div className="text-center mb-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider">Kuitansi Pembayaran</h3>
          </div>

          <div className="border-t border-black my-1.5"></div>

          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>No. Kuitansi:</span>
              <span className="font-bold">{nomorKuitansi}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal:</span>
              <span>{formattedDate} {formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Santri:</span>
              <span className="font-bold truncate max-w-[130px] uppercase">{santri.nama_lengkap}</span>
            </div>
            <div className="flex justify-between">
              <span>NIS:</span>
              <span className="font-mono">{santri.nis}</span>
            </div>
            <div className="flex justify-between">
              <span>Kelas:</span>
              <span className="text-right break-words max-w-[55%]">{kelasFormal?.nama_kelas || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>Kamar:</span>
              <span className="text-right break-words max-w-[55%]">{kamar?.nama_kamar || '—'}</span>
            </div>
          </div>

          <div className="border-t border-black my-1.5"></div>

          <div className="text-[10px]">
            <div className="flex justify-between font-bold border-b border-black pb-0.5 mb-0.5 uppercase">
              <span>Item Tagihan</span>
              <span className="font-mono">Nominal</span>
            </div>
            {items.map((p: any) => {
              const t = p.tagihan;
              const name = t?.master_biaya?.nama_biaya || 'Pembayaran';
              const period = t ? `${getBulanName(t.bulan)} ${t.tahun}` : '';
              const nominal = Number(t?.nominal) || Number(p.jumlah) || 0;
              return (
                <div key={p.id} className="py-0.5 border-b border-dashed border-gray-300">
                  <div className="flex justify-between">
                    <span className="uppercase text-[9px] break-words max-w-[65%]">{name}</span>
                    <span className="font-mono text-right flex-shrink-0">{formatRupiah(nominal)}</span>
                  </div>
                  {period && <div className="text-[9px] text-gray-500 font-normal">Periode: {period}</div>}
                </div>
              );
            })}
          </div>

          <div className="text-[10px] mt-1">
            <div className="border-t-2 border-black pt-1 space-y-0.5">
              <div className="flex justify-between font-bold">
                <span>Total Tagihan:</span>
                <span className="font-mono">{formatRupiah(totalTagihan)}</span>
              </div>
              <div className="flex justify-between">
                <span>Jumlah Bayar:</span>
                <span className="font-mono">{formatRupiah(totalBayar)}</span>
              </div>
              <div className="flex justify-between">
                <span>Uang Diterima:</span>
                <span className="font-mono">{formatRupiah(uangDiterima)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kembalian:</span>
                <span className="font-mono">{formatRupiah(kembalian)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-black my-1.5"></div>

          <div className="text-center text-[9px] pt-1 pb-1">
            <p>Kasir,</p>
            <div className="h-10"></div>
            <p className="border-b border-black w-24 mx-auto truncate uppercase">{adminName}</p>
          </div>

          <div className="border border-black text-center text-[9px] py-1 px-1 leading-tight mt-2">
            <span className="font-bold">Simpan kuitansi ini sebagai bukti pembayaran sah.</span>
            <br />Terima kasih atas kepercayaan Anda.
            {pesantrenTelp && <br />}
            {pesantrenTelp && `Info: ${pesantrenTelp}`}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: white; }
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
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
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
