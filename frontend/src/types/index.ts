export type UserRole = 'Admin' | 'Technician' | 'Employee';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TechnicianProfile {
  id: number;
  user_id: number;
  skills: string;
  categories: string;
  is_available: boolean;
  max_workload: number;
  current_workload: number;
  total_resolved: number;
  average_rating: number;
  user: User;
}

export interface SLAPolicy {
  id: number;
  priority: string;
  target_resolution_hours: number;
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface SLAStatusInfo {
  priority: string;
  target_hours: number;
  deadline?: string;
  elapsed_minutes: number;
  remaining_minutes: number;
  percentage_consumed: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL_WARNING' | 'BREACHED' | 'MET';
  is_breached: boolean;
}

export interface RiskFactor {
  feature: string;
  label: string;
  impact: 'INCREASES_RISK' | 'DECREASES_RISK' | 'NEUTRAL';
  importance: number;
  description: string;
}

export interface PredictResponse {
  breach_probability: number;
  risk_level: 'Low' | 'Medium' | 'High';
  explanation: string;
  top_factors: RiskFactor[];
  model_version: string;
  model_type: string;
  is_fallback: boolean;
  trained_at?: string;
}

export interface IncidentComment {
  id: number;
  incident_id: number;
  user_id: number;
  content: string;
  is_internal: boolean;
  created_at: string;
  user?: User;
}

export interface IncidentActivity {
  id: number;
  incident_id: number;
  user_id?: number;
  action: string;
  details: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  user?: User;
}

export interface DuplicateIncident {
  id: number;
  incident_number: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  similarity_score: number;
  created_at: string;
}

export interface Incident {
  id: number;
  incident_number: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  impact: 'Low' | 'Medium' | 'High';
  urgency: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Assigned' | 'In Progress' | 'On Hold' | 'Resolved' | 'Closed';
  reporter_id: number;
  assigned_technician_id?: number;
  assignment_reason?: string;
  reassignment_count: number;
  sla_deadline?: string;
  is_sla_breached: boolean;
  resolution_notes?: string;
  resolution_time_minutes?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  reporter?: User;
  assigned_technician?: User;
  sla_status?: SLAStatusInfo;
  prediction?: PredictResponse;
}

export interface IncidentDetail extends Incident {
  comments: IncidentComment[];
  activities: IncidentActivity[];
  similar_incidents: DuplicateIncident[];
}

export interface IncidentListResponse {
  total: number;
  items: Incident[];
  page: number;
  page_size: number;
}

export interface Notification {
  id: number;
  user_id: number;
  incident_id?: number;
  title: string;
  message: string;
  notification_type: 'ASSIGNMENT' | 'SLA_WARNING' | 'SLA_BREACH' | 'STATUS_UPDATE' | 'HIGH_RISK' | 'UNASSIGNED';
  is_read: boolean;
  created_at: string;
}

export interface DashboardMetrics {
  total_incidents: number;
  open_incidents: number;
  in_progress_incidents: number;
  resolved_incidents: number;
  critical_incidents: number;
  active_sla_breaches: number;
  high_risk_incidents: number;
  sla_compliance_rate: number;
  avg_resolution_hours: number;
  priority_breakdown: { priority: string; count: number }[];
  category_breakdown: { category: string; count: number }[];
  trend_data: { date: string; created: number; resolved: number; breached: number }[];
  technician_metrics: {
    technician_id: number;
    name: string;
    active_incidents: number;
    resolved_incidents: number;
    max_workload: number;
    avg_resolution_hours: number;
    sla_compliance_rate: number;
  }[];
  risk_distribution: {
    low_risk: number;
    medium_risk: number;
    high_risk: number;
  };
}

export interface MLMetrics {
  model_type: string;
  baseline_comparison?: {
    logistic_regression_f1: number;
    random_forest_f1: number;
  };
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  confusion_matrix: number[][];
  training_samples: number;
  test_samples: number;
  trained_at: string;
  feature_importances: Record<string, number>;
}
