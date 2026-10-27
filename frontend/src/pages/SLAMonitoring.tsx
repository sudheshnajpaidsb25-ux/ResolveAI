import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Shield,
  Edit,
  RefreshCw,
  ArrowUpRight,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { SLAPolicy, Incident } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { PriorityBadge, SLABadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';

export const SLAMonitoring: React.FC = () => {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [activeTickets, setActiveTickets] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingNow, setCheckingNow] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  // Edit policy state
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);
  const [targetHours, setTargetHours] = useState<number>(4);
  const [warningThreshold, setWarningThreshold] = useState<number>(75);
  const [criticalThreshold, setCriticalThreshold] = useState<number>(90);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [policiesData, incidentsData] = await Promise.all([
        api.getSLAPolicies(),
        api.getIncidents({ page_size: 50 })
      ]);
      setPolicies(policiesData);
      // Filter active tickets that are either breached or have consumed over 50% of time
      const activeOrBreached = incidentsData.items.filter(
        i => i.status !== 'Resolved' && i.status !== 'Closed'
      );
      setActiveTickets(activeOrBreached);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunCheckNow = async () => {
    setCheckingNow(true);
    setCheckResult(null);
    try {
      const res = await api.checkSLANow();
      setCheckResult(res);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingNow(false);
    }
  };

  const handleOpenEditPolicy = (p: SLAPolicy) => {
    setEditingPolicy(p);
    setTargetHours(p.target_resolution_hours);
    setWarningThreshold(p.warning_threshold_percent);
    setCriticalThreshold(p.critical_threshold_percent);
  };

  const handleSavePolicy = async () => {
    if (!editingPolicy) return;
    setSavingPolicy(true);
    try {
      await api.updateSLAPolicy(editingPolicy.id, {
        target_resolution_hours: targetHours,
        warning_threshold_percent: warningThreshold,
        critical_threshold_percent: criticalThreshold
      });
      setEditingPolicy(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPolicy(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            SLA Policies & Deadline Governance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure resolution targets, warning thresholds, and active breach escalation parameters.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunCheckNow}
            disabled={checkingNow}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${checkingNow ? 'animate-bounce' : ''}`} />
            <span>{checkingNow ? 'Evaluating Deadlines...' : 'Run SLA Check Now'}</span>
          </button>
        </div>
      </div>

      {/* Manual Check Result Banner */}
      {checkResult && (
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
            <span>
              Evaluated {checkResult.checked_incidents} active incidents: {checkResult.newly_breached} new breaches, {checkResult.new_critical_warnings} critical warnings, and {checkResult.new_warnings} standard warnings.
            </span>
          </div>
          <button onClick={() => setCheckResult(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* SLA Policy Cards Grid (Critical, High, Medium, Low) */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-brand-500" />
          <span>Configured Priority Targets</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {policies.map(p => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <PriorityBadge priority={p.priority} />
                  {hasRole('Admin') && (
                    <button
                      onClick={() => handleOpenEditPolicy(p)}
                      className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-sky-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Policy"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="my-2">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {p.target_resolution_hours} <span className="text-sm font-normal text-slate-400">hours</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {p.description || 'Target resolution window for incoming incidents.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Warning Threshold:</span>
                  <strong className="text-amber-600 dark:text-amber-400">{p.warning_threshold_percent}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>Critical Threshold:</span>
                  <strong className="text-rose-600 dark:text-rose-400">{p.critical_threshold_percent}%</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Watchlist Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Active Incidents Watchlist & SLA Consumption
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live tracking of active tickets against contracted resolution deadlines
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {activeTickets.length} Active Tickets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Assigned Tech</th>
                <th className="py-3 px-4">SLA Deadline</th>
                <th className="py-3 px-4 w-48">Time Consumed</th>
                <th className="py-3 px-4">Remaining Buffer</th>
                <th className="py-3 px-4">SLA State</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeTickets.map(inc => {
                const sla = inc.sla_status;
                const pct = sla?.percentage_consumed || 0;
                return (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-sky-400">
                      {inc.incident_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={inc.priority} />
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-200">
                      {inc.assigned_technician?.full_name || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {inc.sla_deadline ? new Date(inc.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              inc.is_sla_breached
                                ? 'bg-rose-500'
                                : pct >= 90
                                ? 'bg-rose-400'
                                : pct >= 75
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {inc.is_sla_breached ? (
                        <span className="text-rose-600 font-bold">
                          -{Math.abs(Math.round(sla?.remaining_minutes || 0))}m
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {Math.round(sla?.remaining_minutes || 0)}m
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <SLABadge status={sla?.status} isBreached={inc.is_sla_breached} remainingMinutes={sla?.remaining_minutes} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/incidents/${inc.id}`);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 dark:hover:text-sky-400"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Policy Modal */}
      <Modal
        isOpen={!!editingPolicy}
        onClose={() => setEditingPolicy(null)}
        title={`Edit SLA Policy: ${editingPolicy?.priority} Priority`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Target Resolution Time (Hours)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="168"
              value={targetHours}
              onChange={e => setTargetHours(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Warning Alert Threshold (% Consumed)
            </label>
            <input
              type="number"
              min="10"
              max="99"
              value={warningThreshold}
              onChange={e => setWarningThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Critical Warning Threshold (% Consumed)
            </label>
            <input
              type="number"
              min="10"
              max="99"
              value={criticalThreshold}
              onChange={e => setCriticalThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              onClick={() => setEditingPolicy(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePolicy}
              disabled={savingPolicy}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold shadow-md disabled:opacity-50"
            >
              {savingPolicy ? 'Saving...' : 'Save Policy Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
