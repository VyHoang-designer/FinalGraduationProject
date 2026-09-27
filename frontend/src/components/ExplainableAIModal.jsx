// ==============================================================================
// FILE: frontend/src/components/ExplainableAIModal.jsx
// MÔ TẢ: Modal showing WHY the AI gave that score (Radar + Feature Table)
// ==============================================================================

import RadarChartComponent from './RadarChart';

const SEVERITY_CONFIG = {
  high:   { color: '#ef4444', bg: '#fef2f2', icon: '🔴', label: 'Quan trọng' },
  medium: { color: '#f59e0b', bg: '#fffbeb', icon: '🟡', label: 'Cần chú ý' },
  low:    { color: '#3b82f6', bg: '#eff6ff', icon: '🔵', label: 'Tham khảo' },
};

const CATEGORY_ICONS = {
  skill: '⚡', experience: '📅', certification: '📜',
  project: '🚀', leadership: '👥', relevance: '🎯',
};

// Human-readable descriptions for each feature
const FEATURE_DESCRIPTIONS = {
  'Exp_Diff': {
    name: 'Chênh lệch kinh nghiệm',
    description: 'Số năm KN ứng viên trừ yêu cầu JD. Dương = vượt yêu cầu.',
    icon: '📅',
  },
  'Skill_Match_Ratio': {
    name: 'Tỷ lệ kỹ năng khớp',
    description: 'Tỷ lệ kỹ năng CV trùng với yêu cầu JD (0.0 - 1.0).',
    icon: '⚡',
  },
  'JD_Similarity_Score': {
    name: 'Tương đồng ngữ nghĩa',
    description: 'Similarity giữa CV text và JD text bằng Sentence-BERT.',
    icon: '🧠',
  },
  'Project_Similarity_Score': {
    name: 'Tương đồng dự án',
    description: 'Similarity giữa dự án CV và project keywords JD.',
    icon: '🚀',
  },
  'Has_Degree': {
    name: 'Bằng cấp',
    description: 'Ứng viên có bằng đại học/thạc sĩ/tiến sĩ.',
    icon: '🎓',
  },
  'Has_Live_Deployment': {
    name: 'Deploy thực tế',
    description: 'Ứng viên có KN triển khai hệ thống lên production.',
    icon: '🌐',
  },
  'Has_English_Cert': {
    name: 'Chứng chỉ tiếng Anh',
    description: 'Ứng viên có IELTS/TOEIC/TOEFL hay chứng chỉ quốc tế.',
    icon: '🌍',
  },
  'Has_Leadership': {
    name: 'Kinh nghiệm lãnh đạo',
    description: 'Ứng viên có KN quản lý, team lead, hoặc mentoring.',
    icon: '👑',
  },
  'Has_Award': {
    name: 'Giải thưởng',
    description: 'Ứng viên có giải thưởng, học bổng, hoặc thành tích nổi bật.',
    icon: '🏆',
  },
};

function formatValue(key, value) {
  if (key === 'Exp_Diff') {
    if (value > 0) return { text: `+${value} năm`, className: 'value--positive' };
    if (value < 0) return { text: `${value} năm`, className: 'value--negative' };
    return { text: '0 năm (đúng yêu cầu)', className: 'value--neutral' };
  }
  if (typeof value === 'number' && value <= 1 && value >= 0 && key.includes('Ratio') || key.includes('Score') || key.includes('Similarity')) {
    return { text: `${(value * 100).toFixed(1)}%`, className: value >= 0.6 ? 'value--positive' : value >= 0.3 ? 'value--neutral' : 'value--negative' };
  }
  if (value === 1) return { text: '✓ CÓ', className: 'value--positive' };
  if (value === 0) return { text: '✗ KHÔNG', className: 'value--negative' };
  return { text: String(value), className: 'value--neutral' };
}

export default function ExplainableAIModal({ result, onClose }) {
  if (!result) return null;

  const features = result.feature_details || {};
  const score = result.match_score;

  const getScoreGradient = (s) => {
    if (s >= 80) return 'linear-gradient(135deg, #10b981, #059669)';
    if (s >= 60) return 'linear-gradient(135deg, #6366f1, #4f46e5)';
    if (s >= 40) return 'linear-gradient(135deg, #f59e0b, #d97706)';
    return 'linear-gradient(135deg, #ef4444, #dc2626)';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal__header">
          <div>
            <h2 className="modal__title">🔍 Explainable AI — Phân tích chi tiết</h2>
            <p className="modal__subtitle">{result.job_title}</p>
          </div>
          <button className="modal__close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Score Hero */}
        <div className="modal__score-hero">
          <div className="modal__score-circle" style={{ background: getScoreGradient(score) }}>
            <span className="modal__score-number">{score.toFixed(1)}</span>
            <span className="modal__score-label">Score</span>
          </div>
          <div className="modal__score-info">
            <span className={`badge badge--lg ${score >= 80 ? 'badge--success' : score >= 60 ? 'badge--info' : score >= 40 ? 'badge--warning' : 'badge--danger'}`}>
              {result.match_level}
            </span>
            <p className="modal__score-explain">
              {score >= 80 ? 'Ứng viên rất phù hợp với vị trí này. Recommend phỏng vấn ngay.' :
               score >= 60 ? 'Ứng viên phù hợp. Có thể cân nhắc phỏng vấn.' :
               score >= 40 ? 'Ứng viên tương đối phù hợp. Cần đánh giá thêm.' :
               'Ứng viên chưa đáp ứng yêu cầu của vị trí này.'}
            </p>
          </div>
        </div>

        {/* Two-column layout: Radar + Table */}
        <div className="modal__content">
          {/* Radar Chart */}
          <div className="modal__chart">
            <h3 className="modal__section-title">Biểu đồ Radar — CV vs JD Threshold</h3>
            <RadarChartComponent featureDetails={features} jobTitle={result.job_title} />
          </div>

          {/* Feature Details Table */}
          <div className="modal__table-container">
            <h3 className="modal__section-title">Chi tiết từng tiêu chí AI</h3>
            <div className="feature-table">
              <div className="feature-table__header">
                <span>Tiêu chí</span>
                <span>Giá trị</span>
                <span>Mô tả</span>
              </div>
              {Object.entries(features).map(([key, value]) => {
                const meta = FEATURE_DESCRIPTIONS[key] || { name: key, description: '', icon: '📊' };
                const formatted = formatValue(key, value);
                return (
                  <div key={key} className="feature-table__row">
                    <div className="feature-table__name">
                      <span className="feature-table__icon">{meta.icon}</span>
                      <span>{meta.name}</span>
                    </div>
                    <div className={`feature-table__value ${formatted.className}`}>
                      {formatted.text}
                    </div>
                    <div className="feature-table__desc">{meta.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Custom Criteria Analysis */}
          {result.custom_criteria_results && result.custom_criteria_results.length > 0 && (
            <div className="modal__table-container" style={{ marginTop: '24px' }}>
              <h3 className="modal__section-title">✨ Tiêu chí tùy chỉnh từ HR (Hybrid Scoring)</h3>
              <div className="feature-table">
                <div className="feature-table__header" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr' }}>
                  <span>Trạng thái</span>
                  <span>Tiêu chí (Tên)</span>
                  <span>Cấp độ</span>
                  <span>Tác động điểm</span>
                </div>
                {result.custom_criteria_results.map((c, idx) => (
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
          
          {/* Gaps Analysis */}
          {result.gaps && result.gaps.length > 0 && (
            <div className="modal__table-container" style={{ marginTop: '24px' }}>
              <h3 className="modal__section-title">⚠️ Phân tích thiếu sót</h3>
              <div className="gap-list">
                {result.gaps.map((gap, i) => {
                  const config = SEVERITY_CONFIG[gap.severity] || SEVERITY_CONFIG.medium;
                  const icon = CATEGORY_ICONS[gap.category] || '📋';
                  return (
                    <div key={i} className="gap-card" style={{ borderLeftColor: config.color }}>
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
                          {gap.missing_items.map((item, j) => (
                            <span key={j} className="gap-card__missing-tag">✕ {item}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
