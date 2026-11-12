// ==============================================================================
// FILE: frontend/src/components/CandidateHeader.jsx
// MÔ TẢ: Header trắng dành riêng cho trang Candidate Portal
//         - Nút "NHÀ TUYỂN DỤNG" chỉ hiện cho role === 'nha_tuyen_dung'
//         - Click vào avatar mở dropdown (Hồ sơ cá nhân / Đăng xuất)
// ==============================================================================

import { useState, useRef, useEffect } from 'react';
import { getAvatarUrl, getAssetUrl } from '../services/api';

export default function CandidateHeader({ 
  currentUser, 
  onLogout, 
  onSwitchToEmployer, 
  onNavigateProfile, 
  searchTerm, 
  onSearchChange,
  interviews = [],
  onSelectInterview,
  activeNav = 'jobs',
  onNavigate,
  onOpenCVBuilder,
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const notiRef = useRef(null);

  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }

  const pendingInterviewsCount = (interviews || []).filter(
    inv => (inv.status !== 'hired' && inv.interview_info?.type !== 'hired') && !inv.interview_info?.candidate_response
  ).length;

  const hiredNotificationsCount = (interviews || []).filter(
    inv => inv.status === 'hired' || inv.interview_info?.type === 'hired'
  ).length;

  const totalNotiCount = pendingInterviewsCount + hiredNotificationsCount;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setShowNotiDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = currentUser?.full_name
    ? currentUser.full_name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase()
    : 'US';

  return (
    <header className="candidate-header">
      <div className="candidate-header__inner">
        {/* Logo & Navigation */}
        <div className="candidate-header__left">
          <div 
            className="candidate-header__logo" 
            onClick={() => onNavigate && onNavigate('candidate-portal')}
            style={{ cursor: 'pointer' }}
          >
            <img 
              src={getAssetUrl('/images/logo.png')} 
              alt="AI Matcher Logo" 
              onError={(e) => {
                if (!e.currentTarget.src.includes('/image/logo.png')) {
                  e.currentTarget.src = getAssetUrl('/image/logo.png');
                }
              }}
            />
            <span className="candidate-header__brand">AI MATCHER</span>
          </div>

          <nav className="candidate-header__nav">
            <a 
              href="#" 
              className={`nav-item ${activeNav === 'jobs' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('candidate-portal'); }}
            >
              VIỆC LÀM
            </a>
            <a 
              href="#" 
              className={`nav-item ${activeNav === 'companies' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('companies'); }}
            >
              CÔNG TY
            </a>
            <a 
              href="#" 
              className={`nav-item ${activeNav === 'profile' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('profile'); }}
            >
              CV/HỒ SƠ
            </a>
            <a 
              href="#" 
              className={`nav-item ${activeNav === 'contact' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('contact'); }}
            >
              LIÊN HỆ
            </a>
          </nav>
        </div>

        {/* Search & User Actions */}
        <div className="candidate-header__right">
          <div className="candidate-search">
            <input 
              type="text" 
              placeholder="Nhà tuyển dụng, vị trí tìm kiếm..." 
              value={searchTerm || ''}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            />
            <button className="candidate-search__btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>

          {/* NOTIFICATION BELL */}
          <div style={{ position: 'relative' }} ref={notiRef}>
            <button 
              className="candidate-icon-btn"
              onClick={() => setShowNotiDropdown(!showNotiDropdown)}
              title="Thông báo lịch phỏng vấn"
              style={{ position: 'relative' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {totalNotiCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: hiredNotificationsCount > 0 ? '#10b981' : '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '10px',
                  padding: '1px 6px',
                  lineHeight: '14px',
                  boxShadow: '0 0 0 2px #ffffff',
                }}>
                  {totalNotiCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotiDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '380px',
                background: '#ffffff',
                borderRadius: '14px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                border: '1px solid #e2e8f0',
                zIndex: 1000,
                overflow: 'hidden',
              }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔔</span> Thông báo & Lịch phỏng vấn ({interviews.length})
                  </div>
                  {totalNotiCount > 0 && (
                    <span style={{
                      fontSize: '0.75rem',
                      background: hiredNotificationsCount > 0 ? '#dcfce7' : '#fee2e2',
                      color: hiredNotificationsCount > 0 ? '#15803d' : '#dc2626',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      {hiredNotificationsCount > 0 ? `🎉 ${hiredNotificationsCount} trúng tuyển` : `${pendingInterviewsCount} cần phản hồi`}
                    </span>
                  )}
                </div>

                <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  {interviews.length === 0 ? (
                    <div style={{ padding: '28px 18px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '6px' }}>📭</div>
                      Chưa có thông báo tuyển dụng hoặc lịch phỏng vấn nào
                    </div>
                  ) : (
                    interviews.map((inv) => {
                      const isHiredItem = inv.status === 'hired' || inv.interview_info?.type === 'hired';
                      const response = inv.interview_info?.candidate_response;
                      const isPending = !response && !isHiredItem;

                      if (isHiredItem) {
                        return (
                          <div
                            key={inv.match_id}
                            onClick={() => {
                              setShowNotiDropdown(false);
                              if (onSelectInterview) onSelectInterview(inv);
                            }}
                            style={{
                              padding: '14px 18px',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              background: '#f0fdf4',
                              transition: 'background 0.2s',
                              borderLeft: '4px solid #10b981',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#065f46', flex: 1, paddingRight: '8px' }}>
                                🎉 Trúng tuyển: {inv.job_title}
                              </div>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: '#bbf7d0',
                                color: '#166534',
                                whiteSpace: 'nowrap',
                              }}>
                                ✓ Đã tuyển
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>
                              🏢 {inv.department || 'Nhà tuyển dụng'}
                            </div>
                            {inv.interview_info?.message && (
                              <div style={{ fontSize: '0.79rem', color: '#15803d', fontStyle: 'italic', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                "{inv.interview_info.message}"
                              </div>
                            )}
                            <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                              ✨ Nhà tuyển dụng đã nhận bạn vào làm việc
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={inv.match_id}
                          onClick={() => {
                            setShowNotiDropdown(false);
                            if (onSelectInterview) onSelectInterview(inv);
                          }}
                          style={{
                            padding: '14px 18px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            background: isPending ? '#f8fafc' : '#ffffff',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = isPending ? '#f8fafc' : '#ffffff'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', flex: 1, paddingRight: '8px' }}>
                              {inv.job_title}
                            </div>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: response === 'confirmed' ? '#dcfce7' : response === 'declined' ? '#fee2e2' : '#fef3c7',
                              color: response === 'confirmed' ? '#15803d' : response === 'declined' ? '#b91c1c' : '#b45309',
                              whiteSpace: 'nowrap',
                            }}>
                              {response === 'confirmed' ? '✓ Đã đồng ý' : response === 'declined' ? '✕ Từ chối' : '⏳ Cần xác nhận'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                            🏢 {inv.department || 'Công ty Công nghệ'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 600 }}>
                            ⏰ {inv.interview_info?.scheduled_at ? new Date(inv.interview_info.scheduled_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa định ngày'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* THEME TOGGLE BUTTON */}
          <button 
            className="candidate-icon-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Chuyển sang Giao diện Tối (Dark Mode)' : 'Chuyển sang Giao diện Sáng (Light Mode)'}
          >
            {theme === 'light' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <circle cx="12" cy="12" r="5" fill="#f59e0b" fillOpacity="0.2"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            )}
          </button>

          {/* User Avatar + Dropdown */}
          <div className="candidate-user" ref={dropdownRef}>
            <div 
              className="candidate-user__clickable"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="candidate-user__avatar" style={{ overflow: 'hidden' }}>
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
              <div className="candidate-user__info">
                <span className="candidate-user__name">{currentUser?.full_name || 'Người dùng'}</span>
                <span className="candidate-user__status">Đang tìm việc</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
                className={`candidate-user__chevron ${showDropdown ? 'candidate-user__chevron--open' : ''}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="candidate-user-dropdown">
                <div className="candidate-user-dropdown__header">
                  <div className="candidate-user-dropdown__avatar"><span>{initials}</span></div>
                  <div>
                    <div className="candidate-user-dropdown__name">{currentUser?.full_name || 'Người dùng'}</div>
                    <div className="candidate-user-dropdown__email">{currentUser?.email}</div>
                  </div>
                </div>
                <div className="candidate-user-dropdown__divider"></div>
                <button className="candidate-user-dropdown__item" onClick={() => { setShowDropdown(false); onNavigateProfile && onNavigateProfile(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Hồ sơ cá nhân
                </button>
                <button className="candidate-user-dropdown__item" onClick={() => { setShowDropdown(false); onOpenCVBuilder && onOpenCVBuilder(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Tạo CV tự động cùng AI
                </button>
                <button className="candidate-user-dropdown__item" onClick={() => { setShowDropdown(false); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                  Cài đặt
                </button>
                <div className="candidate-user-dropdown__divider"></div>
                <button className="candidate-user-dropdown__item candidate-user-dropdown__item--danger" onClick={() => { setShowDropdown(false); onLogout(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Đăng xuất
                </button>
              </div>
            )}
          </div>

          {/* ★ Nút NHÀ TUYỂN DỤNG chỉ hiện khi user có role nha_tuyen_dung */}
          {currentUser?.role === 'nha_tuyen_dung' && (
            <button className="btn-switch-employer" onClick={onSwitchToEmployer}>
              NHÀ TUYỂN DỤNG
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
