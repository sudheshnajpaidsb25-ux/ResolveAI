import React, { useEffect, useState } from 'react';
import {
  Download,
  Filter,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const CATEGORIES = ['All', 'Network', 'Software', 'Hardware', 'Database', 'Security', 'Cloud', 'Access/Email'];
const PRIORITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['All', 'Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'];

export const Reports: React.FC = () => {
  const [days, setDays] = useState(30);
  const [category, setCategory] = useState('All');
  const [priority, setPriority] = useState('All');
  const [status, setStatus] = useState('All');

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await api.getReportsSummary(
        category !== 'All' ? category : undefined,
        priority !== 'All' ? priority : undefined,
        days
      );
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [days, category, priority]);

  const handleExportCsv = () => {
    const url = api.getExportCsvUrl(category, priority, status);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Executive Reports & Telemetry Export
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit-compliant reporting, category resolution benchmarks, and filtered CSV dataset exports.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Filtered CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Time Window
          </label>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={180}>Last 180 Days</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Category Domain
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Priority Tier
          </label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
          >
            {PRIORITIES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Status (Export Filter)
          </label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" className="min-h-[40vh]" />
      ) : summary ? (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reported Volume</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {summary.total_incidents}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Across chosen time window</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved Tickets</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {summary.resolved_count}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Fully verified closures</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Breached SLA Count</span>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {summary.breached_count}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Missed SLA resolution targets</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SLA Compliance Rate</span>
              <p className="text-2xl font-bold text-brand-600 dark:text-sky-400 mt-1">
                {summary.compliance_rate}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Contractual target &ge; 90%</p>
            </div>
          </div>

          {/* Category Turnaround Performance Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Mean Resolution Turnaround by Technical Domain
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Benchmark turnaround time across resolved incidents in chosen period
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-5">Category Domain</th>
                    <th className="py-3 px-5">Resolved Tickets</th>
                    <th className="py-3 px-5">Average Resolution Turnaround</th>
                    <th className="py-3 px-5 text-right">Performance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {summary.category_performance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                        No resolved incidents in chosen filter period.
                      </td>
                    </tr>
                  ) : (
                    summary.category_performance.map((cp: any) => (
                      <tr key={cp.category} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                          {cp.category}
                        </td>
                        <td className="py-3.5 px-5 font-medium text-slate-700 dark:text-slate-300">
                          {cp.resolved_count} incidents
                        </td>
                        <td className="py-3.5 px-5 font-bold text-brand-600 dark:text-sky-400">
                          {cp.avg_resolution_hours} hours
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                            cp.avg_resolution_hours < 8
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}>
                            {cp.avg_resolution_hours < 8 ? 'Optimal' : 'Standard'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
