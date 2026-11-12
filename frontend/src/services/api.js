// ==============================================================================
// FILE: frontend/src/services/api.js
// MÔ TẢ: API Service Layer - Giao tiếp với FastAPI Backend
// ==============================================================================

const API_BASE = 'http://localhost:8000/api';

/**
 * Trả về đường dẫn đầy đủ của avatar (hỗ trợ static backend, base64, external URL)
 */
export function getAvatarUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const baseUrl = API_BASE.replace(/\/api\/?$/, '');
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Generic fetch wrapper with error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==============================================================================
// AUTH (Đăng nhập / Đăng ký)
// ==============================================================================
export async function loginUser(email, password, role) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export async function registerUser(data) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function loginWithGoogle(data) {
  return request('/auth/google', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==============================================================================
// CANDIDATES
// ==============================================================================
export async function fetchCandidates() {
  return request('/candidates');
}

export async function fetchEmployerCandidates(params = {}) {
  const query = new URLSearchParams();
  if (params.job_id && params.job_id !== 'all') query.append('job_id', params.job_id);
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(`/employer/candidates${qs}`);
}

export async function deleteCandidate(candidateId) {
  return request(`/candidates/${candidateId}`, {
    method: 'DELETE',
  });
}

export async function fetchCandidate(id) {
  return request(`/candidates/${id}`);
}

export async function fetchMyCVs(userId) {
  return request(`/candidates/my-cvs/${userId}`);
}

export async function uploadCV(userId, file) {
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/candidates/upload-cv`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function createCandidate(data) {
  return request('/candidates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==============================================================================
// JOBS
// ==============================================================================
export async function fetchJobs(activeOnly = true) {
  return request(`/jobs?active_only=${activeOnly}`);
}

export async function createJob(data) {
  return request('/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchJob(id) {
  return request(`/jobs/${id}`);
}

export async function updateJob(id, data) {
  return request(`/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteJob(id) {
  return request(`/jobs/${id}`, {
    method: 'DELETE',
  });
}

// ==============================================================================
// ★ MATCHING (Core 1-to-N)
// ==============================================================================
export async function runMatch1To1(cvId, jdId) {
  return request('/match/1-to-1', {
    method: 'POST',
    body: JSON.stringify({ cv_id: cvId, jd_id: jdId }),
  });
}

export async function runMatch1ToN(cvId) {
  return request('/match/1-to-n', {
    method: 'POST',
    body: JSON.stringify({ cv_id: cvId }),
  });
}

export async function fetchMatchResults(cvId) {
  return request(`/match/results/${cvId}`);
}

// ==============================================================================
// ★★ MATCHING N-to-1 (1 JD → N CVs)
// ==============================================================================
export async function runMatchNTo1(jdId) {
  return request('/match/n-to-1', {
    method: 'POST',
    body: JSON.stringify({ jd_id: jdId }),
  });
}

// ==============================================================================
// ★★ APPLY JOB
// ==============================================================================
export async function applyJob(data) {
  return request('/jobs/apply', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchAppliedJobs(userId) {
  return request(`/candidates/applied-jobs/${userId}`);
}

export async function fetchJobCandidates(jobId, status = null) {
  const url = status && status !== 'all' 
    ? `/jobs/${jobId}/candidates?status=${status}` 
    : `/jobs/${jobId}/candidates`;
  return request(url);
}

export async function updateCandidateStatus(jobId, cvId, status) {
  return request(`/jobs/${jobId}/candidates/${cvId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function assignCandidateToJob(jobId, cvId, data = {}) {
  return request(`/jobs/${jobId}/candidates/${cvId}/assign`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function scheduleInterview(jobId, cvId, data) {
  return request(`/jobs/${jobId}/candidates/${cvId}/schedule-interview`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchCandidateInterviews(userId) {
  return request(`/candidates/interviews/${userId}`);
}

export async function respondInterview(matchId, response, note = null) {
  return request(`/candidates/interviews/${matchId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ response, note }),
  });
}

export async function fetchCandidateApplications(userId) {
  return request(`/candidates/applications/${userId}`);
}

export async function updateUserProfile(userId, data) {
  return request(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ==============================================================================
// COMPANIES
// ==============================================================================
export async function fetchCompanies(params = {}) {
  const query = new URLSearchParams();
  if (params.industry && params.industry !== 'all') query.append('industry', params.industry);
  if (params.location && params.location !== 'all') query.append('location', params.location);
  if (params.search) query.append('search', params.search);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(`/companies${qs}`);
}

export async function fetchCompanyDetail(companyId) {
  return request(`/companies/${companyId}`);
}

export async function createCompany(data) {
  return request('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCompany(companyId, data) {
  return request(`/companies/${companyId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCompany(companyId) {
  return request(`/companies/${companyId}`, {
    method: 'DELETE',
  });
}

// ==============================================================================
// CV BUILDER (Tạo CV tự động cùng AI)
// ==============================================================================
export async function generateAICV(data) {
  return request('/cv-builder/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function saveGeneratedCV(data) {
  return request('/cv-builder/save', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchMyGeneratedCVs(userId) {
  const qs = userId ? `?user_id=${userId}` : '';
  return request(`/cv-builder/my-cvs${qs}`);
}

export async function fetchGeneratedCVDetail(cvId) {
  return request(`/cv-builder/${cvId}`);
}

export async function deleteGeneratedCV(cvId) {
  return request(`/cv-builder/${cvId}`, {
    method: 'DELETE',
  });
}

export async function applyGeneratedCVToJob(cvId, jdId) {
  return request(`/cv-builder/${cvId}/apply-to-job?jd_id=${jdId}`, {
    method: 'POST',
  });
}

export async function evaluateGeneratedCVMatch(cvId, jdId) {
  return request(`/cv-builder/${cvId}/evaluate-match`, {
    method: 'POST',
    body: JSON.stringify({ jd_id: Number(jdId) }),
  });
}

export async function confirmApplyGeneratedCV(cvId, payload) {
  return request(`/cv-builder/${cvId}/confirm-apply`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchEmployerNotifications() {
  return request('/employer/notifications');
}

// ==============================================================================
// JOB INQUIRIES / LIÊN HỆ CHO JD
// ==============================================================================
export async function sendJobInquiry(data) {
  return request('/inquiries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchMyInquiries(userId) {
  return request(`/inquiries/my/${userId}`);
}

export async function deleteInquiry(inquiryId) {
  return request(`/inquiries/${inquiryId}`, {
    method: 'DELETE',
  });
}

export async function fetchEmployerInquiries(params = {}) {
  const qs = new URLSearchParams();
  if (params.jd_id) qs.append('jd_id', params.jd_id);
  if (params.status && params.status !== 'all') qs.append('status', params.status);
  if (params.search) qs.append('search', params.search);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/employer/inquiries${query}`);
}

export async function fetchEmployerInquiryStats() {
  return request('/employer/inquiries/stats');
}

export async function updateInquiryStatus(inquiryId, status) {
  return request(`/inquiries/${inquiryId}/status?status=${encodeURIComponent(status)}`, {
    method: 'PATCH',
  });
}

export async function replyToInquiry(inquiryId, replyMessage) {
  return request(`/inquiries/${inquiryId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply_message: replyMessage }),
  });
}

// ==============================================================================
// AI ASSISTANT CHATBOT (LLM Nhúng)
// ==============================================================================
export async function sendAIAssistantMessage(message, history = [], userContext = {}) {
  return request('/ai-assistant/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      history,
      user_context: userContext,
    }),
  });
}




