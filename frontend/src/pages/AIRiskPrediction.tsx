import React, { useEffect, useState } from 'react';
import {
  Cpu,
  TrendingUp,
  TrendingDown,
  BarChart2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { api } from '../services/api';
import { MLMetrics, PredictResponse, RiskFactor } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { RiskBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Network', 'Software', 'Hardware', 'Database', 'Security', 'Cloud', 'Access/Email'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const AIRiskPrediction: React.FC = () => {
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState<string | null>(null);

  // Simulator inputs
  const [simCategory, setSimCategory] = useState('Network');
  const [simPriority, setSimPriority] = useState('Critical');
  const [simElapsedHours, setSimElapsedHours] = useState(3.0);
  const [simRemainingHours, setSimRemainingHours] = useState(1.0);
  const [simWorkload, setSimWorkload] = useState(6);
  const [simReassignments, setSimReassignments] = useState(1);
  const [simImpact, setSimImpact] = useState('High');
  const [simUrgency, setSimUrgency] = useState('High');

  // Simulator output
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [simulating, setSimulating] = useState(false);

  const { hasRole } = useAuth();

  const fetchMetrics = async () => {
    try {
      const data = await api.getMLMetrics();
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await api.predictBreach({
        category: simCategory,
        priority: simPriority,
        impact: simImpact,
        urgency: simUrgency,
        elapsed_minutes: simElapsedHours * 60,
        remaining_minutes: simRemainingHours * 60,
        technician_workload: simWorkload,
        reassignment_count: simReassignments
      });
      setPrediction(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    runSimulation();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainMsg(null);
    try {
      const res = await api.retrainModel();
      setMetrics(res.metrics);
      setRetrainMsg('Model successfully retrained on fresh historical incident distributions.');
      runSimulation();
    } catch (err: any) {
      setRetrainMsg(`Retraining failed: ${err.message}`);
    } finally {
      setRetraining(false);
    }
  };

  if (loading || !metrics) {
    return <LoadingSpinner size="lg" className="min-h-[60vh]" />;
  }

  // Format feature importances for chart
  const importanceChartData = Object.entries(metrics.feature_importances || {})
    .slice(0, 10)
    .map(([feature, val]) => ({
      feature: feature.replace('cat__', '').replace('num__', ''),
      importance: Number((val * 100).toFixed(1))
    }))
    .reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            AI Machine Learning SLA Risk Engine
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Supervised Random Forest classification pipeline predicting incident SLA breach probability with explainable factor attributions.
          </p>
        </div>
        {hasRole('Admin') && (
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 flex items-center space-x-2 transition-all disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? 'Retraining Pipeline...' : 'Retrain Model on Fresh Data'}</span>
          </button>
        )}
      </div>

      {retrainMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{retrainMsg}</span>
          </div>
          <button onClick={() => setRetrainMsg(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Grid: Validation Metrics Cards (5 Stats) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <span className="text-xs font-semibold uppercase text-slate-400">Accuracy</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {(metrics.accuracy * 100).toFixed(1)}%
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Validation Set</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <span className="text-xs font-semibold uppercase text-slate-400">ROC-AUC Score</span>
          <p className="text-2xl font-bold text-brand-600 dark:text-sky-400 mt-1">
            {(metrics.roc_auc).toFixed(3)}
          </p>
          <span className="text-[11px] text-slate-400">Discriminative power</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <span className="text-xs font-semibold uppercase text-slate-400">F1 Score</span>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {(metrics.f1_score).toFixed(3)}
          </p>
          <span className="text-[11px] text-slate-400">
            vs LR: {metrics.baseline_comparison?.logistic_regression_f1 || 0.87}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <span className="text-xs font-semibold uppercase text-slate-400">Precision</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {(metrics.precision * 100).toFixed(1)}%
          </p>
          <span className="text-[11px] text-slate-400">True Positive fidelity</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
          <span className="text-xs font-semibold uppercase text-slate-400">Recall</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {(metrics.recall * 100).toFixed(1)}%
          </p>
          <span className="text-[11px] text-slate-400">Breach capture rate</span>
        </div>
      </div>

      {/* Main Section: Interactive Simulator + Feature Importances */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Risk Simulator */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-brand-500" />
                <span>Interactive Incident Risk Simulator</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Adjust operational parameters to test ML model probability estimation and explainable factors.
              </p>
            </div>
            {prediction && (
              <RiskBadge riskLevel={prediction.risk_level} probability={prediction.breach_probability} />
            )}
          </div>

          {/* Form Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={simCategory}
                onChange={e => setSimCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={simPriority}
                onChange={e => setSimPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Elapsed Time (Hours): {simElapsedHours}h
              </label>
              <input
                type="range"
                min="0.1"
                max="24"
                step="0.5"
                value={simElapsedHours}
                onChange={e => setSimElapsedHours(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Remaining Time (Hours): {simRemainingHours}h
              </label>
              <input
                type="range"
                min="0.1"
                max="24"
                step="0.5"
                value={simRemainingHours}
                onChange={e => setSimRemainingHours(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Assigned Tech Workload: {simWorkload} tickets
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={simWorkload}
                onChange={e => setSimWorkload(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Previous Reassignments: {simReassignments}
              </label>
              <input
                type="range"
                min="0"
                max="4"
                value={simReassignments}
                onChange={e => setSimReassignments(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>
          </div>

          <button
            onClick={runSimulation}
            disabled={simulating}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <span>{simulating ? 'Inferencing ML Pipeline...' : 'Evaluate Breach Risk'}</span>
          </button>

          {/* Prediction Output Results */}
          {prediction && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Estimated SLA Breach Probability</span>
                  <p className={`text-3xl font-extrabold ${
                    prediction.risk_level === 'High' ? 'text-rose-600' : prediction.risk_level === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {prediction.breach_probability}%
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Classification:</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{prediction.risk_level} Risk</p>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Top Influencing Feature Attributions:
                </span>
                <div className="space-y-2">
                  {prediction.top_factors.map((f, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-start space-x-2.5"
                    >
                      {f.impact === 'INCREASES_RISK' ? (
                        <TrendingUp className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{f.label}</p>
                          <span className="text-[10px] text-slate-400 font-mono">Weight: {f.importance}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {f.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Feature Importances & Confusion Matrix */}
        <div className="lg:col-span-5 space-y-6">
          {/* Feature Importance Bar Chart */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-brand-500" />
              <span>Learned Feature Weights</span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Relative Gini importance in the Random Forest ensemble
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={importanceChartData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} unit="%" />
                  <YAxis dataKey="feature" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={110} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Bar dataKey="importance" fill="#0284c7" radius={[0, 4, 4, 0]} name="Importance %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Confusion Matrix Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Validation Confusion Matrix
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Test evaluation across {metrics.test_samples} unseen historical records
            </p>

            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">True Negatives</span>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {metrics.confusion_matrix?.[0]?.[0] || 0}
                </p>
                <span className="text-[10px] text-slate-400">Correctly predicted non-breach</span>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300">False Positives</span>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {metrics.confusion_matrix?.[0]?.[1] || 0}
                </p>
                <span className="text-[10px] text-slate-400">Falsely flagged breach</span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300">False Negatives</span>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {metrics.confusion_matrix?.[1]?.[0] || 0}
                </p>
                <span className="text-[10px] text-slate-400">Missed actual breaches</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">True Positives</span>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {metrics.confusion_matrix?.[1]?.[1] || 0}
                </p>
                <span className="text-[10px] text-slate-400">Correctly caught breaches</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
              <span>Trained: {metrics.trained_at}</span>
              <span>Dataset: {metrics.training_samples + metrics.test_samples} incidents</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
