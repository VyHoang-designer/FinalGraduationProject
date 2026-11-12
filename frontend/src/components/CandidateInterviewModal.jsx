// ==============================================================================
// FILE: frontend/src/components/CandidateInterviewModal.jsx
// MÔ TẢ: Modal cho Ứng viên xem chi tiết thư mời phỏng vấn
//         - Thiết lập ngày giờ, địa điểm, người phỏng vấn
//         - Các quy định và dặn dò khi đi phỏng vấn
//         - Nút xác nhận đi phỏng vấn hoặc từ chối / xin dời lịch
// ==============================================================================

import { useState } from 'react';
import { respondInterview } from '../services/api';

function formatInterviewTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = dayNames[d.getDay()];
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${timeStr}, ${dayName} (${dateStr})`;
  } catch {
    return isoString;
  }
}

export default function CandidateInterviewModal({ interview, onClose, onResponded }) {
  const { match_id, job_title, department, interview_info = {} } = interview;
  const isHired = interview.status === 'hired' || interview_info.type === 'hired';

  const [responseType, setResponseType] = useState(interview_info.candidate_response || null);
  const [candidateNote, setCandidateNote] = useState(interview_info.candidate_note || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Danh sách các dòng quy định
  const regulationLines = (interview_info.regulations || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  async function handleSendResponse(chosenResponse) {
    setSubmitting(true);
    setError(null);
    try {
      await respondInterview(match_id, chosenResponse, candidateNote.trim());
      setResponseType(chosenResponse);
      setFeedbackSuccess(true);
      if (onResponded) {
        onResponded(match_id, chosenResponse, candidateNote.trim());
      }
    } catch (err) {
      setError('Lỗi khi gửi phản hồi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 12000 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          width: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER GRADIENT */}
        <div style={{
          padding: '24px 28px',
          background: isHired
            ? 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)'
            : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          color: '#ffffff',
          position: 'relative',
        }}>
          <button
            className="modal-close"
            onClick={onClose}
            style={{ color: '#ffffff', top: '18px', right: '18px', opacity: 0.8 }}
          >
            ✕
          </button>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '10px' }}>
            <span>{isHired ? '🎉' : '✉️'}</span>
            <span>{isHired ? 'THÔNG BÁO TRÚNG TUYỂN & NHẬN VIỆC' : 'THƯ MỜI PHỎNG VẤN'}</span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#ffffff' }}>
            {job_title}
          </h2>
          <div style={{ fontSize: '0.92rem', color: '#c7d2fe', marginTop: '4px' }}>
            {department || 'Công ty Công nghệ'} — {isHired ? 'Quyết định Tuyển dụng' : 'Ban Tuyển dụng'}
          </div>
        </div>

        {/* BODY SCROLL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8fafc' }}>
          {isHired ? (
            /* ================= HIRED VIEW ================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* CELEBRATION HERO */}
              <div style={{
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '1.5px solid #a7f3d0',
                borderRadius: '14px',
                padding: '20px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}>
                <div style={{ fontSize: '2.5rem' }}>🏆</div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.18rem', fontWeight: 800, color: '#065f46' }}>
                    Chúc mừng bạn đã trúng tuyển!
                  </h3>
                  <div style={{ fontSize: '0.88rem', color: '#047857', lineHeight: '1.5' }}>
                    Nhà tuyển dụng đã đánh giá cao hồ sơ và năng lực của bạn, chính thức tiếp nhận bạn vào làm việc tại vị trí <strong>{job_title}</strong>.
                  </div>
                </div>
              </div>

              {/* DETAILS CARD */}
              <div style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📋</span> Thông tin Tuyển dụng & Tiếp nhận
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Vị trí:</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{job_title}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Công ty / Phòng ban:</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{department || 'Công ty'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Trạng thái:</div>
                    <span style={{ display: 'inline-block', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.82rem', padding: '2px 8px', borderRadius: '6px' }}>
                      ✓ Đã tuyển (Hired)
                    </span>
                  </div>
                  {interview_info.start_date && (
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Ngày nhận việc dự kiến:</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#047857' }}>
                        📅 {new Date(interview_info.start_date).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  )}
                  {interview_info.salary_offer && (
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Mức lương Offer:</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669' }}>
                        💵 {interview_info.salary_offer}
                      </div>
                    </div>
                  )}
                  {interview_info.location && (
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Địa điểm làm việc:</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
                        📍 {interview_info.location}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recruiter Message */}
                {(interview_info.message || interview_info.note) && (
                  <div style={{ marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                      💬 Lời nhắn từ Nhà tuyển dụng:
                    </div>
                    <div style={{
                      background: '#f8fafc',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      borderLeft: '4px solid #10b981',
                      fontSize: '0.92rem',
                      color: '#1e293b',
                      lineHeight: '1.5',
                      fontStyle: 'italic',
                    }}>
                      "{interview_info.message || interview_info.note}"
                    </div>
                  </div>
                )}
              </div>

              {/* NEXT STEPS CALLOUT */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '0.86rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{ fontSize: '1.4rem' }}>💡</span>
                <div>
                  <strong>Bước tiếp theo:</strong> Bộ phận Nhân sự (HR) của công ty sẽ chủ động liên hệ trực tiếp qua Email hoặc Số điện thoại của bạn để hoàn tất các thủ tục ký kết hợp đồng và chuẩn bị ngày làm việc đầu tiên.
                </div>
              </div>
            </div>
          ) : (
            /* ================= INTERVIEW VIEW ================= */
            <>
          {/* TRẠNG THÁI HIỆN TẠI (NẾU ĐÃ PHẢN HỒI) */}
          {feedbackSuccess && (
            <div style={{
              background: responseType === 'confirmed' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${responseType === 'confirmed' ? '#a7f3d0' : '#fecaca'}`,
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: '1.8rem' }}>{responseType === 'confirmed' ? '🎉' : '📝'}</span>
              <div>
                <div style={{ fontWeight: 700, color: responseType === 'confirmed' ? '#065f46' : '#991b1b', fontSize: '1rem' }}>
                  {responseType === 'confirmed' ? 'Bạn đã xác nhận tham gia phỏng vấn thành công!' : 'Bạn đã gửi thông báo từ chối / xin dời lịch.'}
                </div>
                <div style={{ fontSize: '0.86rem', color: '#475569', marginTop: '2px' }}>
                  Nhà tuyển dụng đã nhận được phản hồi của bạn.
                </div>
              </div>
            </div>
          )}

          {!feedbackSuccess && responseType && (
            <div style={{
              background: responseType === 'confirmed' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${responseType === 'confirmed' ? '#a7f3d0' : '#fecaca'}`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>{responseType === 'confirmed' ? '✓' : '✕'}</span>
                <span style={{ fontWeight: 700, color: responseType === 'confirmed' ? '#047857' : '#b91c1c', fontSize: '0.94rem' }}>
                  Trạng thái hiện tại: {responseType === 'confirmed' ? 'Đã xác nhận tham gia' : 'Đã từ chối tham gia'}
                </span>
              </div>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Bạn vẫn có thể cập nhật lại bên dưới nếu có thay đổi.</span>
            </div>
          )}

          {error && <div className="alert alert--error" style={{ marginBottom: '16px' }}>{error}</div>}

          {/* CHI TIẾT LỊCH HẸN */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🗓️</span> Thông tin Lịch phỏng vấn
            </h3>

            {/* Thời gian */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '28px', fontSize: '1.2rem', textAlign: 'center' }}>⏰</div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Thời gian:</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4338ca' }}>
                  {formatInterviewTime(interview_info.scheduled_at)}
                </div>
              </div>
            </div>

            {/* Hình thức & Địa điểm */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '28px', fontSize: '1.2rem', textAlign: 'center' }}>📍</div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Hình thức & Địa điểm:
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                  <span style={{
                    display: 'inline-block',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginRight: '8px'
                  }}>
                    {interview_info.interview_type || 'Trực tiếp'}
                  </span>
                  {interview_info.location || 'Tại văn phòng công ty'}
                </div>
              </div>
            </div>

            {/* Người liên hệ / Phỏng vấn */}
            {interview_info.interviewer && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', fontSize: '1.2rem', textAlign: 'center' }}>👤</div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Người phỏng vấn / Liên hệ:
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
                    {interview_info.interviewer}
                  </div>
                </div>
              </div>
            )}

            {/* Ghi chú thêm từ HR */}
            {interview_info.note && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', fontSize: '1.2rem', textAlign: 'center' }}>💬</div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Lời nhắn từ Nhà tuyển dụng:
                  </div>
                  <div style={{ fontSize: '0.92rem', color: '#475569', fontStyle: 'italic', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #6366f1', marginTop: '4px' }}>
                    "{interview_info.note}"
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QUY ĐỊNH KHI ĐI PHỎNG VẤN */}
          {regulationLines.length > 0 && (
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              marginBottom: '20px',
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Quy định & Dặn dò dành cho Ứng viên
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {regulationLines.map((line, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: '#334155',
                    lineHeight: '1.45',
                  }}>
                    <span style={{ color: '#4f46e5', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KHUNG XÁC NHẬN CỦA ỨNG VIÊN */}
          {responseType ? (
            <div style={{
              background: responseType === 'confirmed' ? '#f0fdf4' : '#fef2f2',
              borderRadius: '14px',
              padding: '20px',
              border: `2px solid ${responseType === 'confirmed' ? '#86efac' : '#fca5a5'}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>{responseType === 'confirmed' ? '✅' : '❌'}</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: responseType === 'confirmed' ? '#166534' : '#991b1b' }}>
                  {responseType === 'confirmed' ? 'Bạn đã xác nhận tham gia phỏng vấn' : 'Bạn đã phản hồi từ chối / xin dời lịch'}
                </h3>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.88rem', color: '#475569' }}>
                Phản hồi của bạn đã được ghi nhận vào hệ thống và đồng bộ tới nhà tuyển dụng.
              </p>
              {candidateNote && (
                <div style={{
                  background: '#ffffff',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.86rem',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  marginTop: '8px',
                }}>
                  <strong style={{ color: '#1e293b' }}>Lời nhắn đã gửi: </strong>
                  {candidateNote}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              padding: '20px',
              border: '2px solid #e0e7ff',
              boxShadow: '0 4px 12px rgba(99,102,241,0.08)',
            }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✍️</span> Phản hồi của bạn
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: '0.86rem', color: '#64748b' }}>
                Vui lòng xác nhận bạn có thể tham gia buổi phỏng vấn đúng giờ hay không để nhà tuyển dụng chuẩn bị chu đáo nhất.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>
                  Lời nhắn gửi Nhà tuyển dụng (tùy chọn):
                </label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="VD: Em xác nhận có mặt đúng giờ / Em xin dời sang 14:00 cùng ngày do bận lịch..."
                  value={candidateNote}
                  onChange={(e) => setCandidateNote(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* BUTTONS */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  disabled={submitting}
                  onClick={() => handleSendResponse('declined')}
                  style={{
                    padding: '10px 20px',
                    borderColor: '#fca5a5',
                    color: '#dc2626',
                    background: '#fef2f2',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  {submitting ? 'Đang gửi...' : '✕ Từ chối / Bận'}
                </button>

                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={submitting}
                  onClick={() => handleSendResponse('confirmed')}
                  style={{
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    borderColor: '#059669',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <span>{submitting ? 'Đang gửi...' : '✓ Xác nhận Tham gia Phỏng vấn'}</span>
                </button>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '14px 28px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button className="btn btn--outline" onClick={onClose} style={{ padding: '8px 20px' }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
