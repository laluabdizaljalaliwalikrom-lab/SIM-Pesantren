import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  iconClassName?: string;
}

/**
 * Reusable empty state component.
 * Displays a centered icon, title, optional description, and optional action button.
 *
 * Usage:
 *   <EmptyState
 *     icon={Users}
 *     title="Belum ada data santri"
 *     description="Tambahkan santri pertama untuk memulai."
 *     action={{ label: 'Tambah Santri', onClick: handleOpenAddModal }}
 *   />
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconClassName = 'h-7 w-7 text-slate-400 dark:text-zinc-500',
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon className={iconClassName} />
      </div>
      <p className="font-semibold text-sm text-slate-700 dark:text-zinc-200">{title}</p>
      {description && (
        <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
