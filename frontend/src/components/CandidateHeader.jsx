// ==============================================================================
// FILE: frontend/src/components/CandidateHeader.jsx
// MÔ TẢ: Header trắng dành riêng cho trang Candidate Portal
// ==============================================================================

export default function CandidateHeader({ currentUser, onLogout, onSwitchToEmployer }) {
  return (
    <header className="candidate-header">
      <div className="candidate-header__inner">
        {/* Logo & Navigation */}
        <div className="candidate-header__left">
          <div className="candidate-header__logo">
            <img src="/images/logo.png" alt="AI Matcher Logo" />
            <span className="candidate-header__brand">AI MATCHER</span>
          </div>

          <nav className="candidate-header__nav">
            <a href="#" className="nav-item active">VIỆC LÀM</a>
            <a href="#" className="nav-item">CÔNG TY</a>
            <a href="#" className="nav-item">CV/HỒ SƠ</a>
            <a href="#" className="nav-item">CÔNG CỤ</a>
          </nav>
        </div>

        {/* Search & User Actions */}
        <div className="candidate-header__right">
          <div className="candidate-search">
            <input type="text" placeholder="Nhà tuyển dụng, vị trí tìm kiếm..." />
            <button className="candidate-search__btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>

          <button className="candidate-icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>

          <div className="candidate-user">
            <div className="candidate-user__avatar">
              <img src="https://ui-avatars.com/api/?name=User&background=random" alt="Avatar" />
            </div>
            <div className="candidate-user__info">
              <span className="candidate-user__name">{currentUser?.full_name || 'Người dùng'}</span>
              <span className="candidate-user__status">Đang tìm việc</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            
            {/* Tạm thời gắn sự kiện logout trực tiếp vào avatar để dễ test */}
            <button className="candidate-user__logout-overlay" onClick={onLogout} title="Đăng xuất" />
          </div>

          <button className="btn-switch-employer" onClick={onSwitchToEmployer}>
            NHÀ TUYỂN DỤNG
          </button>
        </div>
      </div>
    </header>
  );
}
