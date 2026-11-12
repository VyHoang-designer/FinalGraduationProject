// ==============================================================================
// FILE: frontend/src/components/Sidebar.jsx
// MÔ TẢ: Left Sidebar Navigation — giống AMIS Tuyển dụng
// ==============================================================================

const NAV_ITEMS = [
  {
    id: 'jobs',
    label: 'Tin tuyển dụng',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
  {
    id: 'candidates',
    label: 'Ứng viên',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'company-management',
    label: 'Quản lý công ty',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2M9 15h2M13 11h2M13 15h2"/>
      </svg>
    ),
  },
  {
    id: 'inquiries',
    label: 'Quản lý liên hệ',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <line x1="9" y1="9" x2="15" y2="9"/>
        <line x1="9" y1="13" x2="13" y2="13"/>
      </svg>
    ),
  },
  { type: 'divider' },
  {
    id: 'ai-agent',
    label: 'AI Matching',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="6" r="1.5" fill="currentColor"/><path d="M9 18l3-3 3 3"/>
      </svg>
    ),
    badge: 'AI',
  },
  {
    id: 'reports',
    label: 'Báo cáo',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
      </svg>
    ),
  },
  { type: 'divider' },
  {
    id: 'auth',
    label: 'Đăng xuất',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
    ),
  },
];

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="url(#grad)" />
            <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <defs><linearGradient id="grad" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#4f46e5"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs>
          </svg>
        </div>
        {!collapsed && (
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">Tuyển dụng</span>
            <span className="sidebar__brand-sub">AI Talent Match</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item, idx) => {
          if (item.type === 'divider') {
            return <div key={idx} className="sidebar__divider" />;
          }
          const isActive = currentPage === item.id ||
            (item.id === 'candidates' && currentPage === 'candidate-detail');
          return (
            <button
              key={item.id}
              className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar__item-icon">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="sidebar__item-label">{item.label}</span>
                  {item.badge && <span className="sidebar__item-badge">{item.badge}</span>}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button className="sidebar__toggle" onClick={onToggle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {collapsed
            ? <><polyline points="9 18 15 12 9 6"/></>
            : <><polyline points="15 18 9 12 15 6"/></>
          }
        </svg>
      </button>
    </aside>
  );
}
