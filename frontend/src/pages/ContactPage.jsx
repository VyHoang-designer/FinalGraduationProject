// ==============================================================================
// FILE: frontend/src/pages/ContactPage.jsx
// MÔ TẢ: Trang Liên hệ dành cho Ứng viên gửi câu hỏi / thắc mắc trực tiếp tới JD
//         - Tự động gửi thông báo đến Nhà tuyển dụng quản lý JD đó
//         - Có bước popup / modal xác nhận trước khi gửi
//         - Quản lý lịch sử câu hỏi / liên hệ đã gửi
// ==============================================================================

import { useState, useEffect } from 'react';
import CandidateHeader from '../components/CandidateHeader';
import CandidateInterviewModal from '../components/CandidateInterviewModal';
import { 
  fetchJobs, 
  fetchCandidateInterviews, 
  sendJobInquiry, 
  fetchMyInquiries, 
  deleteInquiry 
} from '../services/api';

const COMMON_TOPICS = [
  'Quy trình & lịch trình phỏng vấn',
  'Mức lương & chính sách đãi ngộ',
  'Yêu cầu chi tiết về kỹ thuật & kinh nghiệm',
  'Hình thức làm việc (Remote / Hybrid / Onsite)',
  'Cơ hội phát triển & đào tạo',
  'Câu hỏi khác về vị trí công việc'
];

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export default function ContactPage({ currentUser, onLogout, onNavigate, initialJob = null }) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [selectedInterviewForModal, setSelectedInterviewForModal] = useState(null);

  // Form states
  const [selectedJobId, setSelectedJobId] = useState(initialJob?.id ? String(initialJob.id) : '');
  const [senderName, setSenderName] = useState(currentUser?.full_name || '');
  const [senderEmail, setSenderEmail] = useState(currentUser?.email || '');
  const [senderPhone, setSenderPhone] = useState(currentUser?.phone || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // History states
  const [myInquiries, setMyInquiries] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedInquiryId, setExpandedInquiryId] = useState(null);

  useEffect(() => {
    loadJobs();
    if (currentUser?.id) {
      loadInterviews();
      loadHistory();
    }
  }, [currentUser]);

  useEffect(() => {
    if (initialJob?.id) {
      setSelectedJobId(String(initialJob.id));
    }
  }, [initialJob]);

  async function loadJobs() {
    setLoadingJobs(true);
    try {
      const data = await fetchJobs(true);
      setJobs(Array.isArray(data) ? data : []);
      if (!selectedJobId && data && data.length > 0 && !initialJob) {
        setSelectedJobId(String(data[0].id));
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách vị trí:', err);
    } finally {
      setLoadingJobs(false);
    }
  }

  async function loadInterviews() {
    try {
      const data = await fetchCandidateInterviews(currentUser.id);
      setInterviews(data || []);
    } catch (err) {
      console.error('Lỗi khi tải lịch phỏng vấn:', err);
    }
  }

  async function loadHistory() {
    if (!currentUser?.id) return;
    setLoadingHistory(true);
    try {
      const data = await fetchMyInquiries(currentUser.id);
      setMyInquiries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử liên hệ:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  const selectedJob = jobs.find(j => String(j.id) === String(selectedJobId));

  function handleOpenConfirm(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedJobId) {
      setFormError('Vui lòng chọn vị trí tuyển dụng (JD) bạn muốn liên hệ.');
      return;
    }
    if (!senderName.trim()) {
      setFormError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!senderEmail.trim() || !senderEmail.includes('@')) {
      setFormError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!subject.trim()) {
      setFormError('Vui lòng chọn hoặc nhập tiêu đề câu hỏi / thắc mắc.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      setFormError('Nội dung tin nhắn cần tối thiểu 10 ký tự để Nhà tuyển dụng nắm rõ thông tin.');
      return;
    }

    setShowConfirmModal(true);
  }

  async function handleConfirmSubmit() {
    setShowConfirmModal(false);
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        user_id: currentUser?.id || null,
        jd_id: Number(selectedJobId),
        sender_name: senderName.trim(),
        sender_email: senderEmail.trim(),
        sender_phone: senderPhone.trim() || null,
        subject: subject.trim(),
        message: message.trim(),
      };

      await sendJobInquiry(payload);
      setFormSuccess(`Đã gửi liên hệ thành công tới Nhà tuyển dụng của vị trí "${selectedJob?.title || 'JD'}"! Thông báo đã được chuyển trực tiếp tới hộp thư nhà tuyển dụng.`);
      setMessage('');
      loadHistory();
      window.scrollTo({ top: 300, behavior: 'smooth' });
    } catch (err) {
      setFormError(err.message || 'Có lỗi xảy ra khi gửi liên hệ. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteInquiry(inquiryId) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tin nhắn liên hệ này khỏi lịch sử?')) {
      return;
    }
    try {
      await deleteInquiry(inquiryId);
      setMyInquiries(prev => prev.filter(item => item.id !== inquiryId));
    } catch (err) {
      alert('Không thể xóa: ' + (err.message || 'Lỗi server'));
    }
  }

  return (
    <div className="candidate-portal-layout">
      {/* HEADER */}
      <CandidateHeader 
        currentUser={currentUser} 
        onLogout={onLogout} 
        onSwitchToEmployer={() => onNavigate('jobs')}
        onNavigateProfile={() => onNavigate('profile')}
        interviews={interviews}
        onSelectInterview={setSelectedInterviewForModal}
        activeNav="contact"
        onNavigate={onNavigate}
      />

      <div className="candidate-portal-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px 60px' }}>
        
        {/* HERO BANNER LIÊN HỆ */}
        <div style={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #2563eb 60%, #38bdf8 100%)',
          color: '#ffffff',
          padding: '40px 36px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(37, 99, 235, 0.25)',
          marginBottom: '28px',
        }}>
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '680px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', padding: '5px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '14px', backdropFilter: 'blur(8px)' }}>
              <span>💬</span>
              <span>KÊNH HỎI ĐÁP & LIÊN HỆ TUYỂN DỤNG</span>
            </div>
            <h1 style={{ margin: '0 0 10px', fontSize: '2rem', fontWeight: 800, lineHeight: '1.25' }}>
              Kết Nối & Trao Đổi Trực Tiếp Với Nhà Tuyển Dụng
            </h1>
            <p style={{ margin: 0, fontSize: '0.98rem', color: '#e0e7ff', lineHeight: '1.6' }}>
              Bạn có thắc mắc về mô tả công việc (JD), mức lương, yêu cầu kỹ thuật hay chế độ làm việc? 
              Hãy gửi thông tin ngay dưới đây — Nhà tuyển dụng sẽ nhận được thông báo tức thì và phản hồi cho bạn.
            </p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid var(--border-color, #e2e8f0)', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('new')}
            style={{
              padding: '12px 20px',
              fontWeight: 600,
              fontSize: '0.95rem',
              color: activeTab === 'new' ? '#2563eb' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'new' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <span>✍️</span>
            <span>Gửi câu hỏi / Liên hệ mới</span>
          </button>

          <button
            onClick={() => { setActiveTab('history'); loadHistory(); }}
            style={{
              padding: '12px 20px',
              fontWeight: 600,
              fontSize: '0.95rem',
              color: activeTab === 'history' ? '#2563eb' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'history' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <span>📬</span>
            <span>Tin nhắn đã gửi ({myInquiries.length})</span>
          </button>
        </div>

        {/* TAB 1: FORM GỬI LIÊN HỆ MỚI */}
        {activeTab === 'new' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
            {/* Cột trái: Form */}
            <div style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '16px',
              padding: '28px',
              border: '1px solid var(--border-color, #e2e8f0)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 18px', color: 'var(--text-primary, #1e293b)' }}>
                Nội Dung Liên Hệ Cho Vị Trí Tuyển Dụng
              </h2>

              {formSuccess && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>✅</span>
                  <div>
                    <strong>Thành công!</strong>
                    <div style={{ marginTop: '2px' }}>{formSuccess}</div>
                  </div>
                </div>
              )}

              {formError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</span>
                  <div>{formError}</div>
                </div>
              )}

              <form onSubmit={handleOpenConfirm}>
                {/* 1. Chọn vị trí tuyển dụng (JD) */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-primary, #334155)' }}>
                    Vị trí tuyển dụng cần liên hệ <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {loadingJobs ? (
                    <div style={{ padding: '10px', color: '#64748b' }}>Đang tải danh sách việc làm...</div>
                  ) : (
                    <select
                      value={selectedJobId}
                      onChange={e => setSelectedJobId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: 'var(--bg-secondary, #f8fafc)',
                        color: 'var(--text-primary, #1e293b)',
                        fontSize: '0.95rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                      required
                    >
                      <option value="">-- Chọn công việc / JD bạn quan tâm --</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.title} — {j.department || 'Bộ phận CNTT'} {j.location ? `(${j.location})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. Thông tin người gửi */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--text-primary, #334155)' }}>
                      Họ và tên của bạn <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={e => setSenderName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: 'var(--bg-secondary, #f8fafc)',
                        color: 'var(--text-primary, #1e293b)',
                        fontSize: '0.92rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--text-primary, #334155)' }}>
                      Email nhận phản hồi <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={e => setSenderEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: 'var(--bg-secondary, #f8fafc)',
                        color: 'var(--text-primary, #1e293b)',
                        fontSize: '0.92rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--text-primary, #334155)' }}>
                    Số điện thoại liên lạc
                  </label>
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={e => setSenderPhone(e.target.value)}
                    placeholder="0912 345 678 (Tùy chọn)"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-secondary, #f8fafc)',
                      color: 'var(--text-primary, #1e293b)',
                      fontSize: '0.92rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* 3. Gợi ý chủ đề nhanh */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '8px', color: 'var(--text-primary, #334155)' }}>
                    Chủ đề / Mục đích câu hỏi <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    {COMMON_TOPICS.map((topic, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSubject(topic)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          border: subject === topic ? '1px solid #2563eb' : '1px solid var(--border-color, #cbd5e1)',
                          background: subject === topic ? '#eff6ff' : 'var(--bg-secondary, #f8fafc)',
                          color: subject === topic ? '#1d4ed8' : 'var(--text-secondary, #64748b)',
                          fontSize: '0.82rem',
                          fontWeight: subject === topic ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Nhập hoặc chọn chủ đề câu hỏi..."
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-secondary, #f8fafc)',
                      color: 'var(--text-primary, #1e293b)',
                      fontSize: '0.92rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* 4. Nội dung tin nhắn */}
                <div style={{ marginBottom: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary, #334155)' }}>
                      Nội dung tin nhắn / Câu hỏi chi tiết <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.8rem', color: message.length >= 10 ? '#10b981' : '#94a3b8' }}>
                      {message.length} ký tự
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Kính gửi Nhà tuyển dụng, em xin phép hỏi thêm về yêu cầu cụ thể của dự án cho vị trí này..."
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-secondary, #f8fafc)',
                      color: 'var(--text-primary, #1e293b)',
                      fontSize: '0.92rem',
                      lineHeight: '1.5',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Nút gửi */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    transition: 'all 0.2s',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  {submitting ? 'Đang gửi...' : 'Gửi liên hệ cho Nhà tuyển dụng'}
                </button>
              </form>
            </div>

            {/* Cột phải: Preview thông tin JD */}
            <div>
              {selectedJob ? (
                <div style={{
                  background: 'var(--card-bg, #ffffff)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  position: 'sticky',
                  top: '90px'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    🏢 VỊ TRÍ ĐÃ CHỌN
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary, #1e293b)' }}>
                    {selectedJob.title}
                  </h3>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '14px' }}>
                    {selectedJob.department || 'Bộ phận Công nghệ'}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', borderBottom: '1px solid var(--border-color, #e2e8f0)', padding: '14px 0', marginBottom: '14px', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary, #475569)' }}>
                      <span>📍</span>
                      <span>{selectedJob.location || 'Hồ Chí Minh'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary, #475569)' }}>
                      <span>⏳</span>
                      <span>Kinh nghiệm: {selectedJob.required_experience > 0 ? `${selectedJob.required_experience}+ năm` : 'Không yêu cầu'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #475569)' }}>
                      <span>💼</span>
                      <span>Hình thức: Full-time</span>
                    </div>
                  </div>

                  {selectedJob.required_skills && selectedJob.required_skills.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>
                        Kỹ năng yêu cầu:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedJob.required_skills.slice(0, 6).map((s, i) => (
                          <span 
                            key={i}
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              fontWeight: 600
                            }}
                          >
                            {typeof s === 'string' ? s : s.skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    padding: '14px',
                    fontSize: '0.83rem',
                    color: '#64748b',
                    lineHeight: '1.5',
                    border: '1px dashed #cbd5e1'
                  }}>
                    💡 <em>Sau khi bạn xác nhận gửi, hệ thống sẽ kích hoạt chuông thông báo trực tiếp đến Nhà tuyển dụng quản lý tin tuyển dụng này để họ kiểm tra và hồi âm.</em>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'var(--card-bg, #ffffff)',
                  borderRadius: '16px',
                  padding: '30px 20px',
                  border: '1px dashed var(--border-color, #cbd5e1)',
                  textAlign: 'center',
                  color: '#94a3b8'
                }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>📋</span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Chưa chọn vị trí công việc</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Chọn một vị trí ở danh sách bên trái để xem tóm tắt thông tin JD.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LỊCH SỬ TIN NHẮN ĐÃ GỬI */}
        {activeTab === 'history' && (
          <div style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary, #1e293b)' }}>
                  Lịch Sử Các Câu Hỏi & Liên Hệ Đã Gửi
                </h2>
                <span style={{ fontSize: '0.88rem', color: '#64748b' }}>
                  Tổng cộng có {myInquiries.length} tin nhắn liên hệ đã được gửi
                </span>
              </div>
              <button
                onClick={() => setActiveTab('new')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Gửi câu hỏi mới
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Đang tải lịch sử liên hệ...
              </div>
            ) : myInquiries.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>📭</span>
                <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: 'var(--text-primary, #334155)' }}>Bạn chưa gửi tin nhắn liên hệ nào</h4>
                <p style={{ margin: '0 0 16px', fontSize: '0.9rem' }}>Hãy chọn một vị trí việc làm và gửi câu hỏi để nhận tư vấn từ Nhà tuyển dụng.</p>
                <button
                  onClick={() => setActiveTab('new')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Gửi tin nhắn đầu tiên
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {myInquiries.map((inq) => {
                  const isExpanded = expandedInquiryId === inq.id;
                  return (
                    <div
                      key={inq.id}
                      style={{
                        border: '1px solid var(--border-color, #e2e8f0)',
                        borderRadius: '12px',
                        padding: '18px 20px',
                        background: 'var(--bg-secondary, #fafafa)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <span style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              fontWeight: 700
                            }}>
                              {inq.job_title || `JD #${inq.jd_id}`}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>•</span>
                            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                              {formatDate(inq.created_at)}
                            </span>
                            <span style={{
                              background: inq.status === 'replied' ? '#f0fdf4' : '#fefce8',
                              color: inq.status === 'replied' ? '#166534' : '#854d0e',
                              padding: '2px 8px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}>
                              {inq.status === 'replied' ? 'Đã phản hồi' : 'Đã gửi tới NTD'}
                            </span>
                          </div>

                          <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                            {inq.subject}
                          </h4>

                          <p style={{
                            margin: 0,
                            fontSize: '0.9rem',
                            color: 'var(--text-secondary, #475569)',
                            lineHeight: '1.5',
                            whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                            overflow: isExpanded ? 'visible' : 'hidden',
                            textOverflow: isExpanded ? 'clip' : 'ellipsis',
                          }}>
                            {inq.message}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => setExpandedInquiryId(isExpanded ? null : inq.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                          >
                            {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                          </button>

                          <button
                            onClick={() => handleDeleteInquiry(inq.id)}
                            title="Xóa tin nhắn này"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#e11d48',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* POPUP / MODAL XÁC NHẬN TRƯỚC KHI GỬI LIÊN HỆ CHO JD */}
      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="inquiry-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '16px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>❓</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>
                  Xác nhận gửi thông tin liên hệ
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '0 0 10px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '0.94rem', color: 'var(--text-secondary, #334155)', lineHeight: '1.5' }}>
                Bạn có chắc chắn muốn gửi câu hỏi / thắc mắc này tới <strong>Nhà tuyển dụng</strong> của vị trí công việc sau?
              </p>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '4px' }}>Vị trí ứng tuyển (JD):</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '12px' }}>
                  {selectedJob?.title}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block' }}>Họ tên người gửi:</span>
                    <strong style={{ color: '#1e293b' }}>{senderName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block' }}>Email phản hồi:</span>
                    <strong style={{ color: '#1e293b' }}>{senderEmail}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Tiêu đề câu hỏi:</span>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#1e293b', marginTop: '2px' }}>{subject}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#059669', background: '#ecfdf5', padding: '12px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                🔔 <strong>Thông báo tự động:</strong> Ngay sau khi bạn nhấn "Xác nhận & Gửi", chuông thông báo trên giao diện Nhà tuyển dụng sẽ được cập nhật tin nhắn này.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Hủy bỏ / Kiểm tra lại
              </button>

              <button
                type="button"
                className="btn btn--primary"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '8px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Đang gửi...' : 'Xác nhận & Gửi ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lịch phỏng vấn nếu bấm từ notification */}
      {selectedInterviewForModal && (
        <CandidateInterviewModal
          interview={selectedInterviewForModal}
          currentUser={currentUser}
          onClose={() => setSelectedInterviewForModal(null)}
          onStatusUpdated={loadInterviews}
        />
      )}
    </div>
  );
}

