// ==============================================================================
// FILE: frontend/src/components/AppliedCandidatesModal.jsx
// MÔ TẢ: Modal hiển thị danh sách các ứng viên đã nộp hồ sơ vào Job tuyển dụng
//         - Cho phép lọc theo giai đoạn tuyển dụng (Ứng tuyển, Sàng lọc, Phỏng vấn, Offer, Đã tuyển)
//         - Xem điểm phù hợp AI, kỹ năng, và đánh giá chi tiết LLM Gemini đã lưu
//         - Cho phép HR cập nhật trạng thái tuyển dụng của ứng viên
// ==============================================================================

import { useState, useEffect } from 'react';
import { fetchJobCandidates, updateCandidateStatus, getAvatarUrl } from '../services/api';
import ScheduleInterviewModal from './ScheduleInterviewModal';

const PIPELINE_STAGES = [
  { key: 'all', label: 'Tất cả', color: '#64748b' },
  { key: 'applied', label: 'Ứng tuyển', color: '#6366f1' },
  { key: 'screening', label: 'Sàng lọc', color: '#f59e0b' },
  { key: 'interview', label: 'Phỏng vấn', color: '#3b82f6' },
  { key: 'offer', label: 'Offer', color: '#8b5cf6' },
  { key: 'hired', label: 'Đã tuyển', color: '#10b981' },
];

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${timeStr} ngày ${dateStr}`;
  } catch {
    return isoString;
  }
}

export default function AppliedCandidatesModal({ job, initialStage = 'applied', onClose, onStatusChanged }) {
  const [activeStage, setActiveStage] = useState(initialStage || 'all');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCvId, setExpandedCvId] = useState(null);
  const [updatingCvId, setUpdatingCvId] = useState(null);
  const [schedulingCandidate, setSchedulingCandidate] = useState(null);

  useEffect(() => {
    loadCandidates();
  }, [job.id]);

  async function loadCandidates() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJobCandidates(job.id);
      setCandidates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(cvId, newStatus) {
    setUpdatingCvId(cvId);
    try {
      await updateCandidateStatus(job.id, cvId, newStatus);
      // Cập nhật local state
      setCandidates(prev => prev.map(c => c.cv_id === cvId ? { ...c, status: newStatus } : c));
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      alert('Lỗi cập nhật trạng thái: ' + err.message);
    } finally {
      setUpdatingCvId(null);
    }
  }

  // Đếm số lượng ứng viên theo từng stage
  const stageCounts = {
    all: candidates.length,
    applied: candidates.filter(c => c.status === 'applied' || !c.status).length,
    screening: candidates.filter(c => c.status === 'screening').length,
    interview: candidates.filter(c => c.status === 'interview').length,
    offer: candidates.filter(c => c.status === 'offer').length,
    hired: candidates.filter(c => c.status === 'hired').length,
  };

  const filteredCandidates = activeStage === 'all'
    ? candidates
    : candidates.filter(c => (c.status || 'applied') === activeStage);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '960px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', position: 'relative' }}>
          <button className="modal-close" onClick={onClose} style={{ top: '20px', right: '20px' }}>✕</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.6rem' }}>👥</span>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#1e293b' }}>
              Hồ sơ Ứng viên Đã Nộp — {job.title}
            </h2>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#64748b', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>🏢 {job.department || 'APEX IT'}</span>
            <span>📍 {job.location || 'Hồ Chí Minh'}</span>
            <span>🎯 Tổng số: <strong>{candidates.length}</strong> ứng viên đã nộp hồ sơ</span>
          </div>

          {/* PIPELINE TABS */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '18px', overflowX: 'auto', paddingBottom: '4px' }}>
            {PIPELINE_STAGES.map(stage => {
              const count = stageCounts[stage.key] || 0;
              const isActive = activeStage === stage.key;
              return (
                <button
                  key={stage.key}
                  onClick={() => setActiveStage(stage.key)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '20px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isActive ? stage.color : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    borderColor: isActive ? stage.color : '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{stage.label}</span>
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: isActive ? '#ffffff' : stage.color,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f1f5f9' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <span className="spinner" style={{ marginBottom: '12px' }} />
              <div>Đang tải danh sách hồ sơ ứng viên...</div>
            </div>
          )}

          {error && (
            <div className="alert alert--error" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {!loading && filteredCandidates.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
              <h3 style={{ margin: '0 0 6px', color: '#334155' }}>Chưa có ứng viên nào</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                Không tìm thấy hồ sơ nào trong trạng thái "<strong>{PIPELINE_STAGES.find(s => s.key === activeStage)?.label}</strong>".
              </p>
            </div>
          )}

          {!loading && filteredCandidates.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredCandidates.map((c) => {
                const initials = (c.full_name || 'CV')
                  .split(' ')
                  .map(w => w[0])
                  .join('')
                  .slice(-2)
                  .toUpperCase();
                const isExpanded = expandedCvId === c.cv_id;
                const matchScore = Math.round(c.match_score || 0);

                let levelBadgeClass = 'badge--warning';
                if (matchScore >= 80) levelBadgeClass = 'badge--success';
                else if (matchScore >= 60) levelBadgeClass = 'badge--info';
                else if (matchScore < 40) levelBadgeClass = 'badge--danger';

                return (
                  <div 
                    key={c.cv_id} 
                    style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* CANDIDATE HEADER ROW */}
                    <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Avatar */}
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                          boxShadow: '0 3px 8px rgba(99,102,241,0.3)',
                        }}>
                          {c.avatar_url ? (
                            <img 
                              src={getAvatarUrl(c.avatar_url)} 
                              alt={c.full_name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            initials
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                              {c.full_name}
                            </h4>
                            <span className={`badge ${levelBadgeClass}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
                              {c.match_level || (matchScore >= 70 ? 'Phù hợp' : 'Tương đối')}
                            </span>
                            {c.interview_info && (
                              <span 
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: c.interview_info.candidate_response === 'confirmed' 
                                    ? '#dcfce7' 
                                    : c.interview_info.candidate_response === 'declined' 
                                    ? '#fee2e2' 
                                    : '#fef3c7',
                                  color: c.interview_info.candidate_response === 'confirmed' 
                                    ? '#15803d' 
                                    : c.interview_info.candidate_response === 'declined' 
                                    ? '#b91c1c' 
                                    : '#b45309',
                                  border: `1px solid ${c.interview_info.candidate_response === 'confirmed' ? '#86efac' : c.interview_info.candidate_response === 'declined' ? '#fca5a5' : '#fde68a'}`
                                }}
                                title={c.interview_info.candidate_note ? `Ghi chú UV: ${c.interview_info.candidate_note}` : ''}
                              >
                                {c.interview_info.candidate_response === 'confirmed' && '✓ UV đã xác nhận đi PV'}
                                {c.interview_info.candidate_response === 'declined' && '✕ UV từ chối đi PV'}
                                {!c.interview_info.candidate_response && '⏳ Đã mời PV (Chờ UV xác nhận)'}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.84rem', color: '#64748b', display: 'flex', gap: '14px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {c.email && <span>✉️ {c.email}</span>}
                            {c.phone && <span>📞 {c.phone}</span>}
                            <span>📅 {c.experience_years} năm KN</span>
                            {c.education && <span>🎓 {c.education}</span>}
                            <span>🕒 Nộp lúc: {formatDate(c.applied_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT SIDE: SCORE + STAGE SELECTOR + EXPAND BTN */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
                        {/* Score Circle / Badge */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: matchScore >= 70 ? '#10b981' : matchScore >= 50 ? '#3b82f6' : '#f59e0b', fontFamily: "'JetBrains Mono', monospace" }}>
                            {matchScore}%
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                            Độ khớp AI
                          </div>
                        </div>

                        {/* Pipeline Stage Select */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Giai đoạn:</label>
                          <select
                            value={c.status || 'applied'}
                            onChange={(e) => handleStatusChange(c.cv_id, e.target.value)}
                            disabled={updatingCvId === c.cv_id}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              background: '#f8fafc',
                              color: '#1e293b',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="applied">Ứng tuyển</option>
                            <option value="screening">Sàng lọc</option>
                            <option value="interview">Phỏng vấn</option>
                            <option value="offer">Offer</option>
                            <option value="hired">Đã tuyển</option>
                          </select>
                        </div>

                        {/* Nút Mời / Lịch phỏng vấn */}
                        <button
                          className="btn btn--outline"
                          onClick={() => setSchedulingCandidate(c)}
                          style={{
                            padding: '7px 12px',
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: c.interview_info ? '#2563eb' : '#475569',
                            borderColor: c.interview_info ? '#93c5fd' : '#cbd5e1',
                            background: c.interview_info ? '#eff6ff' : '#ffffff',
                            fontWeight: 600,
                          }}
                          title="Thiết lập ngày giờ, địa điểm và quy định phỏng vấn"
                        >
                          <span>📅</span>
                          <span>{c.interview_info ? 'Lịch phỏng vấn' : 'Mời phỏng vấn'}</span>
                        </button>

                        {/* View AI details button */}
                        <button
                          className="btn btn--outline"
                          onClick={() => setExpandedCvId(isExpanded ? null : c.cv_id)}
                          style={{
                            padding: '7px 12px',
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>{isExpanded ? 'Thu gọn' : 'Chi tiết AI'}</span>
                          <span>{isExpanded ? '▲' : '▼'}</span>
                        </button>
                      </div>
                    </div>

                    {/* SKILLS TAGS */}
                    {c.parsed_skills && c.parsed_skills.length > 0 && (
                      <div style={{ padding: '0 20px 14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {c.parsed_skills.slice(0, 8).map((sk, idx) => (
                          <span key={idx} className="candidate-tag" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            {typeof sk === 'string' ? sk : sk.skill}
                          </span>
                        ))}
                        {c.parsed_skills.length > 8 && (
                          <span className="candidate-tag candidate-tag--more" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            +{c.parsed_skills.length - 8}
                          </span>
                        )}
                      </div>
                    )}

                    {/* EXPANDED AI DETAILS ACCORDION */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '20px' }}>
                        {/* 🤖 Đánh giá Chuyên sâu Kỹ năng từ LLM (Gemini) */}
                        {c.skill_details && c.skill_details.length > 0 ? (
                          <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                              <span>🤖</span> Đánh giá Kỹ năng AI (Gemini LLM đã lưu trong DB)
                            </div>
                            <div className="feature-table">
                              <div className="feature-table__header" style={{ gridTemplateColumns: '1.4fr 1fr 3fr' }}>
                                <span>Kỹ năng & Trọng số</span>
                                <span>Mức độ (m)</span>
                                <span>Lý do & Bằng chứng từ CV</span>
                              </div>
                              {c.skill_details.map((info, idx) => (
                                <div key={idx} className="feature-table__row" style={{ gridTemplateColumns: '1.4fr 1fr 3fr', alignItems: 'start', padding: '10px 12px' }}>
                                  <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                                    {info.skill}
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal', marginTop: '2px' }}>
                                      Trọng số: {info.weight === 3 ? 'Cốt lõi (x3)' : info.weight === 2 ? 'Bổ trợ (x2)' : 'Ưu tiên (x1)'}
                                    </div>
                                  </div>
                                  <div>
                                    <span className={`badge ${info.m >= 0.75 ? 'badge--success' : info.m >= 0.5 ? 'badge--info' : info.m > 0 ? 'badge--warning' : 'badge--danger'}`}>
                                      Mức {Math.round(info.m * 4)} (m={info.m})
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.45' }}>
                                    <div style={{ marginBottom: '4px' }}><strong>Lý do:</strong> {info.reason}</div>
                                    {info.evidence && info.evidence.length > 0 && (
                                      <div style={{ fontStyle: 'italic', color: '#475569', fontSize: '11px', background: '#f1f5f9', padding: '6px 8px', borderRadius: '4px', borderLeft: '3px solid #3b82f6' }}>
                                        <strong>Trích dẫn CV:</strong> "{info.evidence[0].quote}"
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '16px' }}>
                            <em>Chưa có dữ liệu đánh giá chuyên sâu kỹ năng LLM cho hồ sơ này.</em>
                          </div>
                        )}

                        {/* Tiêu chí đặc thù */}
                        {c.custom_criteria_results && c.custom_criteria_results.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginBottom: '8px' }}>
                              ✨ Tiêu chí đặc thù
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {c.custom_criteria_results.map((cr, idx) => (
                                <span key={idx} style={{ background: cr.met ? '#ecfdf5' : '#fef2f2', color: cr.met ? '#059669' : '#dc2626', border: `1px solid ${cr.met ? '#a7f3d0' : '#fecaca'}`, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                                  {cr.met ? '✓' : '✕'} {cr.name} ({cr.score_impact >= 0 ? `+${cr.score_impact}` : cr.score_impact}đ)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Yếu tố đặc trưng AI */}
                        {c.feature_details && Object.keys(c.feature_details).length > 0 && (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginBottom: '8px' }}>
                              📊 Điểm thành phần AI
                            </div>
                            <div className="match-cv-card__features" style={{ margin: 0 }}>
                              {Object.entries(c.feature_details).map(([k, v]) => (
                                <div key={k} className="feature-item" style={{ padding: '6px 10px' }}>
                                  <span className="feature-item__name">{k.replace(/_/g, ' ')}</span>
                                  <span className="feature-item__value">
                                    {typeof v === 'number' ? v.toFixed(2) : v}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{ padding: '14px 28px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Hiển thị <strong>{filteredCandidates.length}</strong> / {candidates.length} ứng viên
          </div>
          <button className="btn btn--primary" onClick={onClose} style={{ padding: '9px 24px' }}>
            Đóng
          </button>
        </div>
      </div>

      {/* MODAL THIẾT LẬP LỊCH PHỎNG VẤN */}
      {schedulingCandidate && (
        <ScheduleInterviewModal
          job={job}
          candidate={schedulingCandidate}
          onClose={() => setSchedulingCandidate(null)}
          onSuccess={(newInfo) => {
            setCandidates(prev => prev.map(cand => 
              cand.cv_id === schedulingCandidate.cv_id 
                ? { ...cand, interview_info: newInfo, status: 'interview' } 
                : cand
            ));
            if (onStatusChanged) onStatusChanged();
          }}
        />
      )}
    </div>
  );
}
