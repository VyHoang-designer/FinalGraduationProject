// ==============================================================================
// FILE: frontend/src/components/JobCard.jsx
// MÔ TẢ: Job listing card với pipeline stages (Ứng tuyển → Đã tuyển)
// ==============================================================================

const PIPELINE_STAGES = [
  { key: 'applied', label: 'Ứng tuyển', color: '#6366f1' },
  { key: 'screening', label: 'Sàng lọc', color: '#f59e0b' },
  { key: 'interview', label: 'Phỏng vấn', color: '#3b82f6' },
  { key: 'offer', label: 'Offer', color: '#8b5cf6' },
  { key: 'hired', label: 'Đã tuyển', color: '#10b981' },
];

export default function JobCard({ job, matchCounts, onViewCandidates, onEditJob, onSelectStage }) {
  // Pipeline counts from backend database aggregation
  const counts = matchCounts || job.pipeline_counts || {
    applied: 0, screening: 0, interview: 0, offer: 0, hired: 0
  };
  const totalCandidates = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="job-card">
      {/* Header Row */}
      <div className="job-card__header">
        <div className="job-card__checkbox">
          <input type="checkbox" />
        </div>
        <div className="job-card__info">
          <div className="job-card__title-row">
            <h3 className="job-card__title" style={{ cursor: 'pointer', color: '#3b82f6' }} onClick={() => onEditJob(job)} title="Nhấn để xem chi tiết / sửa">
              {job.title}
            </h3>
            <span className={`job-card__status ${job.is_active ? 'job-card__status--active' : 'job-card__status--closed'}`}>
              {job.is_active ? 'Đang tuyển' : 'Đã đóng'}
            </span>
          </div>
          <div className="job-card__meta">
            {job.department && <span>{job.department}</span>}
            {job.location && <span>📍 {job.location}</span>}
            <span>Cần tuyển: {job.required_experience > 0 ? `${job.required_experience}+ năm KN` : 'Không yêu cầu'}</span>
            {job.required_skills && job.required_skills.length > 0 && (
              <span className="job-card__skills-preview">
                {job.required_skills.slice(0, 3).map(s => typeof s === 'string' ? s : s.skill).join(', ')}
                {job.required_skills.length > 3 && ` +${job.required_skills.length - 3}`}
              </span>
            )}
          </div>
        </div>
        <div className="job-card__actions">
          <button
            className="job-card__action-btn job-card__action-btn--primary"
            onClick={() => onViewCandidates(job)}
            title="Xem ứng viên phù hợp"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            AI Match
          </button>
          <button className="job-card__action-btn" title="Xem thêm / Sửa" onClick={() => onEditJob(job)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="job-card__pipeline">
        {PIPELINE_STAGES.map((stage) => {
          const count = counts[stage.key] || 0;
          return (
            <div 
              key={stage.key} 
              className={`pipeline-stage ${count > 0 ? 'pipeline-stage--clickable' : ''}`}
              onClick={() => onSelectStage && onSelectStage(job, stage.key)}
              title={`Nhấn để xem ứng viên ở bước: ${stage.label} (${count})`}
            >
              <div className="pipeline-stage__count" style={{ color: stage.color }}>
                {count}
              </div>
              <div className="pipeline-stage__label">{stage.label}</div>
              <div className="pipeline-stage__bar">
                <div
                  className="pipeline-stage__bar-fill"
                  style={{
                    width: totalCandidates > 0
                      ? `${(count / totalCandidates) * 100}%`
                      : '0%',
                    backgroundColor: stage.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
