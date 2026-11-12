// ==============================================================================
// FILE: frontend/src/components/MatchResultCard.jsx
// MÔ TẢ: Single Job Match Card - Score bar, badge, action buttons
// ==============================================================================

export default function MatchResultCard({ result, rank, onViewDetails, onAssign }) {
  const score = result.match_score;
  const level = result.match_level;
  const isHired = result.status === 'hired';

  // Color coding based on score
  const getScoreColor = (s) => {
    if (s >= 80) return { bg: 'var(--color-success-bg)', fill: 'var(--color-success)', text: 'var(--color-success)' };
    if (s >= 60) return { bg: 'var(--color-info-bg)', fill: 'var(--color-info)', text: 'var(--color-info)' };
    if (s >= 40) return { bg: 'var(--color-warning-bg)', fill: 'var(--color-warning)', text: 'var(--color-warning)' };
    return { bg: 'var(--color-danger-bg)', fill: 'var(--color-danger)', text: 'var(--color-danger)' };
  };

  const colors = getScoreColor(score);

  const getBadgeClass = (s) => {
    if (s >= 80) return 'badge--success';
    if (s >= 60) return 'badge--info';
    if (s >= 40) return 'badge--warning';
    return 'badge--danger';
  };

  return (
    <div className="match-card">
      {/* Rank Badge */}
      <div className={`match-card__rank ${rank <= 3 ? 'match-card__rank--top' : ''}`}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
      </div>

      {/* Card Body */}
      <div className="match-card__body">
        {/* Title + Department */}
        <div className="match-card__header">
          <h3 className="match-card__title">{result.job_title}</h3>
          <div className="match-card__subtitle">
            {result.job_department && <span>{result.job_department}</span>}
            {result.job_location && <span>📍 {result.job_location}</span>}
          </div>
        </div>

        {/* Score Bar */}
        <div className="match-card__score">
          <div className="match-card__score-header">
            <span className="match-card__score-label">Match Score</span>
            <span className="match-card__score-value" style={{ color: colors.text }}>
              {score.toFixed(1)}
            </span>
          </div>
          <div className="match-card__progress" style={{ backgroundColor: colors.bg }}>
            <div
              className="match-card__progress-fill"
              style={{
                width: `${Math.min(score, 100)}%`,
                backgroundColor: colors.fill,
              }}
            />
          </div>
        </div>

        {/* Match Level Badge */}
        <div className="match-card__badges" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          {isHired && (
            <span style={{
              background: '#dcfce7',
              color: '#15803d',
              border: '1px solid #86efac',
              fontWeight: 700,
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>🎉</span> Đã tuyển
            </span>
          )}
          <span className={`badge ${getBadgeClass(score)}`}>{level}</span>
          {/* Required Skills preview */}
          {(result.job_required_skills || []).slice(0, 3).map((skill, i) => (
            <span key={i} className="badge badge--neutral">{typeof skill === 'string' ? skill : skill.skill}</span>
          ))}
          {(result.job_required_skills || []).length > 3 && (
            <span className="badge badge--neutral">+{result.job_required_skills.length - 3}</span>
          )}
        </div>

        {/* Actions */}
        <div className="match-card__actions">
          <button
            className="btn-outline"
            onClick={() => onViewDetails(result)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Chi tiết AI
          </button>
          {isHired ? (
            <button
              className="btn-hired-sm"
              onClick={() => onAssign(result)}
              title="Ứng viên đã được tuyển dụng vào vị trí này. Nhấn để xem hoặc cập nhật thông tin."
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s',
              }}
            >
              <span>✓</span> Đã tuyển
            </button>
          ) : (
            <button
              className="btn-primary-sm"
              onClick={() => onAssign(result)}
            >
              Assign vị trí này
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
