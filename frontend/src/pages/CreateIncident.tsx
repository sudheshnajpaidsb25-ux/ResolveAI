import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { DuplicateIncident } from '../types';

const CATEGORIES = ['Network', 'Software', 'Hardware', 'Database', 'Security', 'Cloud', 'Access/Email'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const IMPACTS = ['High', 'Medium', 'Low'];
const URGENCIES = ['High', 'Medium', 'Low'];

export const CreateIncident: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Network');
  const [priority, setPriority] = useState('Medium');
  const [impact, setImpact] = useState('Medium');
  const [urgency, setUrgency] = useState('Medium');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duplicate detection state
  const [duplicates, setDuplicates] = useState<DuplicateIncident[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Debounced duplicate detection
  useEffect(() => {
    if (title.length < 5 && description.length < 10) {
      setDuplicates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicates(true);
      try {
        const matches = await api.checkDuplicates(title, description);
        setDuplicates(matches);
      } catch (err) {
        console.error('Duplicate check error:', err);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [title, description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide a title and detailed description.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const created = await api.createIncident({
        title,
        description,
        category,
        priority,
        impact,
        urgency
      });
      navigate(`/incidents/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit incident.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Submit New Technical Incident
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Provide incident details to auto-calculate SLA commitments and assign the most qualified technician.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Duplicate Incident Real-time Alert */}
      {duplicates.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 shadow-card animate-in fade-in">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Similar Incidents Detected ({duplicates.length} {duplicates.length === 1 ? 'match' : 'matches'})
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                TF-IDF cosine similarity detected existing active or recent tickets with matching descriptions. Review them to avoid duplicate effort:
              </p>
              <div className="mt-3 space-y-2">
                {duplicates.map(d => (
                  <div
                    key={d.id}
                    className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-3">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                        {d.incident_number}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {d.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {d.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                        {d.similarity_score}% Match
                      </span>
                      <a
                        href={`/incidents/${d.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-0.5"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Incident Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Incident Short Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Core Switch BGP flapping causing high packet loss in EMEA region"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-sm transition-all"
          />
          {isCheckingDuplicates && (
            <p className="text-[11px] text-brand-600 dark:text-brand-400 mt-1.5 flex items-center space-x-1 animate-pulse">
              <Sparkles className="w-3 h-3" />
              <span>Analyzing historical records for duplicate tickets...</span>
            </p>
          )}
        </div>

        {/* Priority & Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Incident Category *
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Determines specialized technician matching rules.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Incident Priority *
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
            >
              {PRIORITIES.map(p => (
                <option key={p} value={p}>
                  {p} ({p === 'Critical' ? '4h SLA' : p === 'High' ? '8h SLA' : p === 'Medium' ? '24h SLA' : '72h SLA'})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Governs contractual resolution target window.
            </p>
          </div>
        </div>

        {/* Impact & Urgency Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Business Impact
            </label>
            <select
              value={impact}
              onChange={e => setImpact(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
            >
              {IMPACTS.map(i => (
                <option key={i} value={i}>{i} Impact</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Operational Urgency
            </label>
            <select
              value={urgency}
              onChange={e => setUrgency(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
            >
              {URGENCIES.map(u => (
                <option key={u} value={u}>{u} Urgency</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Detailed Diagnostic & Error Information *
          </label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe steps to reproduce, affected hosts/services, error messages, and logs..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm leading-relaxed"
          />
        </div>

        {/* Informational SLA banner */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start space-x-3 text-xs text-slate-600 dark:text-slate-300">
          <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white">Automated SLA & Technician Assignment Notice:</span>
            <p className="mt-0.5">
              Upon submission, ResolveAI will immediately calculate the exact deadline, assign the optimal technician based on domain skills and workload limits, and initialize the Machine Learning SLA breach prediction engine.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/incidents')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Submitting & Assigning...' : 'Submit Incident'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
