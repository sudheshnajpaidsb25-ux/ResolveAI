import {
  User, Incident, IncidentDetail, IncidentListResponse,
  TechnicianProfile, SLAPolicy, SLAStatusInfo, PredictResponse,
  MLMetrics, Notification, DashboardMetrics, DuplicateIncident
} from '../types';

const BASE_URL = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    let errorMsg = 'An unexpected error occurred';
    try {
      const err = await res.json();
      errorMsg = err.detail || err.message || JSON.stringify(err);
    } catch {
      errorMsg = res.statusText;
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Incidents
  async getIncidents(params: {
    status?: string;
    priority?: string;
    category?: string;
    technician_id?: number;
    search?: string;
    breached_only?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<IncidentListResponse> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.technician_id) query.append('technician_id', params.technician_id.toString());
    if (params.search) query.append('search', params.search);
    if (params.breached_only) query.append('breached_only', 'true');
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());

    const res = await fetch(`${BASE_URL}/incidents?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getIncidentDetail(id: number): Promise<IncidentDetail> {
    const res = await fetch(`${BASE_URL}/incidents/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createIncident(data: {
    title: string;
    description: string;
    category: string;
    priority: string;
    impact: string;
    urgency: string;
  }): Promise<Incident> {
    const res = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateIncidentStatus(id: number, status: string, resolution_notes?: string): Promise<Incident> {
    const res = await fetch(`${BASE_URL}/incidents/${id}/status`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, resolution_notes })
    });
    return handleResponse(res);
  },

  async overrideAssignment(id: number, technician_id: number, reason: string): Promise<Incident> {
    const res = await fetch(`${BASE_URL}/incidents/${id}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ technician_id, reason })
    });
    return handleResponse(res);
  },

  async addComment(id: number, content: string, is_internal = false) {
    const res = await fetch(`${BASE_URL}/incidents/${id}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, is_internal })
    });
    return handleResponse(res);
  },

  // Technicians
  async getTechnicians(): Promise<TechnicianProfile[]> {
    const res = await fetch(`${BASE_URL}/technicians`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateTechnician(id: number, data: Partial<TechnicianProfile>): Promise<TechnicianProfile> {
    const res = await fetch(`${BASE_URL}/technicians/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async toggleTechnicianAvailability(id: number): Promise<TechnicianProfile> {
    const res = await fetch(`${BASE_URL}/technicians/${id}/toggle-availability`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // SLA
  async getSLAPolicies(): Promise<SLAPolicy[]> {
    const res = await fetch(`${BASE_URL}/sla/policies`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateSLAPolicy(id: number, data: Partial<SLAPolicy>): Promise<SLAPolicy> {
    const res = await fetch(`${BASE_URL}/sla/policies/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async checkSLANow(): Promise<{
    checked_incidents: number;
    newly_breached: number;
    new_critical_warnings: number;
    new_warnings: number;
    timestamp: string;
  }> {
    const res = await fetch(`${BASE_URL}/sla/check-now`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Machine Learning
  async predictBreach(data: {
    category: string;
    priority: string;
    impact?: string;
    urgency?: string;
    elapsed_minutes?: number;
    remaining_minutes?: number;
    technician_workload?: number;
    reassignment_count?: number;
    status?: string;
  }): Promise<PredictResponse> {
    const res = await fetch(`${BASE_URL}/ml/predict`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getMLMetrics(): Promise<MLMetrics> {
    const res = await fetch(`${BASE_URL}/ml/metrics`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async retrainModel(): Promise<{ status: string; message: string; metrics: MLMetrics }> {
    const res = await fetch(`${BASE_URL}/ml/retrain`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Duplicates
  async checkDuplicates(title: string, description: string, exclude_id?: number): Promise<DuplicateIncident[]> {
    const res = await fetch(`${BASE_URL}/duplicates/check`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, description, exclude_id })
    });
    return handleResponse(res);
  },

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    const res = await fetch(`${BASE_URL}/notifications`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getUnreadNotificationCount(): Promise<{ unread_count: number }> {
    const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async markNotificationRead(id: number): Promise<Notification> {
    const res = await fetch(`${BASE_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead(): Promise<void> {
    await fetch(`${BASE_URL}/notifications/mark-all-read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
  },

  // Analytics
  async getDashboardMetrics(days = 30): Promise<DashboardMetrics> {
    const res = await fetch(`${BASE_URL}/analytics/dashboard?days=${days}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Reports
  async getReportsSummary(category?: string, priority?: string, days = 30) {
    const query = new URLSearchParams({ days: days.toString() });
    if (category) query.append('category', category);
    if (priority) query.append('priority', priority);
    const res = await fetch(`${BASE_URL}/reports/summary?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getExportCsvUrl(category?: string, priority?: string, status?: string): string {
    const query = new URLSearchParams();
    if (category && category !== 'All') query.append('category', category);
    if (priority && priority !== 'All') query.append('priority', priority);
    if (status && status !== 'All') query.append('status', status);
    return `${BASE_URL}/reports/export-csv?${query.toString()}`;
  },

  // Users
  async getUsers(role?: string, search?: string): Promise<User[]> {
    const query = new URLSearchParams();
    if (role && role !== 'All') query.append('role', role);
    if (search) query.append('search', search);
    const res = await fetch(`${BASE_URL}/users?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createUser(data: Partial<User> & { password: string }): Promise<User> {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async toggleUserStatus(id: number): Promise<User> {
    const res = await fetch(`${BASE_URL}/users/${id}/toggle-status`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Settings
  async getSystemSettings() {
    const res = await fetch(`${BASE_URL}/settings/system`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async resetDemoData() {
    const res = await fetch(`${BASE_URL}/settings/reset-demo`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};
