import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Edit,
  Mail,
  Phone,
  Briefcase,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Star
} from 'lucide-react';
import { api } from '../services/api';
import { TechnicianProfile } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

export const Technicians: React.FC = () => {
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTech, setEditingTech] = useState<TechnicianProfile | null>(null);

  // Form edit state
  const [skills, setSkills] = useState('');
  const [categories, setCategories] = useState('');
  const [maxWorkload, setMaxWorkload] = useState(8);
  const [saving, setSaving] = useState(false);

  const { user, hasRole } = useAuth();

  const fetchTechs = async () => {
    try {
      const data = await api.getTechnicians();
      setTechnicians(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechs();
  }, []);

  const handleToggleAvailability = async (id: number) => {
    try {
      await api.toggleTechnicianAvailability(id);
      fetchTechs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEdit = (tech: TechnicianProfile) => {
    setEditingTech(tech);
    setSkills(tech.skills);
    setCategories(tech.categories);
    setMaxWorkload(tech.max_workload);
  };

  const handleSaveEdit = async () => {
    if (!editingTech) return;
    setSaving(true);
    try {
      await api.updateTechnician(editingTech.id, {
        skills,
        categories,
        max_workload: maxWorkload
      });
      setEditingTech(null);
      fetchTechs();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Support Technicians & Workload Balancing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage skill profiles, category domain mappings, active ticket allocations, and availability.
          </p>
        </div>
        <button
          onClick={fetchTechs}
          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Technicians Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {technicians.map(tech => {
          const workloadRatio = (tech.current_workload / Math.max(1, tech.max_workload)) * 100;
          const skillsList = (tech.skills || '').split(',').map(s => s.trim()).filter(Boolean);
          const catsList = (tech.categories || '').split(',').map(c => c.trim()).filter(Boolean);
          const isMe = user?.id === tech.user_id;
          const canEdit = hasRole('Admin') || isMe;

          return (
            <div
              key={tech.id}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between"
            >
              <div>
                {/* Card Top: Avatar, Name & Availability Badge */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white font-bold text-base flex items-center justify-center shadow-md">
                      {tech.user.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {tech.user.full_name}
                      </h3>
                      <p className="text-xs text-slate-400">{tech.user.department}</p>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="flex items-center space-x-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{tech.user.email}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Availability Toggle */}
                  <button
                    onClick={() => canEdit && handleToggleAvailability(tech.id)}
                    disabled={!canEdit}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      tech.is_available
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${tech.is_available ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span>{tech.is_available ? 'Available' : 'Away'}</span>
                  </button>
                </div>

                {/* Workload Progress Bar */}
                <div className="mt-5 space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Current Workload</span>
                    <span className={workloadRatio >= 85 ? 'text-rose-600 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                      {tech.current_workload} / {tech.max_workload} tickets ({Math.round(workloadRatio)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        workloadRatio >= 85
                          ? 'bg-rose-500'
                          : workloadRatio >= 60
                          ? 'bg-amber-400'
                          : 'bg-brand-500'
                      }`}
                      style={{ width: `${Math.min(100, workloadRatio)}%` }}
                    />
                  </div>
                </div>

                {/* Skills Chips */}
                <div className="mt-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Technical Skills:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsList.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 text-[11px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-lg border border-sky-200 dark:border-sky-800/60"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Supported Categories */}
                <div className="mt-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Primary Categories:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {catsList.map((cat, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Metrics & Edit Button */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
                  <span>Resolved: <strong className="text-slate-800 dark:text-white font-bold">{tech.total_resolved}</strong></span>
                  <span>&bull;</span>
                  <span className="flex items-center space-x-1 text-amber-500 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{tech.average_rating.toFixed(1)}</span>
                  </span>
                </div>

                {canEdit && (
                  <button
                    onClick={() => handleOpenEdit(tech)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl text-brand-600 dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Technician Profile Modal */}
      <Modal
        isOpen={!!editingTech}
        onClose={() => setEditingTech(null)}
        title={`Edit Technician Profile: ${editingTech?.user.full_name}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Technical Skills (Comma-separated)
            </label>
            <input
              type="text"
              value={skills}
              onChange={e => setSkills(e.target.value)}
              placeholder="e.g. Cisco, VPN, Routing, DNS, Wi-Fi"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Supported Domains / Categories (Comma-separated)
            </label>
            <input
              type="text"
              value={categories}
              onChange={e => setCategories(e.target.value)}
              placeholder="e.g. Network, Hardware, Security"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          {hasRole('Admin') && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Maximum Ticket Capacity Limit (Admin Only)
              </label>
              <input
                type="number"
                min={1}
                max={25}
                value={maxWorkload}
                onChange={e => setMaxWorkload(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              onClick={() => setEditingTech(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold shadow-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
