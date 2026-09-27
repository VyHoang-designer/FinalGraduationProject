// ==============================================================================
// FILE: frontend/src/pages/CandidatesPage.jsx
// MÔ TẢ: Trang Ứng viên — Danh sách + bảng ứng viên
// ==============================================================================

import { useState, useEffect } from 'react';
import { fetchCandidates } from '../services/api';

export default function CandidatesPage({ onNavigate }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCandidates();
  }, []);

  async function loadCandidates() {
    try {
      setLoading(true);
      const data = await fetchCandidates();
      setCandidates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = candidates.filter(c =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleViewCandidate(id) {
    onNavigate('candidate-detail', { candidateId: id });
  }

  if (loading) {
    return (
      <div className="page-state">
        <div className="spinner" />
        <p>Đang tải danh sách ứng viên...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-state page-state--error">
        <span className="page-state__icon">⚠️</span>
        <h3>Lỗi kết nối</h3>
        <p>{error}</p>
        <button className="btn btn--primary" onClick={loadCandidates}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className="page-candidates">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar__left">
          <div className="toolbar-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm ứng viên theo tên, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="toolbar-count">{filtered.length} ứng viên</span>
        </div>
        <div className="page-toolbar__right">
          <button className="btn btn--primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Thêm ứng viên
          </button>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="candidates-table-wrapper">
        <table className="candidates-table">
          <thead>
            <tr>
              <th>Ứng viên</th>
              <th>Email</th>
              <th>Kinh nghiệm</th>
              <th>Kỹ năng</th>
              <th>Học vấn</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const initials = c.full_name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();
              return (
                <tr key={c.id} onClick={() => handleViewCandidate(c.id)} className="candidates-table__row">
                  <td>
                    <div className="candidate-cell">
                      <div className="candidate-cell__avatar">{initials}</div>
                      <div>
                        <div className="candidate-cell__name">{c.full_name}</div>
                        {c.phone && <div className="candidate-cell__phone">{c.phone}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="text-secondary">{c.email || '—'}</td>
                  <td>
                    <span className="experience-tag">{c.experience_years} năm</span>
                  </td>
                  <td>
                    <div className="skills-cell">
                      {(c.parsed_skills || []).slice(0, 3).map((s, i) => (
                        <span key={i} className="skill-mini">{s}</span>
                      ))}
                      {(c.parsed_skills || []).length > 3 && (
                        <span className="skill-mini skill-mini--more">
                          +{c.parsed_skills.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-secondary">{c.education || '—'}</td>
                  <td>
                    <div className="action-cell">
                      <button
                        className="btn btn--sm btn--primary"
                        onClick={(e) => { e.stopPropagation(); handleViewCandidate(c.id); }}
                      >
                        🪄 Phân tích AI
                      </button>
                      <button
                        className="btn btn--sm btn--ghost"
                        onClick={(e) => { e.stopPropagation(); handleViewCandidate(c.id); }}
                      >
                        Xem hồ sơ
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
