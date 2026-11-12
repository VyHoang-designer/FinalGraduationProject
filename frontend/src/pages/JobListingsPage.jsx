// ==============================================================================
// FILE: frontend/src/pages/JobListingsPage.jsx
// MÔ TẢ: Trang Tin tuyển dụng — Job cards + AI Match modal (1 JD → N CVs)
// ==============================================================================

import { useState, useEffect } from 'react';
import JobCard from '../components/JobCard';
import AIMatchModal from '../components/AIMatchModal';
import JDFormModal from '../components/JDFormModal';
import AppliedCandidatesModal from '../components/AppliedCandidatesModal';
import { fetchJobs, runMatchNTo1 } from '../services/api';

export default function JobListingsPage({ onNavigate, globalSearchTerm }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // AI Match Modal state
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState(null); // MatchNTo1Response
  const [toast, setToast] = useState(null);

  // JD Form state
  const [isJDFormOpen, setIsJDFormOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Applied Candidates Modal state
  const [selectedStageJob, setSelectedStageJob] = useState(null);
  const [selectedStageKey, setSelectedStageKey] = useState('applied');

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      setLoading(true);
      const data = await fetchJobs(false);
      setJobs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs = jobs.filter(j => {
    if (filter === 'active' && !j.is_active) return false;
    if (filter === 'closed' && j.is_active) return false;

    if (globalSearchTerm) {
      const lowerSearch = globalSearchTerm.toLowerCase();
      if (!((j.title || '').toLowerCase().includes(lowerSearch) ||
            (j.department || '').toLowerCase().includes(lowerSearch) ||
            (j.required_skills || []).some(s => (typeof s === 'string' ? s : s.skill).toLowerCase().includes(lowerSearch)) ||
            (j.location || '').toLowerCase().includes(lowerSearch))) {
        return false;
      }
    }
    
    return true;
  });

  const activeCount = jobs.filter(j => j.is_active).length;

  // ★★★ AI Match handler — 1 JD → N CVs ★★★
  async function handleAIMatch(job) {
    setMatchLoading(true);
    setMatchResult(null);
    try {
      const result = await runMatchNTo1(job.id);
      setMatchResult(result);
    } catch (err) {
      showToast(`❌ Lỗi AI Match: ${err.message}`, 'error');
    } finally {
      setMatchLoading(false);
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  if (loading) {
    return <div className="page-state"><div className="spinner" /><p>Đang tải danh sách vị trí...</p></div>;
  }

  if (error) {
    return (
      <div className="page-state page-state--error">
        <span className="page-state__icon">⚠️</span>
        <h3>Không thể kết nối Backend</h3>
        <p>{error}</p>
        <p className="page-state__hint">Hãy chạy: <code>cd backend && python api.py</code></p>
        <button className="btn btn--primary" onClick={loadJobs}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className="page-jobs">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar__left">
          <div className="filter-group">
            <label>Trạng thái:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="select-filter">
              <option value="all">Tất cả ({jobs.length})</option>
              <option value="active">Đang tuyển ({activeCount})</option>
              <option value="closed">Đã đóng ({jobs.length - activeCount})</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Sắp xếp:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select-filter">
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="name">Tên A-Z</option>
            </select>
          </div>
        </div>
        <div className="page-toolbar__right">
          <button className="btn btn--outline" onClick={loadJobs}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Làm mới
          </button>
          <button className="btn btn--primary" onClick={() => { setSelectedJob(null); setIsJDFormOpen(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Thêm vị trí
          </button>
        </div>
      </div>

      {/* Loading overlay khi tải kết quả AI */}
      {matchLoading && (
        <div className="ai-loading-banner">
          <div className="spinner spinner--sm" />
          <span>🧬 Đang tải kết quả đánh giá AI của ứng viên...</span>
        </div>
      )}

      {/* Job Cards */}
      <div className="page-jobs__list">
        {filteredJobs.length === 0 ? (
          <div className="page-state">
            <span className="page-state__icon">📋</span>
            <h3>Chưa có vị trí tuyển dụng</h3>
            <p>Thêm vị trí mới để bắt đầu tuyển dụng.</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <JobCard 
              key={job.id} 
              job={job} 
              onViewCandidates={handleAIMatch} 
              onEditJob={(j) => { setSelectedJob(j); setIsJDFormOpen(true); }}
              onSelectStage={(j, stageKey) => {
                setSelectedStageJob(j);
                setSelectedStageKey(stageKey);
              }}
            />
          ))
        )}
      </div>

      {/* ★ AI Match Modal ★ */}
      {matchResult && (
        <AIMatchModal
          jobTitle={matchResult.job_title}
          results={matchResult.results}
          processingTime={matchResult.processing_time_ms}
          totalCandidates={matchResult.total_candidates}
          onClose={() => setMatchResult(null)}
        />
      )}

      {/* ★ Applied Candidates Pipeline Modal ★ */}
      {selectedStageJob && (
        <AppliedCandidatesModal
          job={selectedStageJob}
          initialStage={selectedStageKey}
          onClose={() => {
            setSelectedStageJob(null);
            loadJobs();
          }}
          onStatusChanged={loadJobs}
        />
      )}

      {/* JD Form Modal */}
      {isJDFormOpen && (
        <JDFormModal 
          job={selectedJob} 
          onClose={() => { setIsJDFormOpen(false); setSelectedJob(null); }} 
          onRefresh={loadJobs} 
        />
      )}

      {/* Toast */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
