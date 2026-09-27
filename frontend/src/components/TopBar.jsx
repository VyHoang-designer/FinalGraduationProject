// ==============================================================================
// FILE: frontend/src/components/TopBar.jsx
// MÔ TẢ: Top bar — Search, Filters, Actions (giống AMIS)
// ==============================================================================

const PAGE_TITLES = {
  jobs: 'Tin tuyển dụng',
  candidates: 'Ứng viên',
  'candidate-detail': 'Chi tiết ứng viên',
  'ai-agent': 'AI Matching',
  reports: 'Báo cáo',
};

export default function TopBar({ currentPage }) {
  return (
    <header className="topbar">
      <h1 className="topbar__title">{PAGE_TITLES[currentPage] || 'Dashboard'}</h1>
      <div className="topbar__search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input type="text" placeholder="Tìm kiếm tin tuyển dụng, ứng viên, nhân tài..." />
      </div>
      <div className="topbar__actions">
        <button className="topbar__icon-btn" title="Thông báo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <button className="topbar__icon-btn" title="Cài đặt">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </button>
        <div className="topbar__avatar">
          <span>HR</span>
        </div>
      </div>
    </header>
  );
}
