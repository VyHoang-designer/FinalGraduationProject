// ==============================================================================
// FILE: frontend/src/components/CVDetailPanel.jsx
// MÔ TẢ: Left Panel (60%) - CV parsed details (Experience, Skills, Projects)
// ==============================================================================

export default function CVDetailPanel({ candidate }) {
  return (
    <div className="cv-panel">
      <h2 className="cv-panel__title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Hồ sơ ứng viên
      </h2>

      {/* Education */}
      {candidate.education && (
        <div className="cv-panel__section">
          <h3 className="cv-panel__section-title">
            <span className="cv-panel__section-icon">🎓</span>
            Học vấn
          </h3>
          <p className="cv-panel__text">{candidate.education}</p>
        </div>
      )}

      {/* Experience Timeline */}
      <div className="cv-panel__section">
        <h3 className="cv-panel__section-title">
          <span className="cv-panel__section-icon">💼</span>
          Kinh nghiệm
        </h3>
        <div className="cv-panel__experience">
          <div className="experience-badge">
            <span className="experience-badge__number">{candidate.experience_years}</span>
            <span className="experience-badge__label">Năm</span>
          </div>
          <div className="experience-bar">
            <div
              className="experience-bar__fill"
              style={{ width: `${Math.min((candidate.experience_years / 10) * 100, 100)}%` }}
            />
            <div className="experience-bar__labels">
              <span>Junior</span>
              <span>Mid</span>
              <span>Senior</span>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Skills */}
      <div className="cv-panel__section">
        <h3 className="cv-panel__section-title">
          <span className="cv-panel__section-icon">⚡</span>
          Kỹ năng kỹ thuật
        </h3>
        <div className="cv-panel__skills-grid">
          {(candidate.parsed_skills || []).map((skill, i) => (
            <div key={i} className="skill-chip">
              <span className="skill-chip__dot" />
              {skill}
            </div>
          ))}
        </div>
      </div>

      {/* Projects */}
      {(candidate.project_descriptions || []).length > 0 && (
        <div className="cv-panel__section">
          <h3 className="cv-panel__section-title">
            <span className="cv-panel__section-icon">🚀</span>
            Dự án thực tế
          </h3>
          <div className="cv-panel__projects">
            {candidate.project_descriptions.map((project, i) => (
              <div key={i} className="project-card">
                <span className="project-card__number">{String(i + 1).padStart(2, '0')}</span>
                <p className="project-card__text">{project}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw CV Text (Collapsible) */}
      <details className="cv-panel__raw">
        <summary className="cv-panel__raw-toggle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          Xem CV gốc (plain text)
        </summary>
        <pre className="cv-panel__raw-text">{candidate.cv_text}</pre>
      </details>
    </div>
  );
}
