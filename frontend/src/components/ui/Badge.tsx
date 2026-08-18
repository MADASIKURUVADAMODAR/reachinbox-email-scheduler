import React from 'react';
import type { EmailStatus } from '../../types';

interface BadgeProps {
  status: EmailStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toLowerCase();

  let styles = 'bg-slate-800 text-slate-300 border-slate-700';

  if (normalized === 'sent') {
    styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20';
  } else if (normalized === 'scheduled') {
    styles = 'bg-blue-500/10 text-blue-400 border-blue-500/30 ring-1 ring-blue-500/20';
  } else if (normalized === 'processing') {
    styles = 'bg-amber-500/10 text-amber-400 border-amber-500/30 ring-1 ring-amber-500/20 animate-pulse';
  } else if (normalized === 'failed') {
    styles = 'bg-rose-500/10 text-rose-400 border-rose-500/30 ring-1 ring-rose-500/20';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
