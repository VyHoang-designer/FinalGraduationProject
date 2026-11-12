// ==============================================================================
// FILE: frontend/src/components/AIMatchModal.jsx
// MÔ TẢ: Modal hiển thị kết quả AI Match: 1 JD → N CVs
//         - CV #1 (best): hiện badge "Phù hợp nhất"
//         - CV #2+: hiện gap analysis (thiếu sót)
// ==============================================================================

import { useState } from 'react';
import { getAvatarUrl } from '../services/api';

const SEVERITY_CONFIG = {
  high:   { color: '#ef4444', bg: '#fef2f2', icon: '🔴', label: 'Quan trọng' },
  medium: { color: '#f59e0b', bg: '#fffbeb', icon: '🟡', label: 'Cần chú ý' },
  low:    { color: '#3b82f6', bg: '#eff6ff', icon: '🔵', label: 'Tham khảo' },
};

const CATEGORY_ICONS = {
  skill: '⚡', experience: '📅', certification: '📜',
  project: '🚀', leadership: '👥', relevance: '🎯',
};

function ScoreBar({ score, size = 'md' }) {
  let color;
  if (score >= 80) color = '#10b981';
  else if (score >= 60) color = '#3b82f6';
  else if (score >= 40) color = '#f59e0b';
  else color = '#ef4444';

  const height = size === 'lg' ? 8 : 5;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height, borderRadius: height / 2,
        background: '#f3f4f6', overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(score, 100)}%`, height: '100%',
          borderRadius: height / 2, background: color,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{
        fontWeight: 800, fontSize: size === 'lg' ? '1.1rem' : '0.85rem',
        fontFamily: "'JetBrains Mono', monospace", color,
        minWidth: 48, textAlign: 'right',
      }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function GapCard({ gap }) {
  const config = SEVERITY_CONFIG[gap.severity] || SEVERITY_CONFIG.medium;
  const icon = CATEGORY_ICONS[gap.category] || '📋';

  return (
    <div className="gap-card" style={{ borderLeftColor: config.color }}>
      <div className="gap-card__header">
        <span className="gap-card__icon">{icon}</span>
        <span className="gap-card__title">{gap.title}</span>
        <span className="gap-card__severity" style={{ background: config.bg, color: config.color }}>
          {config.icon} {config.label}
        </span>
      </div>
      <p className="gap-card__message">{gap.message}</p>
      {gap.missing_items && gap.missing_items.length > 0 && (
        <div className="gap-card__items">
          {gap.missing_items.map((item, i) => (
            <span key={i} className="gap-card__missing-tag">✕ {item}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateRow({ result, isExpanded, onToggle, onViewDetail }) {
  const { rank, candidate_name, email, avatar_url, experience_years, parsed_skills,
    match_score, match_level, is_best_match, gaps, feature_details, custom_criteria_results, skill_details } = result;

  const rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  const initials = candidate_name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();

  // Level badge color
  let levelClass = 'badge--neutral';
  if (match_level === 'Rất phù hợp') levelClass = 'badge--success';
  else if (match_level === 'Phù hợp') levelClass = 'badge--info';
  else if (match_level === 'Tương đối') levelClass = 'badge--warning';
  else if (match_level === 'Chưa phù hợp') levelClass = 'badge--danger';

  return (
    <div className={`match-cv-card ${is_best_match ? 'match-cv-card--best' : ''} ${isExpanded ? 'match-cv-card--expanded' : ''}`}>
      {/* Main Row */}
      <div className="match-cv-card__row" onClick={onToggle}>
        <div className="match-cv-card__rank">{rankDisplay}</div>

        <div className="match-cv-card__avatar" style={{ overflow: 'hidden' }}>
          {avatar_url ? (
            <img 
              src={getAvatarUrl(avatar_url)} 
              alt={candidate_name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            initials
          )}
        </div>

        <div className="match-cv-card__info">
          <div className="match-cv-card__name">
            {candidate_name}
            {is_best_match && <span className="best-match-badge">★ Phù hợp nhất</span>}
          </div>
          <div className="match-cv-card__meta">
            {email && <span>✉ {email}</span>}
            <span>📅 {experience_years} năm KN</span>
            <span>⚡ {(parsed_skills || []).length} skills</span>
          </div>
        </div>

        <div className="match-cv-card__score-area">
          <div style={{ width: 180 }}>
            <ScoreBar score={match_score} size="lg" />
          </div>
          <span className={`badge ${levelClass}`}>{match_level}</span>
        </div>

        <div className="match-cv-card__toggle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isExpanded
              ? <polyline points="18 15 12 9 6 15"/>
              : <polyline points="6 9 12 15 18 9"/>
            }
          </svg>
        </div>
      </div>

      {/* Expanded Detail */}
      {isExpanded && (
        <div className="match-cv-card__detail">
          {/* Skills */}
          <div className="match-cv-card__detail-section">
            <h4>Kỹ năng ứng viên</h4>
            <div className="match-cv-card__skills">
              {(parsed_skills || []).map((s, i) => (
                <span key={i} className="skill-mini">{s}</span>
              ))}
            </div>
          </div>

          {/* LLM Skill Assessment */}
          {skill_details && skill_details.length > 0 && (
            <div className="match-cv-card__detail-section">
              <h4>🤖 Đánh giá Kỹ năng AI (Gemini)</h4>
              <div className="feature-table">
                <div className="feature-table__header" style={{ gridTemplateColumns: '1.5fr 1fr 3fr' }}>
                  <span>Kỹ năng</span>
                  <span>Mức độ (m)</span>
                  <span>Lý do & Bằng chứng</span>
                </div>
                {skill_details.map((info, idx) => (
                  <div key={idx} className="feature-table__row" style={{ gridTemplateColumns: '1.5fr 1fr 3fr', alignItems: 'start' }}>
                    <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {info.skill}
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>Weight: {info.weight}</div>
                    </div>
                    <div>
                      <span className={`badge ${info.m >= 0.75 ? 'badge--success' : info.m >= 0.5 ? 'badge--info' : info.m > 0 ? 'badge--warning' : 'badge--danger'}`}>
                        Mức {info.m * 4} (m={info.m})
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>
                      <div style={{ marginBottom: '4px' }}><strong>Lý do:</strong> {info.reason}</div>
                      {info.evidence && info.evidence.length > 0 && (
                        <div style={{ fontStyle: 'italic', color: '#64748b', fontSize: '12px', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>
                          <strong>Trích dẫn:</strong> "{info.evidence[0].quote}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature Scores */}
          <div className="match-cv-card__detail-section">
            <h4>Chi tiết đánh giá AI</h4>
            <div className="match-cv-card__features">
              {Object.entries(feature_details || {}).map(([key, val]) => (
                <div key={key} className="feature-item">
                  <span className="feature-item__name">{key.replace(/_/g, ' ')}</span>
                  <span className={`feature-item__value ${
                    typeof val === 'number' && val >= 0.7 ? 'value--positive' :
                    typeof val === 'number' && val <= 0.3 ? 'value--negative' : 'value--neutral'
                  }`}>
                    {typeof val === 'number' ? val.toFixed(2) : val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Criteria Analysis */}
          {custom_criteria_results && custom_criteria_results.length > 0 && (
            <div className="match-cv-card__detail-section">
              <h4>✨ Tiêu chí tùy chỉnh từ HR (Hybrid Scoring)</h4>
              <div className="feature-table">
                <div className="feature-table__header" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr' }}>
                  <span>Trạng thái</span>
                  <span>Tiêu chí (Tên)</span>
                  <span>Cấp độ</span>
                  <span>Tác động điểm</span>
                </div>
                {custom_criteria_results.map((c, idx) => (
                  <div key={idx} className="feature-table__row" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr' }}>
                    <div className="feature-table__name">
                      {c.met ? <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ ĐẠT</span> : <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✕ THIẾU</span>}
                    </div>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div style={{ textTransform: 'uppercase', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                      {c.level === 'nice' ? 'Ưu tiên' : c.level === 'should' ? 'Rất cần' : c.level === 'must' ? 'Bắt buộc' : 'Thiết yếu'}
                    </div>
                    <div className={`feature-table__value ${c.score_impact >= 0 ? 'value--positive' : 'value--negative'}`}>
                      {c.score_impact > 0 ? `+${c.score_impact}đ` : c.score_impact === 0 ? `0đ` : `${c.score_impact}đ`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gap Analysis (only for rank 2+) */}
          {!is_best_match && gaps && gaps.length > 0 && (
            <div className="match-cv-card__detail-section match-cv-card__gaps">
              <h4>
                <span>⚠️ Thiếu sót so với yêu cầu</span>
                <span className="gap-count">{gaps.length} vấn đề</span>
              </h4>
              <div className="gap-list">
                {gaps.map((gap, i) => (
                  <GapCard key={i} gap={gap} />
                ))}
              </div>
            </div>
          )}

          {is_best_match && (
            <div className="match-cv-card__best-note">
              ✅ Ứng viên này phù hợp nhất với yêu cầu vị trí. Không có thiếu sót đáng kể.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIMatchModal({ jobTitle, results, processingTime, totalCandidates, onClose }) {
  const [expandedId, setExpandedId] = useState(null);

  // Auto-expand the best match
  const toggleExpand = (cvId) => {
    setExpandedId(expandedId === cvId ? null : cvId);
  };

  const bestScore = results.length > 0 ? results[0].match_score : 0;
  const goodCount = results.filter(r => r.match_score >= 60).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal__header">
          <div>
            <div className="modal__title">🧬 Kết quả AI Match</div>
            <div className="modal__subtitle">{jobTitle}</div>
          </div>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Stats Bar */}
        <div className="ai-modal-stats">
          <div className="ai-modal-stat">
            <span className="ai-modal-stat__value">{totalCandidates}</span>
            <span className="ai-modal-stat__label">Ứng viên</span>
          </div>
          <div className="ai-modal-stat ai-modal-stat--highlight">
            <span className="ai-modal-stat__value">{goodCount}</span>
            <span className="ai-modal-stat__label">Phù hợp (≥60)</span>
          </div>
          <div className="ai-modal-stat">
            <span className="ai-modal-stat__value">{bestScore.toFixed(1)}</span>
            <span className="ai-modal-stat__label">Điểm cao nhất</span>
          </div>
          <div className="ai-modal-stat">
            <span className="ai-modal-stat__value">{(processingTime / 1000).toFixed(1)}s</span>
            <span className="ai-modal-stat__label">Thời gian xử lý</span>
          </div>
        </div>

        {/* Candidate List */}
        <div className="ai-modal-list">
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
              <h4 style={{ margin: '0 0 6px', color: '#1e293b', fontSize: '1.1rem', fontWeight: 700 }}>
                Chưa có ứng viên nào nộp hồ sơ
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>
                Vị trí tuyển dụng này hiện chưa có ứng viên nộp hồ sơ. Các ứng viên sau khi nộp và được đánh giá qua AI sẽ tự động hiển thị tại đây.
              </p>
            </div>
          ) : (
            results.map((result) => (
              <CandidateRow
                key={result.cv_id}
                result={result}
                isExpanded={expandedId === result.cv_id}
                onToggle={() => toggleExpand(result.cv_id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
