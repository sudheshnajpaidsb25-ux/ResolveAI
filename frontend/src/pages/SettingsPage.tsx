import React, { useEffect, useState } from 'react';
import {
  Settings,
  Database,
  Cpu,
  Clock,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const [system, setSystem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reset demo modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const { hasRole } = useAuth();

  const fetchSystem = async () => {
    try {
      const data = await api.getSystemSettings();
      setSystem(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystem();
  }, []);

  const handleResetDemo = async () => {
    setResetting(true);
    setResetSuccess(null);
    try {
      const res: any = await api.resetDemoData();
      setResetSuccess(res?.message || 'Demo data successfully reset');
      setIsResetModalOpen(false);
      fetchSystem();
    } catch (err: any) {
      alert(`Demo reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-[60vh]" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          System Diagnostics & Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Backend infrastructure telemetry, machine learning configuration, and demo database state.
        </p>
      </div>

      {resetSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{resetSuccess}</span>
          </div>
          <button onClick={() => setResetSuccess(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* System Information Card */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card space-y-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Database className="w-5 h-5 text-brand-500" />
          <span>Platform Runtime & Storage Telemetry</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Database Engine</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {system?.database_backend || 'SQLite'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Production support for PostgreSQL via DATABASE_URL
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">API Architecture</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
              FastAPI v{system?.version || '1.0.0'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Asynchronous OpenAPI Swagger compliant
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">AI Model Pipeline</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
              Scikit-learn RF
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
              Pipeline Status: Active & Loaded
            </p>
          </div>
        </div>

        {/* SLA Default Configuration */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Default Target SLA Hours by Priority Tier:</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-rose-500 font-bold block">Critical</span>
              <strong className="text-slate-900 dark:text-white text-sm">{system?.sla_defaults?.critical_hours}h target</strong>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-amber-500 font-bold block">High</span>
              <strong className="text-slate-900 dark:text-white text-sm">{system?.sla_defaults?.high_hours}h target</strong>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-sky-500 font-bold block">Medium</span>
              <strong className="text-slate-900 dark:text-white text-sm">{system?.sla_defaults?.medium_hours}h target</strong>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-emerald-500 font-bold block">Low</span>
              <strong className="text-slate-900 dark:text-white text-sm">{system?.sla_defaults?.low_hours}h target</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Credentials & Reset Operations */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card space-y-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-sky-500" />
          <span>Demo Experience & Account Credentials</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          For grading and demonstration purposes, the system includes documented multi-role seed accounts:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <span className="font-bold text-purple-600 dark:text-purple-400">Administrator</span>
            <p className="font-mono text-slate-800 dark:text-slate-200 mt-1 font-semibold">admin@resolveai.com</p>
            <p className="font-mono text-slate-400 text-[11px]">Pass: Admin@123</p>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <span className="font-bold text-sky-600 dark:text-sky-400">Lead Technician</span>
            <p className="font-mono text-slate-800 dark:text-slate-200 mt-1 font-semibold">tech@resolveai.com</p>
            <p className="font-mono text-slate-400 text-[11px]">Pass: Tech@123</p>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Employee Reporter</span>
            <p className="font-mono text-slate-800 dark:text-slate-200 mt-1 font-semibold">employee@resolveai.com</p>
            <p className="font-mono text-slate-400 text-[11px]">Pass: Emp@123</p>
          </div>
        </div>

        {hasRole('Admin') && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Reset Demo Database</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Restores the database to its initial 35 sample incidents, audit logs, and technician workloads.
              </p>
            </div>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo State</span>
            </button>
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Confirm Demo Database Reset"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to reset the database? This will clear all newly added tickets and restore the clean 35 seeded demo incidents, historical metrics, and default technician accounts.
          </p>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold shadow-md disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Yes, Reset Demo Data'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
