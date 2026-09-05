# Pedoman Desain & Standarisasi UI SIM Pesantren

Dokumen ini adalah aturan permanen (*Workspace Rules*) yang wajib ditaati oleh AI dalam mengembangkan, menambah fitur, maupun memodifikasi UI/UX di proyek **SIM Pesantren**.

---

## 1. Palet Warna (Color System)
- **Primary / Aksen Utama**: Hijau Zamrud Pesantren (`emerald-600` untuk light mode, `emerald-500` / `emerald-400` untuk dark mode).
- **Secondary / Netral**: Palet **Zinc** (`zinc-950`, `zinc-900`, `zinc-850`, `zinc-800`, `zinc-700`).
  - ❌ **DILARANG**: Menggunakan arbitrary hex lama (`#1a1a2e`, `#0f0f1a`) atau mencampur `slate` dengan `gray` untuk latar mode gelap.
  - ✅ **WAJIB**:
    - Background card: `bg-white dark:bg-zinc-900`
    - Background input: `bg-slate-50 dark:bg-zinc-950`
    - Border container: `border-slate-200 dark:border-zinc-800`
    - Border divider: `divide-slate-100 dark:divide-zinc-800`

---

## 2. Struktur Page Header (Standar Tunggal)
Setiap halaman modul wajib menggunakan struktur header berikut:
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
  <div>
    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
      <IconModul className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
      Judul Halaman
    </h1>
    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
      Deskripsi ringkas tujuan dan fungsi halaman.
    </p>
  </div>
  {/* Action Button / CTA di sebelah kanan */}
</div>
```
- Gunakan `font-bold` (bukan `font-extrabold` / `font-black`).
- Ikon judul wajib `h-6 w-6 shrink-0` dengan warna emerald.

---

## 3. Kartu Statistik (Stat Cards)
- **Ukuran Kecil / Ringkas (Grid Metric)**:
  ```tsx
  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center gap-3"
  ```
- **Ukuran Besar / Banner Card**:
  ```tsx
  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm"
  ```
- **Tipografi Angka Nilai**: Wajib `text-xl font-bold` atau `text-2xl font-bold`.
- **Label Metrik**: `text-[10px]` atau `text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500`.

---

## 4. Kotak Pencarian (Search Bar Spacing)
Selalu gunakan geometri presisi berikut:
```tsx
<div className="relative flex-1">
  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
  <input
    type="text"
    placeholder="Cari..."
    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
  />
</div>
```
- Posisi ikon: `left-3.5`
- Padding teks input: `pl-10 pr-4`

---

## 5. Tombol Aksi (Buttons)
- **Tombol Utama (Primary)**:
  ```tsx
  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-95"
  ```
- **Tombol Sekunder (Outline)**:
  ```tsx
  className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-200"
  ```

---

## 6. Navigasi: Tab vs Filter Pill
- **Underline Tab (`border-b-2`) atau Segmented Box Tab**: Khusus untuk berpindah sub-halaman / section besar konten.
- **Pill Button (`px-3 py-1.5 rounded-lg text-xs font-bold`)**: Khusus untuk filter status atau kategori data dalam satu tabel/grid.

---

## 7. Penanganan Kondisi Kosong (Empty State)
Jangan pernah membiarkan tabel atau container kosong begitu saja tanpa pesan. Gunakan komponen resmi:
```tsx
import EmptyState from '@/components/empty-state';

<EmptyState
  icon={IconTerkait}
  title="Judul Kondisi Kosong"
  description="Keterangan singkat solusi atau penyebab data kosong."
  action={{
    label: '+ Tambah Data',
    onClick: handleOpenModal,
  }}
/>
```
- **Aturan Posisi & Perataan**: Wajib selalu simetris di tengah (`text-center`, `items-center`, `justify-center`, `mx-auto`).
- **Pemisahan Kondisi Kosong**:
  - Jika data tabel memang belum pernah ada: beri judul informatif ("Belum Ada Data...") dengan tombol aksi utama (tambah/muat ulang).
  - Jika hasil filter/pencarian nihil: gunakan judul "Tidak Ada Data yang Cocok" dengan tombol aksi reset filter.
- **Dilarang**: Menaruh teks instruksi manual yang panjang lebar atau tidak center di dalam container empty state.

---

## 8. Pencatatan Mutasi Data (Audit Trail)
Setiap operasi mutasi data penting (tambah, perbarui nilai, hapus, dan transaksi keuangan) wajib mencatat riwayat ke audit trail:
```tsx
import { logActivity } from '@/services/audit-actions';

await logActivity({
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT',
  module: 'Santri' | 'Keuangan' | 'Pembayaran' | ...,
  description: 'Narasi ringkas mutasi data',
  recordId: entityId,
  oldData: prevSnapshot,
  newData: nextSnapshot,
});
```

---

## 8. ThemeToggle & Komponen Client
- Saat membuat komponen bertema atau reaktif terhadap DOM client, gunakan `useSyncExternalStore` untuk mencegah error *cascading renders* / *hydration mismatch* (hindari `setMounted(true)` dalam `useEffect`).
