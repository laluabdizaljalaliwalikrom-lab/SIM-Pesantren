import React from 'react';

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  desc?: string;
  action?: React.ReactNode;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = '',
  desc = '',
  action,
}) => {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
            {title}
          </h3>
          {desc && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
              {desc}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Card Body */}
      <div className="border-t border-slate-100 p-4 sm:p-6 dark:border-zinc-800/80">
        {children}
      </div>
    </div>
  );
};

export default ComponentCard;
