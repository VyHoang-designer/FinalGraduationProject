// ==============================================================================
// FILE: frontend/src/services/api.js
// MÔ TẢ: API Service Layer - Giao tiếp với FastAPI Backend
// ==============================================================================

const API_BASE = 'http://localhost:8000/api';

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

// ==============================================================================
// CANDIDATES
// ==============================================================================
export async function fetchCandidates() {
  return request('/candidates');
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

