// ==============================================================================
// FILE: frontend/src/components/ScheduleInterviewModal.jsx
// MÔ TẢ: Modal cho Nhà tuyển dụng thiết lập lịch hẹn phỏng vấn, địa điểm, và các quy định cho ứng viên
// ==============================================================================

import { useState } from 'react';
import { scheduleInterview } from '../services/api';

const DEFAULT_REGULATIONS = `1. Có mặt trước giờ phỏng vấn từ 10 - 15 phút để chuẩn bị.
2. Mang theo CCCD/CMND và bản in CV / Portfolio dự án (nếu có).
3. Trang phục lịch sự, chuyên nghiệp.
4. Chuẩn bị giới thiệu ngắn về các dự án thực tế tiêu biểu đã từng thực hiện.`;

export default function ScheduleInterviewModal({ job, candidate, onClose, onSuccess }) {
  const existingInfo = candidate?.interview_info || {};

  // Default scheduled_at: 3 ngày sau, lúc 09:00 sáng
  const defaultDateStr = () => {
    if (existingInfo.scheduled_at) return existingInfo.scheduled_at.slice(0, 16);
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(9, 30, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [scheduledAt, setScheduledAt] = useState(defaultDateStr());
  const [interviewType, setInterviewType] = useState(existingInfo.interview_type || 'Trực tiếp');
  const [location, setLocation] = useState(existingInfo.location || `${job.location || 'Hồ Chí Minh'} (Tầng 8, Văn phòng Công ty)`);
  const [interviewer, setInterviewer] = useState(existingInfo.interviewer || `Ban Tuyển dụng ${job.department || 'APEX IT'}`);
  const [regulations, setRegulations] = useState(existingInfo.regulations || DEFAULT_REGULATIONS);
  const [note, setNote] = useState(existingInfo.note || 'Vui lòng xác nhận tham gia trước 24 giờ kể từ khi nhận được thông báo.');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!scheduledAt) {
      setError('Vui lòng chọn ngày giờ phỏng vấn.');
      return;
    }
    if (!location.trim()) {
      setError('Vui lòng điền địa điểm hoặc đường link phỏng vấn.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await scheduleInterview(job.id, candidate.cv_id, {
        scheduled_at: scheduledAt,
        interview_type: interviewType,
        location: location.trim(),
        interviewer: interviewer.trim(),
        regulations: regulations.trim(),
        note: note.trim(),
      });
      if (onSuccess) onSuccess(res.interview_info);
      onClose();
    } catch (err) {
      setError('Lỗi khi gửi thông báo: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 11000 }}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '640px', width: '92%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '1.8rem' }}>📅</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#1e293b' }}>
              Thiết lập Lịch Phỏng vấn & Quy định
            </h2>
            <div style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '2px' }}>
              Gửi thông báo mời phỏng vấn đến ứng viên <strong>{candidate.full_name}</strong>
            </div>
          </div>
        </div>

        {/* CANDIDATE & JOB SUMMARY BOX */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', margin: '16px 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Vị trí ứng tuyển:</div>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.98rem' }}>{job.title} ({job.department})</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Độ phù hợp AI:</div>
            <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.98rem' }}>
              {Math.round(candidate.match_score || 0)}% ({candidate.match_level})
            </div>
          </div>
        </div>

        {/* EXISTING STATUS (IF ANY) */}
        {existingInfo.candidate_response && (
          <div style={{
            background: existingInfo.candidate_response === 'confirmed' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${existingInfo.candidate_response === 'confirmed' ? '#a7f3d0' : '#fecaca'}`,
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
          }}>
            <div style={{ fontWeight: 700, color: existingInfo.candidate_response === 'confirmed' ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{existingInfo.candidate_response === 'confirmed' ? '✓' : '✕'}</span>
              <span>{existingInfo.candidate_response === 'confirmed' ? 'Ứng viên đã XÁC NHẬN tham gia' : 'Ứng viên đã TỪ CHỐI / XIN DỜI LỊCH'}</span>
            </div>
            {existingInfo.candidate_note && (
              <div style={{ fontSize: '0.86rem', color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>
                Phản hồi từ ứng viên: "{existingInfo.candidate_note}"
              </div>
            )}
          </div>
        )}

        {error && <div className="alert alert--error" style={{ marginBottom: '16px' }}>{error}</div>}

        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Row 1: Ngày giờ + Hình thức */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#334155', marginBottom: '6px', display: 'block' }}>
                ⏰ Ngày & Giờ phỏng vấn <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="datetime-local"
                className="input-control"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#334155', marginBottom: '6px', display: 'block' }}>
                🎙️ Hình thức phỏng vấn
              </label>
              <select
                className="input-control"
                value={interviewType}
                onChange={(e) => {
                  setInterviewType(e.target.value);
                  if (e.target.value.includes('Online')) {
                    setLocation('Google Meet (Link sẽ được gửi kèm trong email)');
                  } else {
                    setLocation(`${job.location || 'Hồ Chí Minh'} (Tầng 8, Văn phòng Công ty)`);
                  }
                }}
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                <option value="Trực tiếp">🏢 Trực tiếp tại văn phòng</option>
                <option value="Online (Google Meet/Zoom)">💻 Online (Google Meet/Zoom)</option>
                <option value="Hỗn hợp (Hybrid)">🌐 Hybrid</option>
              </select>
            </div>
          </div>

          {/* Row 2: Địa điểm */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#334155', marginBottom: '6px', display: 'block' }}>
              📍 Địa điểm / Đường link phỏng vấn <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="input-control"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="VD: Tòa nhà Apex, 123 Nguyễn Thị Minh Khai, Q.1, TP.HCM hoặc link Meet"
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Row 3: Người phỏng vấn / Liên hệ */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#334155', marginBottom: '6px', display: 'block' }}>
              👤 Người phỏng vấn / Bộ phận liên hệ
            </label>
            <input
              type="text"
              className="input-control"
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              placeholder="VD: Ban Tuyển dụng & Trưởng bộ phận Kỹ thuật"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Row 4: Quy định & Dặn dò */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#334155', margin: 0 }}>
                📋 Các quy định & Dặn dò cho ứng viên khi đi phỏng vấn
              </label>
              <button
                type="button"
                onClick={() => setRegulations(DEFAULT_REGULATIONS)}
                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Khôi phục mẫu chuẩn
              </button>
            </div>
            <textarea
              className="input-control"
              rows={4}
              value={regulations}
              onChange={(e) => setRegulations(e.target.value)}
              placeholder="Nhập các quy định về trang phục, giấy tờ cần mang theo, thời gian có mặt..."
              style={{ width: '100%', boxSizing: 'border-box', lineHeight: '1.5', fontFamily: 'inherit' }}
            />
          </div>

          {/* Row 5: Ghi chú thêm */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#334155', marginBottom: '6px', display: 'block' }}>
              💬 Ghi chú & Lời dặn thêm
            </label>
            <input
              type="text"
              className="input-control"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Vui lòng xác nhận tham gia trước 24 giờ..."
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* ACTIONS */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button type="button" className="btn btn--outline" onClick={onClose} disabled={loading} style={{ padding: '10px 18px' }}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn--primary ai-btn-primary" disabled={loading} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{loading ? 'Đang lưu & gửi...' : 'Lưu & Gửi thông báo cho ứng viên 🚀'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
