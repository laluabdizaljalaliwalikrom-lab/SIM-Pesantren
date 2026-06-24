<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SIM Pesantren — AI Agent Playbook

## Architecture Overview
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth with custom `profiles.role` (synced from `app_roles.name`)
- **Styling**: Tailwind CSS v4, Font Awesome 6
- **PWA**: `@ducanh2912/next-pwa` with service worker
- **Hosting**: Vercel (with `vercel.json`)

## Tech Stack
| Package | Version |
|---|---|
| next | 16.2.6 |
| react / react-dom | 19.2.4 |
| typescript | ^5 |
| tailwindcss | ^4 |
| @supabase/ssr | ^0.10.3 |
| @supabase/supabase-js | ^2.106.2 |
| framer-motion | ^12.40.0 |
| lucide-react | ^1.17.0 |
| recharts | ^3.8.1 |
| sonner | ^2.0.7 |
| xlsx | ^0.18.5 |
| browser-image-compression | ^2.0.2 |
| next-themes | ^0.4.6 |
| @vercel/analytics | ^2.0.1 |
| @vercel/speed-insights | ^2.0.0 |

## Project Structure
```
sim-pesantren/
├── app/
│   ├── (dashboard)/       # Protected pages (route group)
│   │   ├── admin/         # Dashboard overview
│   │   ├── akademik/      # Absensi, jadwal, mapel, nilai, tahfidz
│   │   ├── asrama/        # Manajemen kamar & gedung
│   │   ├── dashboard-eksekutif/
│   │   ├── keuangan/      # Atur keuangan, billing
│   │   ├── laporan/       # Laporan keuangan
│   │   ├── lembaga/       # Manajemen sekolah
│   │   ├── pegawai/       # Manajemen pegawai
│   │   ├── pembayaran/    # Kasir pembayaran
│   │   ├── pengaturan/    # Settings pesantren
│   │   ├── profile/       # Profile user
│   │   ├── santri/        # CRUD santri
│   │   ├── settings/      # Manajemen user & role (Super Admin only)
│   │   ├── tahfidz/       # Tracker hafalan
│   │   └── layout.tsx     # → DashboardLayout (client component)
│   ├── api/               # API routes
│   │   ├── manifest/      # PWA manifest
│   │   ├── pesantren-profile/
│   │   ├── pwa-icon/
│   │   ├── users/         # CRUD user & invite
│   │   └── webhooks/
│   ├── auth/callback/     # Supabase Auth callback
│   ├── login/             # Halaman login
│   ├── layout.tsx         # Root layout (ThemeProvider, Toaster, Analytics)
│   ├── page.tsx           # Landing page (ISR 60s)
│   └── globals.css
├── components/
│   ├── ui/                # theme-provider, theme-toggle
│   ├── dashboard-layout.tsx
│   ├── sidebar.tsx
│   ├── bottom-bar.tsx
│   ├── LandingPageClient.tsx
│   ├── FormSetoranTahfidz.tsx
│   ├── FormTambahSantri.tsx
│   ├── ImageUpload.tsx
│   ├── import-santri-modal.tsx
│   ├── KartuProgresTahfidz.tsx
│   ├── kuitansi-print-toolbar.tsx
│   └── RolePermissionMatrix.tsx
├── services/              # Server actions (mutations only)
│   ├── santri-actions.ts
│   ├── pegawai-actions.ts
│   ├── kamar-actions.ts
│   ├── mapel-actions.ts
│   ├── nilai-actions.ts
│   ├── absensi-actions.ts
│   ├── sholat-actions.ts
│   ├── pembayaran-actions.ts
│   ├── billing-actions.ts
│   ├── perizinan-actions.ts
│   ├── pelanggaran-actions.ts
│   ├── akademik-actions.ts
│   ├── role-actions.ts
│   ├── santri-import.ts
│   ├── storage-actions.ts
│   └── whatsapp-actions.ts
├── utils/
│   ├── server-supabase.ts      # getServerSupabase(), requirePermission()
│   ├── auth-api.ts             # requirePermission() for API routes
│   ├── permission-helper.ts
│   └── dapodik-transformer.ts
├── lib/
│   └── supabase.ts             # createBrowserClient (client-side)
├── types/
│   └── database.ts             # Single source of truth for all DB types
├── hooks/
│   └── usePWAInstall.ts
├── supabase/migrations/        # 44 migration files
├── proxy.ts                    # Auth middleware (replaces middleware.ts)
└── next.config.ts              # With PWA, image remote patterns, Turbopack
```

## Route Map (Dashboard)
| URL | Modul | Permission Feature |
|---|---|---|
| `/admin` | Dashboard Overview | — (always accessible) |
| `/dashboard-eksekutif` | Dashboard Eksekutif | — |
| `/lembaga` | Lembaga | `Lembaga` |
| `/santri` | Santri | `Santri` |
| `/pegawai` | Pegawai | `Kepegawaian` |
| `/asrama` | Asrama | `Asrama` |
| `/tahfidz` | Tahfidz Tracker | `Tahfidz` |
| `/akademik/*` | Akademik | `Akademik` |
| `/pembayaran` | Kasir Pembayaran | `Keuangan` |
| `/keuangan` | Atur Keuangan | `Keuangan` |
| `/laporan` | Laporan Keuangan | `Keuangan` |
| `/pengaturan` | Pengaturan | `Pengaturan` |
| `/settings/*` | Manajemen User/Role | Super Admin only |
| `/profile` | Profile User | — (own profile) |

## CRITICAL: Database Access Rules

### Rule 1: NEVER use client-side Supabase for mutations
All INSERT/UPDATE/DELETE operations MUST go through **server actions** (`services/*-actions.ts`) that call `requirePermission()`.

```ts
// ✅ CORRECT — server action with permission check
'use server';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';

export async function createSomething(data: Input) {
  const auth = await requirePermission('FiturName', 'create');
  if (auth.error) return { error: auth.error };
  const supabase = await getServerSupabase();
  // ... mutate via supabase
}
```

```ts
// ❌ WRONG — never mutate directly from client component
import { supabase } from '@/lib/supabase';
await supabase.from('tabel').insert(...); // BYPASSES PERMISSION CHECK
```

### Rule 2: READ-only can use client-side supabase
SELECT queries in client components may use `import { supabase } from '@/lib/supabase'` for simplicity, but prefer server actions if:
- The data needs RLS-based filtering beyond basic row-level security
- The same query is reused across multiple components
- The data should be cached or revalidated

### Rule 3: Server actions pattern
Each server action file:
1. Has `'use server'` at the top
2. Uses `requirePermission(feature, action)` as first operation
3. Uses `getServerSupabase()` (not `createServerClient` directly)
4. Returns `{ success, data?, error? }` shape
5. Uses `revalidatePath()` after mutations

### Rule 4: All `mapel` references, never `mata_pelajaran`
The `mata_pelajaran` table has been DROPPED and replaced by `mapel`. All code, joins, and types must reference `mapel`. Do NOT create any new code referencing `mata_pelajaran`.

## Routing Convention
- All protected pages are under `app/(dashboard)/` route group
- No `/admin/` prefix in URLs — routes are flat: `/santri`, `/keuangan`, etc.
- The `/admin` route is the dashboard overview page only
- New feature pages follow: `app/(dashboard)/module-name/page.tsx`

## Auth & Middleware
- Auth middleware is in `/proxy.ts` (not `middleware.ts`)
- Protected route prefixes defined in `PROTECTED_PREFIXES` array
- Unauthenticated users redirected to `/login?redirectTo=...`
- Authenticated users on `/login` redirected to `/admin`
- Matcher excludes `_next/static`, `_next/image`, `api/`, static files

## Dashboard Layout
- `DashboardLayout` (client component in `components/dashboard-layout.tsx`)
- Header: Live clock with Hijri date (Umm al-Qura calendar), theme toggle, profile dropdown
- Sidebar: Collapsible with section headings, submenus, permission-based visibility
- Bottom bar: Mobile navigation
- Footer: Copyright with branding
- PWA install prompt (bottom-right toast)
- Permission-based page access (blocks view if user lacks `can_view`)

## TypeScript Types
- All DB types are in `types/database.ts` — this is the single source of truth (40+ interfaces)
- Every interface name matches the table name (PascalCase, e.g., `Santri`, `Mapel`)
- Join types are optional with `?` suffix (e.g., `santri?: Santri | null`)
- When adding a migration, update `types/database.ts` FIRST, then write the SQL

### Key DB Tables
| Kelompok | Tabel |
|---|---|
| **User & Role** | `profiles`, `app_roles`, `role_permissions` |
| **Santri** | `santri` (extensive dapodik-compliant fields) |
| **Pegawai** | `pegawai` |
| **Asrama** | `gedung`, `kamar`, `log_perpindahan_kamar` |
| **Akademik** | `sekolah`, `kelas`, `mapel`, `jadwal_pelajaran`, `absensi`, `absensi_sholat`, `nilai`, `tahun_ajaran`, `semester` |
| **Tahfidz** | `presensi_tahfidz`, `ref_surah`, `ref_hadits`, `ref_matan` |
| **Keuangan** | `master_biaya`, `tagihan`, `pembayaran`, `pembayaran_group` |
| **Perizinan** | `perizinan` |
| **Pelanggaran** | `master_pelanggaran`, `pelanggaran_santri` |
| **Pengaturan** | `pesantren_profile`, `landing_page_settings` |

## Migration Standards
- All migrations go in `supabase/migrations/` with descriptive filenames (prefix with `create_`, `add_`, `fix_`, `seed_`)
- Every new migration MUST be idempotent — safe to run multiple times:
  ```sql
  CREATE TABLE IF NOT EXISTS ...
  ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
  CREATE OR REPLACE FUNCTION ...
  DROP CONSTRAINT IF EXISTS ...
  DROP POLICY IF EXISTS ... ON ...
  ```
- Use `ON CONFLICT ... DO NOTHING` for seed data inserts
- Never use `FOR ALL USING (true)` in RLS policies — use separate `FOR SELECT` / `FOR INSERT` / `FOR UPDATE` / `FOR DELETE` policies
- Never hardcode UUIDs in migrations (use `SELECT id INTO ... FROM ... WHERE ...` instead)
- After writing a migration, update `types/database.ts` to match the new schema FIRST
- Total: 44 existing migrations

## Permission System
- `requirePermission(feature, action)` in `utils/server-supabase.ts` (for server actions)
- `requirePermission(feature, action)` in `utils/auth-api.ts` (for API routes)
- Super Admin (`role === 'Super Admin'`) **bypasses all checks**
- Role lookup uses `profiles.id_role` (UUID FK → `app_roles.id`) — no more hardcoded enum map
- `profiles.role` is auto-synced via trigger `sync_profile_role()` from `app_roles.name`
- Feature names: `Lembaga`, `Santri`, `Tahfidz`, `Kepegawaian`, `Keuangan`, `Akademik`, `Asrama`, `Perizinan`, `Pengaturan`

### Setting user role
- Invite: POST `/api/users/invite` with `id_role` (UUID)
- Edit: PATCH `/api/users/[id]` with `id_role` (UUID)
- Trigger auto-syncs `profiles.role` from `app_roles.name`

## Code Style
- NO comments in production code (exception: `AGENTS.md` and migration SQL)
- Use `camelCase` for JS/TS variables, `snake_case` for DB columns
- Prefer `async/await` over `.then()`
- Use `shadcn/ui` components from `@/components/ui/`
- Use Tailwind v4 syntax (no `@apply` in component files)
- Icons: use `lucide-react` icons (Font Awesome via CDN also available)
- Avoid `@/` barrel imports — import directly from file

## Build & Config Notes
- `next.config.ts`: TypeScript errors ignored during build (`ignoreBuildErrors: true`), Supabase storage remote patterns configured, Turbopack root set to `__dirname`
- PWA disabled in development, enabled in production
- Landing page uses ISR with `revalidate = 60`
- `eslint.config.mjs` — ESLint v9 flat config
