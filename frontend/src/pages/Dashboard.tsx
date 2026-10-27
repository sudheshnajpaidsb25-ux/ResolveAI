import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Flame,
  ArrowUpRight,
  RefreshCw,
  Users,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#f43f5e',
  High: '#f59e0b',
  Medium: '#0284c7',
  Low: '#10b981',
};

const RISK_COLORS = ['#10b981', '#f59e0b', '#f43f5e'];

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchMetrics = async () => {
    try {
      setIsRefreshing(true);
      const data = await api.getDashboardMetrics(days);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [days]);

  if (loading || !metrics) {
    return <LoadingSpinner size="lg" className="min-h-[60vh]" />;
  }

  // Data formatting for charts
  const priorityChartData = metrics.priority_breakdown.map(p => ({
    name: p.priority,
    value: p.count,
    color: PRIORITY_COLORS[p.priority] || '#64748b'
  }));

  const riskData = [
    { name: 'Low Risk', value: metrics.risk_distribution.low_risk, color: '#10b981' },
    { name: 'Medium Risk', value: metrics.risk_distribution.medium_risk, color: '#f59e0b' },
    { name: 'High Risk', value: metrics.risk_distribution.high_risk, color: '#f43f5e' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            IT Incident & SLA Command Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time telemetry, automated technician allocations, and predictive SLA breach analytics.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <button
            onClick={fetchMetrics}
            disabled={isRefreshing}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Critical SLA Breach Ticker Banner if breaches exist */}
      {metrics.active_sla_breaches > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 rounded-2xl p-4 flex items-center justify-between shadow-subtle">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30">
              <ShieldAlert className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Action Required: {metrics.active_sla_breaches} Active SLA {metrics.active_sla_breaches === 1 ? 'Breach' : 'Breaches'} Detected
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                Incidents have exceeded their configured contractual resolution targets. Immediate technician intervention needed.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/incidents?breached_only=true')}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors flex items-center space-x-1"
          >
            <span>View Breaches</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Grid (8 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Incidents */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Volume</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {metrics.total_incidents}
          </p>
          <div className="flex items-center space-x-2 mt-1 text-xs text-slate-400">
            <span>{metrics.open_incidents} Open</span>
            <span>&bull;</span>
            <span>{metrics.in_progress_incidents} In Progress</span>
          </div>
        </div>

        {/* SLA Compliance Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">SLA Compliance</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {metrics.sla_compliance_rate}%
          </p>
          <p className="text-xs text-slate-400 mt-1">Target threshold: &ge; 90%</p>
        </div>

        {/* Active Breaches */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Breaches</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            {metrics.active_sla_breaches}
          </p>
          <p className="text-xs text-slate-400 mt-1">Requires emergency escalation</p>
        </div>

        {/* High Risk of Breach */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">AI High Risk</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {metrics.high_risk_incidents}
          </p>
          <p className="text-xs text-slate-400 mt-1">ML predicted breach risk &gt;70%</p>
        </div>

        {/* Critical Priority Active */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical Active</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {metrics.critical_incidents}
          </p>
          <p className="text-xs text-slate-400 mt-1">4-hour strict resolution SLA</p>
        </div>

        {/* Avg Resolution Time */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Resolution</span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {metrics.avg_resolution_hours} <span className="text-sm font-normal text-slate-400">hrs</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Historical turnaround time</p>
        </div>

        {/* Resolved Count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved Tickets</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {metrics.resolved_incidents}
          </p>
          <p className="text-xs text-slate-400 mt-1">Closed or resolved states</p>
        </div>

        {/* ML Prediction Engine Status */}
        <div className="bg-gradient-to-br from-brand-600 to-sky-700 text-white p-5 rounded-2xl shadow-elevated">
          <div className="flex items-center justify-between text-sky-100">
            <span className="text-xs font-semibold uppercase tracking-wider">AI SLA Engine</span>
            <Cpu className="w-4 h-4 text-sky-200" />
          </div>
          <p className="text-xl font-bold mt-2">Random Forest</p>
          <div className="mt-1 flex items-center justify-between text-xs text-sky-100">
            <span>Accuracy: 94.3%</span>
            <button
              onClick={() => navigate('/ml-prediction')}
              className="underline text-white font-medium hover:text-sky-200"
            >
              Inspect &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Charts Row 1: 7-Day Trend & Priority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Trends Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Incident Volume & SLA Resolution Trends
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comparison of daily incoming incidents vs resolved and breached tickets
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.trend_data}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="created" name="Created" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCreated)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorResolved)" />
                <Area type="monotone" dataKey="breached" name="Breached" stroke="#f43f5e" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Breakdown Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Incidents by Priority
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active incident distribution
            </p>
          </div>
          <div className="h-56 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            {priorityChartData.map(p => (
              <div key={p.name} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{p.name}: {p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Category Volume & Technician Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents by Category */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Incidents by Technical Domain
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Volume across infrastructure and application categories
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.category_breakdown} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[0, 6, 6, 0]} name="Incident Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Technician Active Workload & Capacity */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Technician Workload & Capacity Balance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Active tickets vs maximum workload limit per technician
              </p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.technician_metrics} margin={{ top: 10, right: 10 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="active_incidents" name="Active Tickets" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="max_workload" name="Max Capacity" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Risk Distribution Breakdown */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              AI-Predicted SLA Breach Risk Spectrum
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Machine learning assessment across active open & in-progress incidents
            </p>
          </div>
          <button
            onClick={() => navigate('/ml-prediction')}
            className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center space-x-1"
          >
            <span>Run ML Risk Simulator</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Low Risk (&lt; 35%)</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{metrics.risk_distribution.low_risk}</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Healthy SLA buffer, low workload, normal priority.</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Medium Risk (35% - 70%)</span>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{metrics.risk_distribution.medium_risk}</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Over 50% time elapsed or technician near workload cap.</p>
          </div>
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">High Risk (&gt; 70%)</span>
              <span className="text-lg font-bold text-rose-700 dark:text-rose-400">{metrics.risk_distribution.high_risk}</span>
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-500 mt-1">Approaching SLA deadline or multiple reassignments.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
