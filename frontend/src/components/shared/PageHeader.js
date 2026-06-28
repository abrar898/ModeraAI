import React from 'react';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-5 sm:mb-7 pb-4 sm:pb-5 border-b border-mist-dark dark:border-dusk-line">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-ink dark:text-paper mb-1">{title}</h1>
        {subtitle && <p className="text-sm text-ink/50 dark:text-paper/45 leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
