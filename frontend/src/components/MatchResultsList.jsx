// ==============================================================================
// FILE: frontend/src/components/MatchResultsList.jsx
// MÔ TẢ: Right Panel (40%) - Ranked list of Job Match Cards
// ==============================================================================

import MatchResultCard from './MatchResultCard';

export default function MatchResultsList({ results, processingTime, onViewDetails, onAssign }) {
  if (!results || results.length === 0) {
    return (
      <div className="match-list">
        <div className="match-list__header">
          <h2 className="match-list__title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>
            AI Job Routing
          </h2>
        </div>
        <div className="match-list__empty">
          <div className="match-list__empty-icon">🎯</div>
          <h3>Chưa có kết quả phân tích</h3>
          <p>Nhấn nút <strong>"🪄 Phân tích AI 1-N"</strong> để hệ thống tự động đánh giá CV với tất cả vị trí đang tuyển.</p>
        </div>
      </div>
    );
  }

  const bestScore = results[0]?.match_score || 0;

  return (
    <div className="match-list">
      {/* Header with stats */}
      <div className="match-list__header">
        <h2 className="match-list__title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>
          AI Job Routing
        </h2>
        <div className="match-list__stats">
          <div className="stat-chip">
            <span className="stat-chip__value">{results.length}</span>
            <span className="stat-chip__label">vị trí</span>
          </div>
          <div className="stat-chip stat-chip--highlight">
            <span className="stat-chip__value">{bestScore.toFixed(1)}</span>
            <span className="stat-chip__label">top score</span>
          </div>
          {processingTime && (
            <div className="stat-chip">
              <span className="stat-chip__value">{(processingTime / 1000).toFixed(1)}s</span>
              <span className="stat-chip__label">thời gian</span>
            </div>
          )}
        </div>
      </div>

      {/* Ranked Cards */}
      <div className="match-list__cards">
        {results.map((result, idx) => (
          <MatchResultCard
            key={result.id}
            result={result}
            rank={idx + 1}
            onViewDetails={onViewDetails}
            onAssign={onAssign}
          />
        ))}
      </div>
    </div>
  );
}
