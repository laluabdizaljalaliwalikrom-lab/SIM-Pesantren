'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ChartTabProps {
  selected: string;
  onChange: (tab: any) => void;
  options?: { label: string; value: string }[];
}

export const ChartTab: React.FC<ChartTabProps> = ({
  selected,
  onChange,
  options = [
    { label: 'Bulanan', value: 'monthly' },
    { label: 'Kuartalan', value: 'quarterly' },
    { label: 'Tahunan', value: 'annually' },
  ],
}) => {
  const getButtonClass = (value: string) =>
    selected === value
      ? 'shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800'
      : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="flex max-h-10 items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-all hover:text-gray-900 dark:hover:text-white',
            getButtonClass(opt.value)
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default ChartTab;
