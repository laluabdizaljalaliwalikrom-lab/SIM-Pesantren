'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Wallet,
  BookOpen,
  Home,
  ClipboardCheck,
  RotateCcw,
  Save,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  School
} from 'lucide-react';
import { toast } from 'sonner';
import { updateRolePermissions } from '@/services/role-actions';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

type ActionKey = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

const SYSTEM_MODULES: { key: string; label: string; icon: React.ElementType }[] = [
  { key: 'Lembaga',      label: 'Lembaga & Kelas',  icon: School        },
  { key: 'Santri',       label: 'Data Santri',      icon: Users         },
  { key: 'Tahfidz',      label: 'Tahfidz Tracker',   icon: GraduationCap },
  { key: 'Kepegawaian',  label: 'Kepegawaian',      icon: Briefcase     },
  { key: 'Keuangan',     label: 'Keuangan',         icon: Wallet        },
  { key: 'Akademik',     label: 'Akademik',         icon: BookOpen      },
  { key: 'Asrama',       label: 'Asrama',           icon: Home          },
  { key: 'Perizinan',    label: 'Perizinan',        icon: ClipboardCheck },
];

const ACTION_COLUMNS: { key: ActionKey; label: string }[] = [
  { key: 'can_view',   label: 'Lihat'  },
  { key: 'can_create', label: 'Tambah' },
  { key: 'can_edit',   label: 'Ubah'   },
  { key: 'can_delete', label: 'Hapus'  },
];

type LocalPerms = Record<string, Record<ActionKey, boolean>>;

interface RolePermissionMatrixProps {
  selectedRoleId: string;
  selectedRoleName: string;
  /** All role_permissions rows (unfiltered — the component picks the relevant ones). */
  permissions: {
    id?: string;
    id_role: string;
    feature: string;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }[];
  /** Called after a successful save so the parent can re-fetch data. */
  onSaveSuccess?: () => void;
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export default function RolePermissionMatrix({
  selectedRoleId,
  selectedRoleName,
  permissions,
  onSaveSuccess,
}: RolePermissionMatrixProps) {
  const isSuperAdmin = selectedRoleName === 'Super Admin';

  // Local checkbox state
  const [localPerms, setLocalPerms]   = useState<LocalPerms>({});
  // Baseline snapshot to detect dirty state
  const [baselinePerms, setBaseline]  = useState<LocalPerms>({});
  // useTransition drives the pending state for the Server Action call
  const [isPending, startTransition]  = useTransition();

  // ── Sync local state whenever role or permission list changes ──────────
  useEffect(() => {
    const fresh: LocalPerms = {};
    SYSTEM_MODULES.forEach(mod => {
      const match = permissions.find(
        p => p.id_role === selectedRoleId && p.feature === mod.key
      );
      fresh[mod.key] = {
        can_view:   isSuperAdmin ? true : (match?.can_view   ?? false),
        can_create: isSuperAdmin ? true : (match?.can_create ?? false),
        can_edit:   isSuperAdmin ? true : (match?.can_edit   ?? false),
        can_delete: isSuperAdmin ? true : (match?.can_delete ?? false),
      };
    });
    setLocalPerms(fresh);
    setBaseline(structuredClone(fresh));
  }, [selectedRoleId, selectedRoleName, permissions, isSuperAdmin]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleToggle = (moduleKey: string, action: ActionKey) => {
    if (isSuperAdmin) return;
    setLocalPerms(prev => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [action]: !prev[moduleKey][action] },
    }));
  };

  const handleToggleColumn = (action: ActionKey) => {
    if (isSuperAdmin) return;
    const allChecked = SYSTEM_MODULES.every(mod => localPerms[mod.key]?.[action]);
    setLocalPerms(prev => {
      const next = { ...prev };
      SYSTEM_MODULES.forEach(mod => {
        next[mod.key] = { ...next[mod.key], [action]: !allChecked };
      });
      return next;
    });
  };

  const handleReset = () => {
    setLocalPerms(structuredClone(baselinePerms));
  };

  // ── Save — calls the Server Action inside useTransition ───────────────
  const handleSave = () => {
    if (isSuperAdmin) return;

    const payload = SYSTEM_MODULES.map(mod => ({
      feature:    mod.key,
      can_view:   localPerms[mod.key]?.can_view   ?? false,
      can_create: localPerms[mod.key]?.can_create ?? false,
      can_edit:   localPerms[mod.key]?.can_edit   ?? false,
      can_delete: localPerms[mod.key]?.can_delete ?? false,
    }));

    startTransition(async () => {
      const result = await updateRolePermissions(selectedRoleId, payload);

      if (result.success) {
        toast.success(result.message, {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          description: `${result.updatedCount ?? payload.length} modul diperbarui untuk role "${selectedRoleName}".`,
        });
        // Promote the saved state to the new baseline (no pending indicator)
        setBaseline(structuredClone(localPerms));
        onSaveSuccess?.();
      } else {
        toast.error('Gagal Menyimpan', {
          icon: <AlertCircle className="h-4 w-4 text-rose-500" />,
          description: result.message,
        });
      }
    });
  };

  // ── Derived state ─────────────────────────────────────────────────────

  const isChanged = (moduleKey: string, action: ActionKey) =>
    localPerms[moduleKey]?.[action] !== baselinePerms[moduleKey]?.[action];

  const hasChanges = SYSTEM_MODULES.some(mod =>
    ACTION_COLUMNS.some(col => isChanged(mod.key, col.key))
  );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[450px]">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-zinc-900/50">
        <div className="space-y-0.5">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Manajemen Hak Akses
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500">
            Tentukan izin spesifik CRUD untuk tiap modul sistem.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Role:
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 uppercase tracking-wider">
            {selectedRoleName}
          </span>
        </div>
      </div>

      {/* ── Super Admin lock banner ──────────────────────────────── */}
      {isSuperAdmin && (
        <div className="px-5 py-3.5 bg-rose-500/[0.04] border-b border-rose-500/10 text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
          <Lock className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Role Terkunci — Super Admin</p>
            <p className="text-slate-500 dark:text-zinc-400 mt-0.5">
              Super Admin memiliki seluruh perizinan secara absolut. Demi integritas sistem, matrix ini tidak dapat diubah.
            </p>
          </div>
        </div>
      )}

      {/* ── Unsaved-changes banner ───────────────────────────────── */}
      {hasChanges && !isPending && (
        <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-500/[0.06] border-b border-amber-200 dark:border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Terdapat perubahan yang belum disimpan. Klik <strong className="font-bold mx-1">Simpan Perubahan</strong> untuk menerapkan.
        </div>
      )}

      {/* ── Matrix Table ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/40 dark:bg-zinc-900/40 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
              <th className="py-4 px-6">Modul Fitur</th>

              {ACTION_COLUMNS.map(col => {
                const allChecked = SYSTEM_MODULES.every(mod => localPerms[mod.key]?.[col.key]);
                return (
                  <th key={col.key} className="py-4 px-4 text-center w-28 select-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span>{col.label}</span>
                      {!isSuperAdmin && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggleColumn(col.key)}
                          title={allChecked ? `Batal pilih semua ${col.label}` : `Pilih semua ${col.label}`}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded transition-all border disabled:opacity-50 ${
                            allChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400'
                          }`}
                        >
                          Semua
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
            {SYSTEM_MODULES.map(mod => {
              const IconComp = mod.icon;
              const rowHasChange = ACTION_COLUMNS.some(col => isChanged(mod.key, col.key));

              return (
                <tr
                  key={mod.key}
                  className={`transition-colors ${
                    rowHasChange
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/[0.05]'
                      : 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/[0.08]'
                  }`}
                >
                  {/* Module label + icon */}
                  <td className="py-4 px-6 font-semibold text-slate-800 dark:text-zinc-200">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg transition-colors ${
                        rowHasChange
                          ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                      }`}>
                        <IconComp className="h-4 w-4" />
                      </div>
                      <span>{mod.label}</span>
                      {rowHasChange && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                          Diubah
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Checkbox cells */}
                  {ACTION_COLUMNS.map(col => {
                    const checked = localPerms[mod.key]?.[col.key] ?? false;
                    const changed = isChanged(mod.key, col.key);

                    return (
                      <td key={col.key} className="py-4 px-4 text-center">
                        <div className="inline-flex items-center justify-center relative">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSuperAdmin || isPending}
                            onChange={() => handleToggle(mod.key, col.key)}
                            aria-label={`${mod.label} - ${col.label}`}
                            className={`
                              h-5 w-5 rounded
                              border-slate-300 dark:border-zinc-600
                              text-emerald-600
                              focus:ring-emerald-500 focus:ring-offset-0
                              accent-emerald-600
                              cursor-pointer
                              disabled:cursor-not-allowed disabled:opacity-60
                              transition-all duration-150
                              ${changed
                                ? 'ring-2 ring-emerald-400 dark:ring-emerald-500 border-emerald-400'
                                : ''}
                            `}
                          />
                          {/* Dot indicator for changed cells */}
                          {changed && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 animate-pulse" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      {!isSuperAdmin && (
        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-zinc-900/50">
          {/* Change count hint */}
          <span className="text-[11px] text-slate-400 dark:text-zinc-500">
            {hasChanges
              ? `${
                  SYSTEM_MODULES.reduce(
                    (n, mod) => n + ACTION_COLUMNS.filter(col => isChanged(mod.key, col.key)).length,
                    0
                  )
                } perubahan belum tersimpan`
              : 'Tidak ada perubahan'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasChanges || isPending}
              onClick={handleReset}
              className="flex items-center gap-1 px-4 py-2 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold rounded-xl text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>

            <button
              type="button"
              disabled={!hasChanges || isPending}
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 text-xs rounded-xl shadow-sm hover:shadow-md shadow-emerald-600/10 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Save className="h-3.5 w-3.5" />}
              {isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
