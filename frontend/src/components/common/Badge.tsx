import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'priority' | 'status' | 'sla' | 'risk';
  className?: string;
}

export const PriorityBadge: React.FC<{ priority: string; size?: 'sm' | 'md' }> = ({ priority, size = 'sm' }) => {
  const p = priority.toLowerCase();
  let colors = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  if (p === 'critical') {
    colors = 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800';
  } else if (p === 'high') {
    colors = 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800';
  } else if (p === 'medium') {
    colors = 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800';
  } else if (p === 'low') {
    colors = 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800';
  }

  const px = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${colors} ${px}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {priority}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const s = status.toLowerCase();
  let colors = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  if (s === 'in progress') {
    colors = 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800';
  } else if (s === 'assigned') {
    colors = 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800';
  } else if (s === 'resolved') {
    colors = 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800';
  } else if (s === 'closed') {
    colors = 'bg-slate-200 text-slate-800 border-slate-400 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-700';
  } else if (s === 'on hold') {
    colors = 'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800';
  } else if (s === 'open') {
    colors = 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800';
  }

  const px = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center font-medium rounded-md border ${colors} ${px}`}>
      {status}
    </span>
  );
};

export const SLABadge: React.FC<{
  status?: string;
  isBreached?: boolean;
  remainingMinutes?: number;
}> = ({ status, isBreached, remainingMinutes }) => {
  if (isBreached || status === 'BREACHED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800">
        <span className="w-2 h-2 rounded-full mr-1.5 bg-rose-500 animate-pulse" />
        Breached
      </span>
    );
  }
  if (status === 'CRITICAL_WARNING') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
        <span className="w-2 h-2 rounded-full mr-1.5 bg-rose-400" />
        &gt;90% Consumed
      </span>
    );
  }
  if (status === 'WARNING') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
        <span className="w-2 h-2 rounded-full mr-1.5 bg-amber-400" />
        &gt;75% Consumed
      </span>
    );
  }
  if (status === 'MET') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
        ✓ Met
      </span>
    );
  }

  // Normal active
  let text = 'Normal';
  if (remainingMinutes !== undefined && remainingMinutes > 0) {
    if (remainingMinutes < 60) {
      text = `${Math.round(remainingMinutes)}m left`;
    } else {
      text = `${(remainingMinutes / 60).toFixed(1)}h left`;
    }
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
      {text}
    </span>
  );
};

export const RiskBadge: React.FC<{ riskLevel: 'Low' | 'Medium' | 'High'; probability?: number }> = ({ riskLevel, probability }) => {
  let colors = 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
  if (riskLevel === 'High') {
    colors = 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
  } else if (riskLevel === 'Medium') {
    colors = 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors}`}>
      {riskLevel} Risk {probability !== undefined ? `(${Math.round(probability)}%)` : ''}
    </span>
  );
};
