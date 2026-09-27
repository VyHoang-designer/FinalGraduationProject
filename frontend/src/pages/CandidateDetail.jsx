// ==============================================================================
// FILE: frontend/src/pages/CandidateDetail.jsx
// MÔ TẢ: Chi tiết ứng viên — CV panel + AI 1-N Matching
// ==============================================================================

import { useState, useEffect } from 'react';
import HRCandidateHeader from '../components/HRCandidateHeader';
import CVDetailPanel from '../components/CVDetailPanel';
import MatchResultsList from '../components/MatchResultsList';
import ExplainableAIModal from '../components/ExplainableAIModal';
import { fetchCandidate, runMatch1ToN, fetchMatchResults } from '../services/api';

export default function CandidateDetail({ candidateId, onNavigate }) {
  const [candidate, setCandidate] = useState(null);
  const [matchResults, setMatchResults] = useState([]);
  const [processingTime, setProcessingTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [error, setError] = useState(null);
  const [modalResult, setModalResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (candidateId) loadData(candidateId);
  }, [candidateId]);

  async function loadData(id) {
    try {
      setIsLoadingPage(true);
      const [cData, mResults] = await Promise.all([
        fetchCandidate(id),
        fetchMatchResults(id).catch(() => []),
      ]);
      setCandidate(cData);
      setMatchResults(mResults);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingPage(false);
    }
  }

  async function handleRunAI() {
    if (!candidateId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await runMatch1ToN(candidateId);
      setMatchResults(result.results);
      setProcessingTime(result.processing_time_ms);
      showToast(`✅ Đã phân tích ${result.total_jobs_matched} vị trí trong ${(result.processing_time_ms / 1000).toFixed(1)}s`);
    } catch (err) {
      setError(err.message);
      showToast(`❌ ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  if (isLoadingPage) {
    return <div className="page-state"><div className="spinner" /><p>Đang tải hồ sơ...</p></div>;
  }

  if (!candidate) {
    return (
      <div className="page-state page-state--error">
        <span className="page-state__icon">⚠️</span>
        <h3>Không tìm thấy ứng viên</h3>
        <button className="btn btn--primary" onClick={() => onNavigate('candidates')}>← Quay lại</button>
      </div>
    );
  }

  return (
    <div className="page-detail">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button className="breadcrumb__link" onClick={() => onNavigate('candidates')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Ứng viên
        </button>
        <span className="breadcrumb__sep">/</span>
        <span className="breadcrumb__current">{candidate.full_name}</span>
      </div>

      {/* Header */}
      <HRCandidateHeader candidate={candidate} onRunAI={handleRunAI} isLoading={isLoading} />

      {/* Error */}
      {error && (
        <div className="alert alert--error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Two columns */}
      <div className="page-detail__grid">
        <div className="page-detail__left">
          <CVDetailPanel candidate={candidate} />
        </div>
        <div className="page-detail__right">
          <MatchResultsList
            results={matchResults}
            processingTime={processingTime}
            onViewDetails={(r) => setModalResult(r)}
            onAssign={(r) => showToast(`🎉 Đã assign vào "${r.job_title}"`)}
          />
        </div>
      </div>

      {/* XAI Modal */}
      {modalResult && (
        <ExplainableAIModal result={modalResult} onClose={() => setModalResult(null)} />
      )}

      {/* Toast */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
