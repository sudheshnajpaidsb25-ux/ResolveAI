import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  Shield,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Send,
  UserCheck,
  RefreshCw,
  ExternalLink,
  Lock,
  MessageSquare,
  History,
  TrendingUp,
  TrendingDown,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { IncidentDetail as IncidentDetailType, TechnicianProfile } from '../types';
import { PriorityBadge, StatusBadge, SLABadge, RiskBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [incident, setIncident] = useState<IncidentDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'comments' | 'timeline'>('comments');

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Status Change Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Admin Override Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      const data = await api.getIncidentDetail(Number(id));
      setIncident(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !incident) return;
    setSubmittingComment(true);
    try {
      await api.addComment(incident.id, newComment, isInternalComment);
      setNewComment('');
      fetchDetail();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleOpenStatusModal = (nextStatus: string) => {
    setTargetStatus(nextStatus);
    setResolutionNotes('');
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!incident) return;
    setSubmittingStatus(true);
    try {
      await api.updateIncidentStatus(incident.id, targetStatus, resolutionNotes);
      setIsStatusModalOpen(false);
      fetchDetail();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleOpenAssignModal = async () => {
    try {
      const techs = await api.getTechnicians();
      setTechnicians(techs);
      setSelectedTechId(incident?.assigned_technician_id || '');
      setOverrideReason('');
      setIsAssignModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmOverride = async () => {
    if (!incident || !selectedTechId || !overrideReason.trim()) return;
    setSubmittingOverride(true);
    try {
      await api.overrideAssignment(incident.id, Number(selectedTechId), overrideReason);
      setIsAssignModalOpen(false);
      fetchDetail();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingOverride(false);
    }
  };

  if (loading || !incident) {
    return <LoadingSpinner size="lg" className="min-h-[60vh]" />;
  }

  const sla = incident.sla_status;
  const pred = incident.prediction;

  return (
    <div className="space-y-6">
      {/* Back and Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/incidents')}
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Incidents</span>
        </button>
        <button
          onClick={fetchDetail}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Incident Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="font-mono text-base font-bold text-brand-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-3 py-1 rounded-xl border border-sky-200 dark:border-sky-800">
                {incident.incident_number}
              </span>
              <PriorityBadge priority={incident.priority} size="md" />
              <StatusBadge status={incident.status} size="md" />
              <SLABadge status={sla?.status} isBreached={incident.is_sla_breached} remainingMinutes={sla?.remaining_minutes} />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {incident.title}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Category: <strong className="text-slate-600 dark:text-slate-300">{incident.category}</strong> &bull; Reported by{' '}
              <strong className="text-slate-600 dark:text-slate-300">{incident.reporter?.full_name}</strong> ({incident.reporter?.department}) &bull;{' '}
              {new Date(incident.created_at).toLocaleString()}
            </p>
          </div>

          {/* Workflow Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {incident.status === 'Open' && (
              <button
                onClick={() => handleOpenStatusModal('In Progress')}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/30 transition-all"
              >
                Accept & Start Progress
              </button>
            )}
            {incident.status === 'Assigned' && (
              <button
                onClick={() => handleOpenStatusModal('In Progress')}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/30 transition-all"
              >
                Start Investigation
              </button>
            )}
            {incident.status === 'In Progress' && (
              <>
                <button
                  onClick={() => handleOpenStatusModal('Resolved')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resolve Incident</span>
                </button>
                <button
                  onClick={() => handleOpenStatusModal('On Hold')}
                  className="px-3 py-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-xs font-semibold transition-all"
                >
                  Put On Hold
                </button>
              </>
            )}
            {incident.status === 'On Hold' && (
              <button
                onClick={() => handleOpenStatusModal('In Progress')}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all"
              >
                Resume Progress
              </button>
            )}
            {incident.status === 'Resolved' && (
              <>
                <button
                  onClick={() => handleOpenStatusModal('Closed')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all"
                >
                  Close Incident
                </button>
                <button
                  onClick={() => handleOpenStatusModal('Open')}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-semibold transition-all"
                >
                  Reopen Ticket
                </button>
              </>
            )}
            {incident.status === 'Closed' && (
              <button
                onClick={() => handleOpenStatusModal('Open')}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold transition-all"
              >
                Reopen Ticket
              </button>
            )}
            {hasRole('Admin') && (
              <button
                onClick={handleOpenAssignModal}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1"
              >
                <UserCheck className="w-3.5 h-3.5 text-brand-500" />
                <span>Reassign Tech</span>
              </button>
            )}
          </div>
        </div>

        {/* Detailed Description */}
        <div className="pt-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Incident Description & Context
          </h4>
          <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
            {incident.description}
          </p>
          {incident.resolution_notes && (
            <div className="mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Resolution Record:</span>
              </h5>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 whitespace-pre-line">
                {incident.resolution_notes}
              </p>
              {incident.resolution_time_minutes && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                  Turnaround time: {incident.resolution_time_minutes} minutes ({ (incident.resolution_time_minutes / 60).toFixed(1) } hours)
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid: SLA Countdown, ML Breach Risk Prediction, and Technician Assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. SLA Monitoring Progress Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-brand-500" />
                <span>SLA Commitment Tracker</span>
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Target: {sla?.target_hours}h
              </span>
            </div>

            {/* SLA Progress Bar */}
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Time Consumed</span>
                <span className={incident.is_sla_breached ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                  {sla?.percentage_consumed}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    incident.is_sla_breached
                      ? 'bg-rose-500'
                      : (sla?.percentage_consumed || 0) >= 90
                      ? 'bg-rose-400'
                      : (sla?.percentage_consumed || 0) >= 75
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, sla?.percentage_consumed || 0)}%` }}
                />
              </div>
            </div>

            {/* Timing Stats */}
            <div className="mt-5 space-y-2.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Deadline:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {incident.sla_deadline ? new Date(incident.sla_deadline).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Elapsed:</span>
                <span className="font-semibold">
                  {sla?.elapsed_minutes ? `${Math.round(sla.elapsed_minutes)} mins (${(sla.elapsed_minutes / 60).toFixed(1)}h)` : '0 mins'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining:</span>
                <span className={`font-semibold ${incident.is_sla_breached ? 'text-rose-600 font-bold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {incident.is_sla_breached
                    ? `Overdue by ${Math.abs(Math.round(sla?.remaining_minutes || 0))} mins`
                    : `${Math.max(0, Math.round(sla?.remaining_minutes || 0))} mins left`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Warning thresholds: 75% notice &bull; 90% critical warning.
          </div>
        </div>

        {/* 2. Machine Learning SLA Breach Risk Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-purple-500" />
                <span>AI SLA Breach Prediction</span>
              </h3>
              {pred && (
                <RiskBadge riskLevel={pred.risk_level} probability={pred.breach_probability} />
              )}
            </div>

            {pred ? (
              <div className="space-y-4">
                {/* Gauge Probability */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Estimated Breach Probability</span>
                    <p className={`text-2xl font-extrabold ${
                      pred.risk_level === 'High' ? 'text-rose-600' : pred.risk_level === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {pred.breach_probability}%
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 text-right">
                    Model: <br /><strong className="text-slate-700 dark:text-slate-200">{pred.model_type.split(' ')[0]}</strong>
                  </span>
                </div>

                {/* Top Contributing Factors */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Key Influencing Factors:
                  </span>
                  <div className="space-y-2">
                    {pred.top_factors.map((f, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-start space-x-2"
                      >
                        {f.impact === 'INCREASES_RISK' ? (
                          <TrendingUp className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {f.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {f.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Prediction telemetry unavailable.</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Model: {pred?.model_version || 'v1.0'}</span>
            <span>{pred?.is_fallback ? 'Rule Fallback' : 'Trained Classifier'}</span>
          </div>
        </div>

        {/* 3. Technician Assignment Details */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-sky-500" />
                <span>Assignment & Workload</span>
              </h3>
              <span className="text-xs text-slate-400">
                Reassignments: {incident.reassignment_count}
              </span>
            </div>

            {incident.assigned_technician ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                  <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center shrink-0">
                    {incident.assigned_technician.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {incident.assigned_technician.full_name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {incident.assigned_technician.email}
                    </p>
                    <p className="text-[11px] text-brand-600 dark:text-sky-400 font-medium mt-0.5">
                      {incident.assigned_technician.department}
                    </p>
                  </div>
                </div>

                {/* Assignment Reason */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Assignment Rationale:
                  </span>
                  <div className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {incident.assignment_reason || 'Automated category and workload balancing assignment.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                This incident is currently unassigned. All technicians are at maximum capacity or unavailable.
              </div>
            )}
          </div>

          {hasRole('Admin') && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleOpenAssignModal}
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Override Assignment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs for Timeline and Comments */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-4 space-x-6">
          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'comments'
                ? 'border-brand-600 text-brand-600 dark:text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Discussion & Notes ({incident.comments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-brand-600 text-brand-600 dark:text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail & Activity Log ({incident.activities.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 md:p-8">
          {activeTab === 'comments' ? (
            <div className="space-y-6">
              {/* Existing Comments List */}
              <div className="space-y-4">
                {incident.comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No notes or comments yet posted.</p>
                ) : (
                  incident.comments.map(c => (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                        c.is_internal
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {c.user?.full_name || 'Staff Member'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {c.user?.role}
                          </span>
                          {c.is_internal && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold flex items-center space-x-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Internal Note</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 whitespace-pre-line">
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Post investigation update, user query, or technical resolution note..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex items-center justify-between">
                  {hasRole(['Admin', 'Technician']) ? (
                    <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={e => setIsInternalComment(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-700"
                      />
                      <span>Mark as Private Internal Tech Note</span>
                    </label>
                  ) : <div />}
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-600/30 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Audit Trail Timeline */
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {incident.activities.map(act => (
                <div key={act.id} className="relative group">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-900" />
                  <div className="text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                        {act.action}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                      {act.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Transition Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={`Change Status to "${targetStatus}"`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Confirm transitioning incident <strong>{incident.incident_number}</strong> to <strong>{targetStatus}</strong>.
          </p>

          {(targetStatus === 'Resolved' || targetStatus === 'Closed') && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Resolution Summary & Fix Verification *
              </label>
              <textarea
                rows={3}
                required
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                placeholder="State the root cause and the exact remediation action applied..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmStatusChange}
              disabled={submittingStatus || ((targetStatus === 'Resolved' || targetStatus === 'Closed') && !resolutionNotes.trim())}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold shadow-md disabled:opacity-50"
            >
              {submittingStatus ? 'Updating...' : 'Confirm Status Change'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Admin Reassignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Override Technician Assignment (Admin)"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Select a replacement technician. An audit trail record and in-app notification will be dispatched.
          </p>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Select Technician:
            </label>
            <select
              value={selectedTechId}
              onChange={e => setSelectedTechId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="">Choose a technician...</option>
              {technicians.map(t => (
                <option key={t.id} value={t.user_id}>
                  {t.user.full_name} ({t.user.department}) - Active Workload: {t.current_workload}/{t.max_workload}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Reason for Assignment Override: *
            </label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              placeholder="e.g. Reassigned due to shift change and urgent Cisco certification requirement."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmOverride}
              disabled={submittingOverride || !selectedTechId || !overrideReason.trim()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold shadow-md disabled:opacity-50"
            >
              {submittingOverride ? 'Saving...' : 'Apply Reassignment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
