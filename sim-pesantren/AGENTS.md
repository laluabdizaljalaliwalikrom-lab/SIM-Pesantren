<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SIM Pesantren — AI Agent Playbook

## Architecture Overview
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth with custom `profiles.role` enum (`admin | pengasuh | wali_santri`)
- **Styling**: Tailwind CSS v4, shadcn/ui components

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

## TypeScript Types
- All DB types are in `types/database.ts` — this is the single source of truth
- Every interface name matches the table name (PascalCase, e.g., `Santri`, `Mapel`)
- Join types are optional with `?` suffix (e.g., `santri?: Santri | null`)
- When adding a migration, update `types/database.ts` FIRST, then write the SQL

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

## Permission System
- `requirePermission(feature, action)` in `utils/server-supabase.ts` (for server actions)
- `requirePermission(feature, action)` in `utils/auth-api.ts` (for API routes)
- Super Admin (`role === 'Super Admin'`) **bypasses all checks**
- Role lookup uses `profiles.id_role` (UUID FK → `app_roles.id`) — no more hardcoded enum map
- `profiles.role` is auto-synced via trigger `sync_profile_role()` from `app_roles.name`
- Feature names are: `Lembaga`, `Santri`, `Tahfidz`, `Kepegawaian`, `Keuangan`, `Akademik`, `Asrama`, `Perizinan`, `Pengaturan`

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
- Icons: use `lucide-react` icons
