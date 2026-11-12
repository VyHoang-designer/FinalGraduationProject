// ==============================================================================
// FILE: frontend/src/components/AssignJobModal.jsx
// MÔ TẢ: Modal xác nhận Assign vị trí & Tuyển dụng ứng viên (status = 'hired')
//         - Gửi thông báo trúng tuyển đến ứng viên
//         - Đổi trạng thái ứng viên sang Đã tuyển
// ==============================================================================

import { useState } from 'react';
import { assignCandidateToJob } from '../services/api';

export default function AssignJobModal({
  isOpen,
  candidate,
  job,
  onClose,
  onAssignSuccess,
}) {
  if (!isOpen || !candidate || !job) return null;

  const isAlreadyHired = job.status === 'hired';

  const defaultNote =
    job.interview_info?.note ||
    job.interview_info?.message ||
    `Chúc mừng bạn ${candidate.full_name}! Sau khi đánh giá hồ sơ và năng lực, chúng tôi nhận thấy bạn rất phù hợp với vị trí ${job.job_title} tại ${job.job_department || 'công ty'}. Ban Nhân sự xin trân trọng thông báo bạn đã được tuyển dụng vào làm việc. Chúng tôi sẽ sớm liên hệ để trao đổi các bước tiếp theo.`;

  const [note, setNote] = useState(defaultNote);
  const [startDate, setStartDate] = useState(
    job.interview_info?.start_date || job.interview_info?.scheduled_at || ''
  );
  const [salaryOffer, setSalaryOffer] = useState(
    job.interview_info?.salary_offer || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const getScoreColor = (s) => {
    if (s >= 80) return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
    if (s >= 60) return { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' };
    if (s >= 40) return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
  };

  const scoreStyle = getScoreColor(job.match_score || 0);

  const initials = candidate.full_name
    ? candidate.full_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(-2)
        .toUpperCase()
    : 'UV';

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const jobId = job.jd_id || job.id;
      const res = await assignCandidateToJob(jobId, candidate.id, {
        status: 'hired',
        note: note.trim(),
        start_date: startDate || null,
        salary_offer: salaryOffer.trim() || null,
      });

      if (onAssignSuccess) {
        onAssignSuccess({
          ...job,
          status: 'hired',
          interview_info: res.interview_info,
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi assign vị trí tuyển dụng.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 11000,
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
            color: '#ffffff',
            padding: '22px 28px',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          >
            ✕
          </button>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.18)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}
          >
            <span>✨</span>
            <span>Assign Vị Trí & Tuyển Dụng</span>
          </div>

          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
            {isAlreadyHired ? 'Cập Nhật Tuyển Dụng Ứng Viên' : 'Xác Nhận Nhận Ứng Viên Vào Làm Việc'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#c7d2fe' }}>
            Hệ thống sẽ cập nhật trạng thái hồ sơ sang <strong>"Đã tuyển"</strong> và gửi thông báo trực tiếp đến ứng viên.
          </p>
        </div>

        {/* MODAL BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {error && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* TWO SUMMARY CARDS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            {/* Candidate Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Ứng viên
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.96rem',
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {candidate.full_name}
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {candidate.email || 'Chưa có email'}
                </div>
              </div>
            </div>

            {/* Target Job Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Vị trí tuyển dụng
                </span>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: scoreStyle.bg,
                    color: scoreStyle.text,
                    border: `1px solid ${scoreStyle.border}`,
                  }}
                >
                  {job.match_score?.toFixed(1)}% Match
                </span>
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.96rem',
                  color: '#1e293b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {job.job_title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                🏢 {job.job_department || 'Công ty'} {job.job_location ? `• 📍 ${job.job_location}` : ''}
              </div>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} id="assign-job-form">
            {/* Lời nhắn gửi ứng viên */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                <span>💬 Lời nhắn / Thông báo tuyển dụng gửi ứng viên:</span>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                  (Sẽ hiển thị trong chuông thông báo)
                </span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  resize: 'vertical',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#4f46e5')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                placeholder="Nhập lời chúc mừng hoặc hướng dẫn nhận việc cho ứng viên..."
              />
            </div>

            {/* START DATE & SALARY ROW */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
                marginBottom: '18px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  📅 Ngày bắt đầu làm việc (dự kiến):
                </label>
                <input
                  type="date"
                  value={startDate ? startDate.slice(0, 10) : ''}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  💵 Mức lương đề xuất (Offer):
                </label>
                <input
                  type="text"
                  value={salaryOffer}
                  onChange={(e) => setSalaryOffer(e.target.value)}
                  placeholder="Ví dụ: 25 - 30 triệu / Thỏa thuận"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* INFO CALLOUT */}
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '0.82rem',
                color: '#166534',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>🎉</span>
              <div>
                <strong>Hành động tự động:</strong> Hồ sơ ứng viên sẽ được chuyển sang giai đoạn{' '}
                <span
                  style={{
                    background: '#dcfce7',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    color: '#15803d',
                  }}
                >
                  Đã tuyển (Hired)
                </span>
                . Thông báo trúng tuyển sẽ xuất hiện ngay trong chuông thông báo và mục Việc làm của ứng viên.
              </div>
            </div>
          </form>
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '16px 28px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
          >
            Hủy bỏ
          </button>

          <button
            type="submit"
            form="assign-job-form"
            disabled={isSubmitting}
            style={{
              padding: '9px 22px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>{isAlreadyHired ? 'Lưu Thông Tin Tuyển Dụng' : 'Xác Nhận & Tuyển Dụng Ngay'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

