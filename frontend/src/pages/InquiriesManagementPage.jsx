// ==============================================================================
// FILE: frontend/src/pages/InquiriesManagementPage.jsx
// MÔ TẢ: Trang Quản lý Liên hệ & Hỏi đáp JD dành cho Nhà tuyển dụng
//         - Xem danh sách câu hỏi / thắc mắc của ứng viên gửi cho từng JD
//         - Lọc theo Vị trí JD, Trạng thái (Chưa đọc, Đã đọc, Đã phản hồi)
//         - Tìm kiếm theo họ tên, email, tiêu đề, từ khóa
//         - Xem chi tiết câu hỏi, soạn và lưu phản hồi, gửi email trực tiếp
//         - Xóa hoặc cập nhật trạng thái liên hệ
// ==============================================================================

import { useState, useEffect, useMemo } from 'react';
import { 
  fetchEmployerInquiries, 
  fetchEmployerInquiryStats, 
  updateInquiryStatus, 
  replyToInquiry, 
  deleteInquiry,
  fetchJobs 
} from '../services/api';

function formatDateTime(dateString) {
  if (!dateString) return '—';
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

function formatTimeAgo(dateString) {
  if (!dateString) return 'Vừa xong';
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return past.toLocaleDateString('vi-VN');
  } catch {
    return 'Vừa xong';
  }
}

export default function InquiriesManagementPage({ onNavigate, globalSearchTerm = '' }) {
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0, read: 0, replied: 0 });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedJdId, setSelectedJdId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unread' | 'read' | 'replied'
  const [searchTerm, setSearchTerm] = useState(globalSearchTerm);

  // Detail & Reply Modal
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (globalSearchTerm !== undefined) {
      setSearchTerm(globalSearchTerm);
    }
  }, [globalSearchTerm]);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedJdId, statusFilter, searchTerm]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadJobs() {
    try {
      const data = await fetchJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách vị trí:', err);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [inqData, statsData] = await Promise.all([
        fetchEmployerInquiries({
          jd_id: selectedJdId ? Number(selectedJdId) : undefined,
          status: statusFilter,
          search: searchTerm.trim() || undefined,
        }),
        fetchEmployerInquiryStats(),
      ]);
      setInquiries(Array.isArray(inqData) ? inqData : []);
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách liên hệ:', err);
      showToast('Không thể tải danh sách liên hệ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Mở modal xem chi tiết và tự động đánh dấu đã đọc nếu đang là unread
  async function handleOpenDetail(item) {
    setSelectedInquiry(item);
    setReplyText(item.reply_message || '');

    if (item.status === 'unread') {
      try {
        const updated = await updateInquiryStatus(item.id, 'read');
        setInquiries(prev => prev.map(i => i.id === item.id ? { ...i, status: 'read' } : i));
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
          read: prev.read + 1,
        }));
        setSelectedInquiry(prev => prev && prev.id === item.id ? { ...prev, status: 'read' } : prev);
      } catch (err) {
        console.warn('Lỗi đánh dấu đã đọc:', err);
      }
    }
  }

  // Đổi trạng thái nhanh
  async function handleToggleStatus(item, e) {
    e.stopPropagation();
    const nextStatus = item.status === 'unread' ? 'read' : 'unread';
    try {
      await updateInquiryStatus(item.id, nextStatus);
      setInquiries(prev => prev.map(i => i.id === item.id ? { ...i, status: nextStatus } : i));
      showToast(`Đã chuyển trạng thái sang "${nextStatus === 'read' ? 'Đã đọc' : 'Chưa đọc'}"`);
      // Reload stats
      const s = await fetchEmployerInquiryStats();
      if (s) setStats(s);
    } catch (err) {
      showToast('Lỗi cập nhật: ' + err.message, 'error');
    }
  }

  // Gửi / Lưu phản hồi
  async function handleSaveReply() {
    if (!selectedInquiry) return;
    if (!replyText.trim()) {
      showToast('Vui lòng nhập nội dung phản hồi', 'error');
      return;
    }

    setSavingReply(true);
    try {
      const updated = await replyToInquiry(selectedInquiry.id, replyText.trim());
      setInquiries(prev => prev.map(i => i.id === selectedInquiry.id ? updated : i));
      setSelectedInquiry(updated);
      showToast('Đã lưu phản hồi và chuyển trạng thái sang "Đã phản hồi"!');
      // Reload stats
      const s = await fetchEmployerInquiryStats();
      if (s) setStats(s);
    } catch (err) {
      showToast('Lỗi khi lưu phản hồi: ' + err.message, 'error');
    } finally {
      setSavingReply(false);
    }
  }

  // Xóa liên hệ
  async function handleDelete(item, e) {
    if (e) e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa liên hệ từ "${item.sender_name}"?`)) {
      return;
    }

    try {
      await deleteInquiry(item.id);
      setInquiries(prev => prev.filter(i => i.id !== item.id));
      if (selectedInquiry?.id === item.id) {
        setSelectedInquiry(null);
      }
      showToast('Đã xóa tin nhắn liên hệ thành công');
      const s = await fetchEmployerInquiryStats();
      if (s) setStats(s);
    } catch (err) {
      showToast('Lỗi khi xóa: ' + err.message, 'error');
    }
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 999999,
          fontWeight: 600,
          fontSize: '0.92rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>💬</span>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)' }}>
              Quản lý Liên hệ & Hỏi đáp JD
            </h2>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: '#64748b' }}>
            Tiếp nhận câu hỏi, thắc mắc về chế độ, yêu cầu kỹ thuật và quy trình tuyển dụng từ ứng viên gửi cho từng vị trí.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadData}
            className="btn btn--outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 16px', fontSize: '0.88rem' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Làm mới
          </button>
        </div>
      </div>

      {/* 4 STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Tổng */}
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '14px',
          padding: '18px 20px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            📬
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>TỔNG LIÊN HỆ</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{stats.total}</div>
          </div>
        </div>

        {/* Card 2: Chưa đọc */}
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '14px',
          padding: '18px 20px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            🔔
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#b45309' }}>CHƯA ĐỌC / MỚI</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b45309' }}>{stats.unread}</div>
          </div>
        </div>

        {/* Card 3: Đã đọc */}
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '14px',
          padding: '18px 20px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            👁️
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6d28d9' }}>ĐÃ XEM QUA</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6d28d9' }}>{stats.read}</div>
          </div>
        </div>

        {/* Card 4: Đã phản hồi */}
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '14px',
          padding: '18px 20px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            ✅
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#15803d' }}>ĐÃ PHẢN HỒI</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d' }}>{stats.replied}</div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        borderRadius: '14px',
        padding: '16px 20px',
        border: '1px solid var(--border-color, #e2e8f0)',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary, #f1f5f9)', padding: '4px', borderRadius: '10px' }}>
          {[
            { key: 'all', label: `Tất cả (${stats.total})` },
            { key: 'unread', label: `Chưa đọc (${stats.unread})` },
            { key: 'read', label: `Đã đọc (${stats.read})` },
            { key: 'replied', label: `Đã phản hồi (${stats.replied})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: statusFilter === tab.key ? '#ffffff' : 'transparent',
                color: statusFilter === tab.key ? '#2563eb' : '#64748b',
                fontWeight: statusFilter === tab.key ? 700 : 500,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: statusFilter === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdowns & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Filter by JD */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Vị trí JD:</span>
            <select
              value={selectedJdId}
              onChange={e => setSelectedJdId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-secondary, #f8fafc)',
                color: 'var(--text-primary, #1e293b)',
                fontSize: '0.88rem',
                maxWidth: '220px'
              }}
            >
              <option value="">Tất cả vị trí tuyển dụng</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Tìm theo tên, email, chủ đề..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 14px 8px 34px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-secondary, #f8fafc)',
                color: 'var(--text-primary, #1e293b)',
                fontSize: '0.88rem',
                width: '240px',
                outline: 'none'
              }}
            />
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABLE CONTENT */}
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        borderRadius: '16px',
        border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <span className="spinner" style={{ marginRight: '8px' }} /> Đang tải danh sách liên hệ...
          </div>
        ) : inquiries.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>📭</span>
            <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: 'var(--text-primary, #1e293b)' }}>
              Không tìm thấy tin nhắn liên hệ nào
            </h4>
            <p style={{ margin: 0, fontSize: '0.88rem' }}>
              {statusFilter !== 'all' || selectedJdId || searchTerm
                ? 'Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                : 'Hiện tại chưa có ứng viên nào gửi tin nhắn liên hệ cho các vị trí tuyển dụng của bạn.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 20px' }}>Ứng viên</th>
                  <th style={{ padding: '14px 16px' }}>Vị trí JD</th>
                  <th style={{ padding: '14px 16px' }}>Chủ đề & Nội dung</th>
                  <th style={{ padding: '14px 16px' }}>Thời gian gửi</th>
                  <th style={{ padding: '14px 16px' }}>Trạng thái</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inq) => {
                  const isUnread = inq.status === 'unread';
                  return (
                    <tr
                      key={inq.id}
                      onClick={() => handleOpenDetail(inq)}
                      style={{
                        borderBottom: '1px solid var(--border-color, #f1f5f9)',
                        background: isUnread ? 'rgba(239, 246, 255, 0.5)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = isUnread ? '#e0f2fe' : 'var(--bg-secondary, #f8fafc)'}
                      onMouseLeave={e => e.currentTarget.style.background = isUnread ? 'rgba(239, 246, 255, 0.5)' : 'transparent'}
                    >
                      {/* 1. Ứng viên */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: isUnread ? '#2563eb' : '#64748b',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {inq.sender_name ? inq.sender_name.slice(0, 2).toUpperCase() : 'UV'}
                          </div>
                          <div>
                            <div style={{ fontWeight: isUnread ? 700 : 600, color: 'var(--text-primary, #1e293b)' }}>
                              {inq.sender_name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {inq.sender_email}
                            </div>
                            {inq.sender_phone && (
                              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                📞 {inq.sender_phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Vị trí JD */}
                      <td style={{ padding: '16px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: '#1d4ed8', fontSize: '0.92rem' }}>
                          {inq.job_title || `JD #${inq.jd_id}`}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {inq.department || 'Bộ phận CNTT'}
                        </div>
                      </td>

                      {/* 3. Chủ đề & Nội dung */}
                      <td style={{ padding: '16px 16px', verticalAlign: 'top', maxWidth: '340px' }}>
                        <div style={{ fontWeight: isUnread ? 700 : 600, color: 'var(--text-primary, #1e293b)', marginBottom: '3px' }}>
                          {inq.subject}
                        </div>
                        <div style={{
                          fontSize: '0.84rem',
                          color: '#64748b',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.45'
                        }}>
                          {inq.message}
                        </div>
                        {inq.reply_message && (
                          <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>↩️</span>
                            <span style={{ fontStyle: 'italic' }}>Đã có phản hồi</span>
                          </div>
                        )}
                      </td>

                      {/* 4. Thời gian */}
                      <td style={{ padding: '16px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary, #334155)' }}>
                          {formatTimeAgo(inq.created_at)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {formatDateTime(inq.created_at)}
                        </div>
                      </td>

                      {/* 5. Trạng thái */}
                      <td style={{ padding: '16px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        {inq.status === 'unread' && (
                          <span style={{
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#b45309' }} />
                            Chưa đọc
                          </span>
                        )}
                        {inq.status === 'read' && (
                          <span style={{
                            background: '#ede9fe',
                            color: '#6d28d9',
                            border: '1px solid #ddd6fe',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}>
                            Đã đọc
                          </span>
                        )}
                        {inq.status === 'replied' && (
                          <span style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            ✓ Đã phản hồi
                          </span>
                        )}
                      </td>

                      {/* 6. Thao tác */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenDetail(inq); }}
                            className="btn btn--sm btn--primary"
                            style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                          >
                            Xem & Phản hồi
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(inq, e)}
                            title={inq.status === 'unread' ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-color, #cbd5e1)',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#64748b',
                              fontSize: '0.8rem'
                            }}
                          >
                            {inq.status === 'unread' ? '👁️' : '📩'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(inq, e)}
                            title="Xóa liên hệ này"
                            style={{
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#e11d48',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL & REPLY MODAL */}
      {selectedInquiry && (
        <div className="modal-backdrop" onClick={() => setSelectedInquiry(null)}>
          <div className="inquiry-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '16px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>📩</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)' }}>
                    Chi Tiết Liên Hệ & Phản Hồi Cho Ứng Viên
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '3px' }}>
                    Cho vị trí tuyển dụng: <strong style={{ color: '#2563eb' }}>{selectedInquiry.job_title}</strong> ({selectedInquiry.department || 'Bộ phận CNTT'})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '0 0 10px' }}>
              {/* Box 1: Thông tin người gửi */}
              <div style={{
                background: 'var(--bg-secondary, #f8fafc)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid var(--border-color, #e2e8f0)',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Họ và tên ứng viên:</span>
                    <strong style={{ color: 'var(--text-primary, #1e293b)' }}>{selectedInquiry.sender_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Thời gian gửi:</span>
                    <span style={{ color: 'var(--text-primary, #1e293b)' }}>{formatDateTime(selectedInquiry.created_at)} ({formatTimeAgo(selectedInquiry.created_at)})</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Email nhận hồi âm:</span>
                    <a href={`mailto:${selectedInquiry.sender_email}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                      {selectedInquiry.sender_email}
                    </a>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Số điện thoại:</span>
                    {selectedInquiry.sender_phone ? (
                      <a href={`tel:${selectedInquiry.sender_phone}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                        {selectedInquiry.sender_phone}
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Chưa cung cấp</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 2: Tiêu đề & Nội dung tin nhắn */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                  CHỦ ĐỀ CÂU HỎI:
                </span>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary, #1e293b)', marginBottom: '8px' }}>
                  {selectedInquiry.subject}
                </div>
                
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  NỘI DUNG CHI TIẾT:
                </span>
                <div style={{
                  background: 'var(--bg-secondary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  fontSize: '0.92rem',
                  color: 'var(--text-primary, #1e293b)'
                }}>
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Box 3: Phản hồi từ Nhà tuyển dụng */}
              <div style={{
                borderTop: '2px dashed var(--border-color, #e2e8f0)',
                paddingTop: '16px',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✍️</span>
                    <span>Nội dung phản hồi của Nhà tuyển dụng:</span>
                  </label>
                  {selectedInquiry.status === 'replied' && (
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                      ✓ Đã phản hồi
                    </span>
                  )}
                </div>

                <textarea
                  rows={4}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Nhập nội dung giải đáp câu hỏi của ứng viên (sau khi lưu, trạng thái sẽ chuyển thành 'Đã phản hồi')..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--bg-secondary, #f8fafc)',
                    color: 'var(--text-primary, #1e293b)',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {/* Nút gửi email qua client mail */}
                  <a
                    href={`mailto:${selectedInquiry.sender_email}?subject=Phản hồi câu hỏi về vị trí ${encodeURIComponent(selectedInquiry.job_title)}&body=${encodeURIComponent(replyText ? replyText : `Kính gửi bạn ${selectedInquiry.sender_name},\n\n`)}`}
                    className="btn btn--outline"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Mở ứng dụng Email gửi trực tiếp
                  </a>

                  {/* Nút lưu phản hồi vào hệ thống */}
                  <button
                    type="button"
                    onClick={handleSaveReply}
                    disabled={savingReply}
                    className="btn btn--primary"
                    style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {savingReply ? 'Đang lưu...' : 'Lưu phản hồi & Đánh dấu đã trả lời'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)', marginTop: '16px' }}>
              <button
                type="button"
                onClick={(e) => handleDelete(selectedInquiry, e)}
                style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#e11d48',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                Xóa liên hệ
              </button>

              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setSelectedInquiry(null)}
                style={{ padding: '8px 18px', borderRadius: '8px' }}
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

