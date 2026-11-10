import React from 'react';

type BadgeVariant = 'light' | 'solid';
type BadgeSize = 'sm' | 'md';
type BadgeColor =
  | 'primary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'light',
  color = 'primary',
  size = 'md',
  startIcon,
  endIcon,
  children,
  className = '',
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-1 font-semibold rounded-full';

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variants = {
    light: {
      primary:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40',
      success:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40',
      error:
        'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40',
      warning:
        'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40',
      info:
        'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/40',
      light:
        'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700',
      dark:
        'bg-zinc-800 text-white dark:bg-zinc-950 dark:text-zinc-200 border border-zinc-700 dark:border-zinc-800',
    },
    solid: {
      primary: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20',
      success: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20',
      error: 'bg-rose-600 text-white shadow-sm shadow-rose-600/20',
      warning: 'bg-amber-500 text-white shadow-sm shadow-amber-500/20',
      info: 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/20',
      light: 'bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-100',
      dark: 'bg-zinc-900 text-white dark:bg-zinc-950 dark:text-zinc-100',
    },
  };

  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles} ${className}`}>
      {startIcon && <span className="inline-flex shrink-0">{startIcon}</span>}
      {children}
      {endIcon && <span className="inline-flex shrink-0">{endIcon}</span>}
    </span>
  );
};

export default Badge;
