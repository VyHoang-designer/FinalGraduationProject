// ==============================================================================
// FILE: frontend/src/components/TopBar.jsx
// MÔ TẢ: Top bar — Search, Thông báo hoạt động tuyển dụng, Bật/tắt Giao diện Sáng/Tối
// ==============================================================================

import { useState, useEffect, useRef } from 'react';
import { fetchEmployerNotifications, getAvatarUrl } from '../services/api';

const PAGE_TITLES = {
  jobs: 'Tin tuyển dụng',
  candidates: 'Ứng viên',
  'company-management': 'Quản lý công ty',
  inquiries: 'Quản lý liên hệ',
  'candidate-detail': 'Chi tiết ứng viên',
  'ai-agent': 'AI Matching',
  reports: 'Báo cáo',
};

function formatTimeAgo(dateString) {
  if (!dateString) return 'Vừa xong';
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
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

export default function TopBar({ 
  currentPage, 
  currentUser, 
  onLogout, 
  searchTerm, 
  onSearchChange,
  onNavigate 
}) {
  // Theme state: light | dark
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'light';
  });

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const [notiFilter, setNotiFilter] = useState('all'); // 'all' | 'unread'
  const [loadingNoti, setLoadingNoti] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem('employer_read_notis');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  // User menu dropdown
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  const notiRef = useRef(null);
  const userRef = useRef(null);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Load notifications
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 45000); // 45s refresh
    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    try {
      setLoadingNoti(true);
      const data = await fetchEmployerNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.warn("Không thể tải thông báo:", err);
    } finally {
      setLoadingNoti(false);
    }
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setShowNotiDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleTheme() {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }

  function handleMarkAllAsRead() {
    const allIds = new Set([...readIds, ...notifications.map(n => n.id)]);
    setReadIds(allIds);
    localStorage.setItem('employer_read_notis', JSON.stringify(Array.from(allIds)));
  }

  function handleNotificationClick(item) {
    // Mark as read
    const next = new Set(readIds);
    next.add(item.id);
    setReadIds(next);
    localStorage.setItem('employer_read_notis', JSON.stringify(Array.from(next)));
    setShowNotiDropdown(false);

    // Nếu là thông báo liên hệ mới từ ứng viên cho JD
    if (item.type === 'new_inquiry') {
      setSelectedInquiry(item);
      return;
    }

    // Navigate to candidate detail if possible, else candidates list
    if (onNavigate) {
      if (item.candidate_id) {
        onNavigate('candidate-detail', { candidateId: item.candidate_id });
      } else {
        onNavigate('candidates');
      }
    }
  }

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;
  const filteredNotifications = notiFilter === 'unread' 
    ? notifications.filter(n => !readIds.has(n.id))
    : notifications;

  const initials = currentUser?.full_name
    ? currentUser.full_name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase()
    : 'TD';

  return (
    <>
      <header className="topbar">
        <h1 className="topbar__title">{PAGE_TITLES[currentPage] || 'Dashboard'}</h1>
      
      {/* Search Input */}
      <div className="topbar__search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input 
          type="text" 
          placeholder="Tìm kiếm tin tuyển dụng, ứng viên, nhân tài..." 
          value={searchTerm || ''}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
      </div>

      <div className="topbar__actions">
        {/* NÚT THÔNG BÁO (NOTIFICATION BELL) */}
        <div style={{ position: 'relative' }} ref={notiRef}>
          <button 
            className="topbar__icon-btn" 
            title="Thông báo tuyển dụng"
            onClick={() => setShowNotiDropdown(!showNotiDropdown)}
            style={{ position: 'relative' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="topbar-noti-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* DROPDOWN THÔNG BÁO */}
          {showNotiDropdown && (
            <div className="topbar-noti-dropdown">
              <div className="topbar-noti-header">
                <div>
                  <h3 className="topbar-noti-header-title">🔔 Thông báo tuyển dụng</h3>
                  <span className="topbar-noti-header-sub">{unreadCount} thông báo chưa đọc</span>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="topbar-noti-mark-read-btn"
                  >
                    Đã đọc tất cả
                  </button>
                )}
              </div>

              {/* Tabs filter: Tất cả / Chưa đọc */}
              <div className="topbar-noti-tabs">
                <button 
                  className={`topbar-noti-tab ${notiFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setNotiFilter('all')}
                >
                  Tất cả ({notifications.length})
                </button>
                <button 
                  className={`topbar-noti-tab ${notiFilter === 'unread' ? 'active' : ''}`}
                  onClick={() => setNotiFilter('unread')}
                >
                  Chưa đọc ({unreadCount})
                </button>
              </div>

              {/* Danh sách thông báo */}
              <div className="topbar-noti-list">
                {filteredNotifications.length === 0 ? (
                  <div className="topbar-noti-empty">
                    <span style={{ fontSize: '2rem' }}>📭</span>
                    <p>Không có thông báo mới nào</p>
                  </div>
                ) : (
                  filteredNotifications.map((n) => {
                    const isRead = readIds.has(n.id);
                    return (
                      <div 
                        key={n.id}
                        className={`topbar-noti-item ${!isRead ? 'topbar-noti-item--unread' : ''}`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div className="topbar-noti-item-icon">
                          {n.type === 'top_candidate' && '⭐'}
                          {n.type === 'new_application' && '📋'}
                          {n.type === 'interview_confirmed' && '✅'}
                          {n.type === 'interview_declined' && '❌'}
                          {n.type === 'new_inquiry' && '📩'}
                        </div>
                        <div className="topbar-noti-item-content">
                          <div className="topbar-noti-item-title">{n.title}</div>
                          <div className="topbar-noti-item-msg">{n.message}</div>
                          <div className="topbar-noti-item-time">{formatTimeAgo(n.created_at)}</div>
                        </div>
                        {!isRead && <span className="topbar-noti-unread-dot" />}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer dropdown: Xem trang Quản lý liên hệ */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color, #e2e8f0)', textAlign: 'center', background: 'var(--bg-secondary, #f8fafc)' }}>
                <button
                  type="button"
                  onClick={() => { setShowNotiDropdown(false); onNavigate && onNavigate('inquiries'); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>💬 Xem tất cả tin nhắn trong Quản lý liên hệ</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* NÚT BẬT/TẮT NỀN SÁNG TỐI (DARK/LIGHT THEME TOGGLE) */}
        <button 
          className="topbar__icon-btn" 
          onClick={toggleTheme}
          title={theme === 'light' ? 'Chuyển sang Giao diện Tối (Dark Mode)' : 'Chuyển sang Giao diện Sáng (Light Mode)'}
        >
          {theme === 'light' ? (
            /* Biểu tượng Mặt Trăng (Click để sang Dark Mode) */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : (
            /* Biểu tượng Mặt Trời (Click để sang Light Mode) */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8">
              <circle cx="12" cy="12" r="5" fill="#f59e0b" fillOpacity="0.2"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          )}
        </button>

        {/* AVATAR NGƯỜI DÙNG & MENU DROPDOWN */}
        <div style={{ position: 'relative' }} ref={userRef}>
          <div 
            className="topbar__avatar" 
            title={currentUser?.full_name || 'Nhà tuyển dụng'}
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            style={{ cursor: 'pointer', overflow: 'hidden' }}
          >
            {currentUser?.avatar_url ? (
              <img 
                src={getAvatarUrl(currentUser.avatar_url)} 
                alt={currentUser?.full_name || 'Avatar'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {showUserDropdown && (
            <div className="topbar-user-dropdown">
              <div className="topbar-user-dropdown-info">
                <strong>{currentUser?.full_name || 'Nhà tuyển dụng'}</strong>
                <span>{currentUser?.email || 'hr@company.com'}</span>
                <span className="topbar-user-role-badge">Nhà tuyển dụng</span>
              </div>
              <div className="topbar-user-dropdown-divider" />
              <button 
                className="topbar-user-dropdown-item topbar-user-dropdown-item--danger"
                onClick={() => { setShowUserDropdown(false); onLogout && onLogout(); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* MODAL CHI TIẾT LIÊN HỆ TỪ ỨNG VIÊN (Render bên ngoài header để fixed trên toàn màn hình) */}
    {selectedInquiry && (
      <div className="modal-backdrop" onClick={() => setSelectedInquiry(null)}>
        <div className="inquiry-modal-card" onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '16px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>📩</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>Tin nhắn liên hệ từ Ứng viên</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Cho vị trí tuyển dụng: <strong style={{ color: '#2563eb' }}>{selectedInquiry.job_title}</strong></span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedInquiry(null)}
              style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer', padding: '4px' }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ padding: '0 0 10px' }}>
            <div style={{ background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Người gửi:</span>
                  <strong style={{ color: 'var(--text-primary, #1e293b)' }}>{selectedInquiry.candidate_name || 'Ứng viên'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Thời gian gửi:</span>
                  <span style={{ color: 'var(--text-primary, #1e293b)' }}>{formatTimeAgo(selectedInquiry.created_at)}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Email liên hệ:</span>
                  <a href={`mailto:${selectedInquiry.sender_email}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                    {selectedInquiry.sender_email || 'Chưa cung cấp'}
                  </a>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Số điện thoại:</span>
                  <a href={`tel:${selectedInquiry.sender_phone}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                    {selectedInquiry.sender_phone || 'Chưa cung cấp'}
                  </a>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Chủ đề:</span>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary, #1e293b)' }}>
                {selectedInquiry.inquiry_subject || 'Không có tiêu đề'}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Nội dung câu hỏi / liên hệ:</span>
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
                {selectedInquiry.inquiry_message}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => { setSelectedInquiry(null); onNavigate && onNavigate('inquiries'); }}
              style={{ fontSize: '0.84rem' }}
            >
              Xem trang Quản lý liên hệ ➔
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn--outline" 
                onClick={() => setSelectedInquiry(null)}
                style={{ padding: '9px 18px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Đóng
              </button>
              {selectedInquiry.sender_email && (
                <a 
                  className="btn btn--primary"
                  href={`mailto:${selectedInquiry.sender_email}?subject=Phản hồi câu hỏi về vị trí ${encodeURIComponent(selectedInquiry.job_title)}`}
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Gửi email phản hồi
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
