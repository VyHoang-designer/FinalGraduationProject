// ==============================================================================
// FILE: frontend/src/pages/ProfilePage.jsx
// MÔ TẢ: Trang Hồ sơ cá nhân — Xem & chỉnh sửa thông tin cá nhân, đồng bộ
//         thống kê lượt ứng tuyển, lịch phỏng vấn và quản lý CV
// ==============================================================================

import { useState, useEffect } from 'react';
import { 
  fetchMyCVs, 
  fetchCandidateApplications, 
  fetchCandidateInterviews,
  updateUserProfile,
  deleteCandidate,
  getAvatarUrl
} from '../services/api';
import CandidateInterviewModal from '../components/CandidateInterviewModal';
import CVBuilderModal from '../components/CVBuilderModal';

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${timeStr} ngày ${dateStr}`;
  } catch {
    return isoString;
  }
}

function getStatusBadge(status) {
  switch (status) {
    case 'screening':
      return { label: 'Sàng lọc', color: '#b45309', bg: '#fef3c7', border: '#fde68a' };
    case 'interview':
      return { label: 'Phỏng vấn', color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe' };
    case 'offer':
      return { label: 'Offer', color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' };
    case 'hired':
      return { label: 'Đã tuyển', color: '#15803d', bg: '#dcfce7', border: '#86efac' };
    case 'applied':
    default:
      return { label: 'Ứng tuyển', color: '#4338ca', bg: '#e0e7ff', border: '#c7d2fe' };
  }
}

export default function ProfilePage({ currentUser, onUpdateUser, onLogout, onNavigate }) {
  const [cvs, setCvs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'cvs' | 'applications' | 'interviews' | 'settings'

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.full_name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState(null);

  // Modal interview
  const [selectedInterviewForModal, setSelectedInterviewForModal] = useState(null);
  const [isCVBuilderOpen, setIsCVBuilderOpen] = useState(false);

  // Delete CV state
  const [deletingCvId, setDeletingCvId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    if (currentUser?.id) {
      loadProfileData();
      setEditName(currentUser.full_name || '');
      setEditPhone(currentUser.phone || '');
    }

    const handleCVUpdate = () => {
      if (currentUser?.id) {
        loadProfileData();
      }
    };
    window.addEventListener('cv_database_updated', handleCVUpdate);
    return () => {
      window.removeEventListener('cv_database_updated', handleCVUpdate);
    };
  }, [currentUser?.id]);

  async function loadProfileData() {
    setLoading(true);
    try {
      const [cvsData, appsData, intvsData] = await Promise.all([
        fetchMyCVs(currentUser.id).catch(() => []),
        fetchCandidateApplications(currentUser.id).catch(() => []),
        fetchCandidateInterviews(currentUser.id).catch(() => []),
      ]);
      setCvs(cvsData || []);
      setApplications(appsData || []);
      setInterviews(intvsData || []);

      // Tự động đồng bộ avatar cho currentUser nếu chưa có mà trong CV có
      if (!currentUser?.avatar_url && cvsData && cvsData.length > 0) {
        const foundAvatar = cvsData.find(c => c.avatar_url)?.avatar_url;
        if (foundAvatar && onUpdateUser) {
          onUpdateUser({ ...currentUser, avatar_url: foundAvatar });
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu hồ sơ:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCV(cv) {
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ "${cv.full_name}" không?\nThao tác này sẽ xóa vĩnh viễn hồ sơ khỏi hệ thống.`);
    if (!confirmed) return;

    setDeletingCvId(cv.id);
    try {
      await deleteCandidate(cv.id);
      setCvs(prev => prev.filter(c => c.id !== cv.id));
      setToastMsg(`✅ Đã xóa hồ sơ "${cv.full_name}" thành công!`);
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('cv_database_updated'));
    } catch (err) {
      alert('Lỗi khi xóa hồ sơ: ' + (err.message || 'Không thể xóa'));
    } finally {
      setDeletingCvId(null);
    }
  }

  async function handleSaveProfile(e) {
    if (e) e.preventDefault();
    if (!editName.trim()) {
      setProfileErrorMsg('Vui lòng nhập họ và tên.');
      return;
    }

    setSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);
    try {
      const updated = await updateUserProfile(currentUser.id, {
        full_name: editName.trim(),
        phone: editPhone.trim(),
      });
      if (onUpdateUser) {
        onUpdateUser(prev => ({
          ...prev,
          full_name: updated.full_name,
          phone: updated.phone,
        }));
      }
      setIsEditing(false);
      setProfileSuccessMsg('Cập nhật thông tin cá nhân thành công!');
      setTimeout(() => setProfileSuccessMsg(null), 3500);
    } catch (err) {
      setProfileErrorMsg('Lỗi cập nhật: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  function handleSyncFromCV() {
    if (cvs && cvs.length > 0) {
      const latestCv = cvs[0];
      if (latestCv.full_name) setEditName(latestCv.full_name);
      if (latestCv.phone) setEditPhone(latestCv.phone);
      setIsEditing(true);
    }
  }

  function handleInterviewResponded(matchId, response, note) {
    setInterviews(prev => prev.map(inv => 
      inv.match_id === matchId 
        ? { ...inv, interview_info: { ...inv.interview_info, candidate_response: response, candidate_note: note, status: response } }
        : inv
    ));
    setApplications(prev => prev.map(app => 
      app.match_id === matchId 
        ? { ...app, interview_info: { ...app.interview_info, candidate_response: response, candidate_note: note, status: response } }
        : app
    ));
  }

  const initials = currentUser?.full_name
    ? currentUser.full_name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase()
    : 'US';

  const userAvatar = currentUser?.avatar_url || (cvs.length > 0 ? cvs.find(c => c.avatar_url)?.avatar_url : null);
  const roleName = currentUser?.role === 'nha_tuyen_dung' ? 'Nhà tuyển dụng' : 'Ứng viên';
  const pendingInterviewsCount = interviews.filter(inv => !inv.interview_info?.candidate_response).length;

  return (
    <div className="profile-page">
      {/* Back button */}
      <button className="profile-back-btn" onClick={() => onNavigate('candidate-portal')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Quay lại Cổng thông tin việc làm
      </button>

      {/* Profile Header Card */}
      <div className="profile-header-card">
        <div className="profile-header-card__bg"></div>
        <div className="profile-header-card__body">
          <div className="profile-avatar-lg" style={{ overflow: 'hidden' }}>
            {userAvatar ? (
              <img 
                src={getAvatarUrl(userAvatar)} 
                alt={currentUser?.full_name || 'Avatar'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="profile-header-info">
            <h2 className="profile-header-info__name">{currentUser?.full_name || 'Người dùng'}</h2>
            <div className="profile-header-info__meta">
              <span className="profile-role-badge">{roleName}</span>
              <span className="profile-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                {currentUser?.email}
              </span>
              {currentUser?.phone && (
                <span className="profile-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  {currentUser.phone}
                </span>
              )}
            </div>
          </div>
          <div className="profile-header-actions">
            <button className="btn btn--outline btn--sm" onClick={onLogout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button 
          className={`profile-tab ${activeTab === 'info' ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          Thông tin cá nhân
        </button>

        <button 
          className={`profile-tab ${activeTab === 'cvs' ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab('cvs')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Hồ sơ / CV đã tải ({cvs.length})
        </button>

        <button 
          className={`profile-tab ${activeTab === 'applications' ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
          Việc làm đã ứng tuyển ({applications.length})
        </button>

        <button 
          className={`profile-tab ${activeTab === 'interviews' ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab('interviews')}
          style={{ position: 'relative' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Lịch phỏng vấn ({interviews.length})
          {pendingInterviewsCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '10px',
              marginLeft: '6px',
            }}>
              {pendingInterviewsCount}
            </span>
          )}
        </button>

        <button 
          className={`profile-tab ${activeTab === 'settings' ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          Cài đặt
        </button>
      </div>

      {/* Tab Content */}
      <div className="profile-content">

        {/* ========== TAB 1: THÔNG TIN CÁ NHÂN & THỐNG KÊ ========== */}
        {activeTab === 'info' && (
          <div className="profile-info-grid">
            
            {/* THÔNG TIN CƠ BẢN */}
            <div className="profile-info-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="profile-info-card__title" style={{ margin: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Thông tin cơ bản
                </h3>
                {!isEditing ? (
                  <button 
                    className="btn btn--outline btn--sm"
                    onClick={() => {
                      setEditName(currentUser?.full_name || '');
                      setEditPhone(currentUser?.phone || '');
                      setIsEditing(true);
                    }}
                    style={{ fontSize: '0.82rem', padding: '5px 12px' }}
                  >
                    ✏️ Chỉnh sửa
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    Hủy bỏ
                  </button>
                )}
              </div>

              {profileSuccessMsg && (
                <div className="alert alert--success" style={{ marginBottom: '14px', padding: '10px 14px', fontSize: '0.86rem' }}>
                  {profileSuccessMsg}
                </div>
              )}
              {profileErrorMsg && (
                <div className="alert alert--error" style={{ marginBottom: '14px', padding: '10px 14px', fontSize: '0.86rem' }}>
                  {profileErrorMsg}
                </div>
              )}

              {!isEditing ? (
                <div className="profile-info-rows">
                  <div className="profile-info-row">
                    <span className="profile-info-row__label">Họ và tên</span>
                    <span className="profile-info-row__value" style={{ fontWeight: 600 }}>{currentUser?.full_name || '—'}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-row__label">Email</span>
                    <span className="profile-info-row__value">{currentUser?.email || '—'}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-row__label">Số điện thoại</span>
                    <span className="profile-info-row__value">{currentUser?.phone || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-row__label">Vai trò</span>
                    <span className="profile-info-row__value">{roleName}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-row__label">Trạng thái</span>
                    <span className="profile-info-row__value">
                      <span className="status-dot status-dot--active"></span>
                      Đang hoạt động
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' }}>
                      Họ và tên <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      className="input-control" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' }}>
                      Số điện thoại
                    </label>
                    <input 
                      type="text" 
                      className="input-control" 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="0123456789"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="profile-info-row" style={{ padding: '8px 0', borderBottom: 'none' }}>
                    <span className="profile-info-row__label">Email (Không đổi)</span>
                    <span className="profile-info-row__value" style={{ color: '#64748b' }}>{currentUser?.email}</span>
                  </div>

                  {cvs && cvs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSyncFromCV}
                      style={{
                        background: '#f1f5f9',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#4f46e5',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>⚡ Đồng bộ từ CV gần nhất:</span>
                      <strong>{cvs[0].full_name} ({cvs[0].phone || 'không có SĐT'})</strong>
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button 
                      type="button" 
                      className="btn btn--outline btn--sm" 
                      onClick={() => setIsEditing(false)}
                      disabled={savingProfile}
                    >
                      Hủy
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn--primary btn--sm"
                      disabled={savingProfile}
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', border: 'none' }}
                    >
                      {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* THỐNG KÊ HOẠT ĐỘNG (ĐỒNG BỘ THỰC TẾ) */}
            <div className="profile-info-card">
              <h3 className="profile-info-card__title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                Thống kê hoạt động
              </h3>
              <div className="profile-stats-grid">
                
                {/* CV đã tải */}
                <div 
                  className="profile-stat-item" 
                  onClick={() => setActiveTab('cvs')}
                  style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f8fafc'; }}
                  title="Nhấn để xem danh sách CV đã tải"
                >
                  <span className="profile-stat-item__number" style={{ color: '#4f46e5' }}>{cvs.length}</span>
                  <span className="profile-stat-item__label">Hồ sơ / CV đã tải</span>
                </div>

                {/* Lượt ứng tuyển (ĐÃ ĐỒNG BỘ) */}
                <div 
                  className="profile-stat-item"
                  onClick={() => setActiveTab('applications')}
                  style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.background = '#ecfdf5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f8fafc'; }}
                  title="Nhấn để xem các công việc đã ứng tuyển"
                >
                  <span className="profile-stat-item__number" style={{ color: '#059669' }}>{applications.length}</span>
                  <span className="profile-stat-item__label">Lượt ứng tuyển</span>
                </div>

                {/* Phỏng vấn (ĐÃ ĐỒNG BỘ) */}
                <div 
                  className="profile-stat-item"
                  onClick={() => setActiveTab('interviews')}
                  style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent', position: 'relative' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f8fafc'; }}
                  title="Nhấn để xem thư mời phỏng vấn & xác nhận"
                >
                  <span className="profile-stat-item__number" style={{ color: '#2563eb' }}>{interviews.length}</span>
                  <span className="profile-stat-item__label">
                    Phỏng vấn {pendingInterviewsCount > 0 && <strong style={{ color: '#ef4444' }}>({pendingInterviewsCount} mới)</strong>}
                  </span>
                </div>

                {/* Việc đã lưu */}
                <div 
                  className="profile-stat-item"
                  onClick={() => onNavigate('candidate-portal')}
                  style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.background = '#fffbeb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f8fafc'; }}
                  title="Khám phá việc làm tại Cổng thông tin"
                >
                  <span className="profile-stat-item__number" style={{ color: '#d97706' }}>0</span>
                  <span className="profile-stat-item__label">Việc đã lưu</span>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ========== TAB 2: HỒ SƠ / CV ĐÃ TẢI ========== */}
        {activeTab === 'cvs' && (
          <div className="profile-cv-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                Hồ sơ & CV của bạn ({cvs.length})
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn--primary btn--sm"
                  onClick={() => onNavigate('candidate-portal')}
                  style={{ fontSize: '0.84rem' }}
                >
                  + Tải lên CV mới
                </button>
                <button 
                  className="btn cv-btn--ai btn--sm"
                  onClick={() => setIsCVBuilderOpen(true)}
                  style={{ fontSize: '0.84rem' }}
                >
                  ✨ Tạo CV tự động cùng AI
                </button>
              </div>
            </div>

            {toastMsg && (
              <div style={{
                marginBottom: '14px',
                padding: '10px 16px',
                background: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)',
              }}>
                <span>{toastMsg}</span>
              </div>
            )}

            {loading ? (
              <div className="profile-loading">
                <span className="spinner"></span> Đang tải danh sách CV...
              </div>
            ) : cvs.length === 0 ? (
              <div className="profile-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <h3>Chưa có hồ sơ / CV nào</h3>
                <p>Hãy tải lên CV đầu tiên của bạn từ trang <strong>Cổng thông tin</strong> để bắt đầu ứng tuyển.</p>
                <button className="btn btn--primary" onClick={() => onNavigate('candidate-portal')}>
                  Quay lại Cổng thông tin
                </button>
              </div>
            ) : (
              <div className="profile-cv-list">
                {cvs.map(cv => {
                  const cvInitials = cv.full_name ? cv.full_name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase() : 'CV';
                  const cvAvatarSrc = cv.avatar_url || userAvatar;
                  return (
                    <div key={cv.id} className="profile-cv-card">
                      <div className="profile-cv-card__avatar" style={{ overflow: 'hidden' }}>
                        {cvAvatarSrc ? (
                          <img 
                            src={getAvatarUrl(cvAvatarSrc)} 
                            alt={cv.full_name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <span>{cvInitials}</span>
                        )}
                      </div>
                      <div className="profile-cv-card__info">
                        <h4>{cv.full_name}</h4>
                        <p className="profile-cv-card__email">{cv.email || '—'}</p>
                        {cv.education && (
                          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 6px' }}>
                            🎓 {cv.education}
                          </p>
                        )}
                        <div className="profile-cv-card__skills">
                          {(cv.parsed_skills || []).slice(0, 6).map((s, i) => (
                            <span key={i} className="skill-mini">{typeof s === 'string' ? s : s.skill}</span>
                          ))}
                          {(cv.parsed_skills || []).length > 6 && (
                            <span className="skill-mini skill-mini--more">+{cv.parsed_skills.length - 6}</span>
                          )}
                        </div>
                      </div>
                      <div className="profile-cv-card__meta">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="experience-tag">{cv.experience_years} năm KN</span>
                          <button
                            type="button"
                            className="profile-cv-card__delete-btn"
                            onClick={() => handleDeleteCV(cv)}
                            disabled={deletingCvId === cv.id}
                            title="Xóa hồ sơ này"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#e11d48',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#ffe4e6';
                              e.currentTarget.style.borderColor = '#fda4af';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#fff1f2';
                              e.currentTarget.style.borderColor = '#fecdd3';
                            }}
                          >
                            {deletingCvId === cv.id ? (
                              <span className="spinner spinner--sm" style={{ width: 12, height: 12 }} />
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            )}
                            {deletingCvId === cv.id ? 'Đang xóa...' : 'Xóa hồ sơ'}
                          </button>
                        </div>
                        <span className="profile-cv-card__date">
                          {cv.created_at ? new Date(cv.created_at).toLocaleDateString('vi-VN') : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== TAB 3: VIỆC LÀM ĐÃ ỨNG TUYỂN ========== */}
        {activeTab === 'applications' && (
          <div className="profile-cv-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                  💼 Việc làm đã Ứng tuyển ({applications.length})
                </h3>
                <div style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '2px' }}>
                  Theo dõi tiến trình xét duyệt hồ sơ và phản hồi từ các nhà tuyển dụng
                </div>
              </div>
              <button 
                className="btn btn--outline btn--sm"
                onClick={() => onNavigate('candidate-portal')}
                style={{ fontSize: '0.84rem' }}
              >
                🔍 Tìm thêm việc làm
              </button>
            </div>

            {loading ? (
              <div className="profile-loading">
                <span className="spinner"></span> Đang tải danh sách hồ sơ...
              </div>
            ) : applications.length === 0 ? (
              <div className="profile-empty">
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</div>
                <h3>Bạn chưa ứng tuyển công việc nào</h3>
                <p>Khám phá các vị trí tuyển dụng phù hợp với CV của bạn bằng Trí tuệ Nhân tạo.</p>
                <button className="btn btn--primary" onClick={() => onNavigate('candidate-portal')}>
                  Khám phá việc làm ngay
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {applications.map(app => {
                  const badge = getStatusBadge(app.status);
                  const hasInterview = Boolean(app.interview_info);
                  const interview = app.interview_info;
                  const response = interview?.candidate_response;

                  return (
                    <div 
                      key={app.match_id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                              {app.job_title}
                            </h4>
                            <span 
                              style={{
                                padding: '3px 10px',
                                borderRadius: '20px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`
                              }}
                            >
                              Giai đoạn: {badge.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.86rem', color: '#64748b', display: 'flex', gap: '14px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span>🏢 {app.department || 'Công ty Công nghệ'}</span>
                            <span>📍 {app.location || 'Hồ Chí Minh'}</span>
                            <span>🕒 Nộp lúc: {formatDate(app.applied_at)}</span>
                          </div>
                        </div>

                        {/* Điểm AI Match */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: app.match_score >= 70 ? '#10b981' : app.match_score >= 50 ? '#3b82f6' : '#f59e0b', fontFamily: "'JetBrains Mono', monospace" }}>
                            {Math.round(app.match_score || 0)}%
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                            Độ khớp AI ({app.match_level})
                          </div>
                        </div>
                      </div>

                      {/* KHUNG THÔNG BÁO LỊCH PHỎNG VẤN HOẶC TRÚNG TUYỂN */}
                      {app.status === 'hired' ? (
                        <div style={{
                          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                          border: '1.5px solid #a7f3d0',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.6rem' }}>🎉</span>
                            <div>
                              <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.96rem' }}>
                                Chúc mừng! Bạn đã trúng tuyển vào vị trí này
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: '2px' }}>
                                {interview?.message || 'Nhà tuyển dụng đã xác nhận nhận bạn vào làm việc. Vui lòng kiểm tra liên hệ từ HR.'}
                              </div>
                            </div>
                          </div>

                          <button
                            className="btn btn--primary btn--sm"
                            onClick={() => setSelectedInterviewForModal(app)}
                            style={{ fontSize: '0.82rem', padding: '6px 14px', background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', color: '#ffffff', fontWeight: 700 }}
                          >
                            Xem thông báo nhận việc
                          </button>
                        </div>
                      ) : hasInterview && (
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>📅</span>
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.94rem' }}>
                                Lịch phỏng vấn: {interview.scheduled_at ? new Date(interview.scheduled_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa định ngày'}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                                {interview.interview_type} — {interview.location}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {response === 'confirmed' ? (
                              <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                                ✓ Bạn đã xác nhận tham gia
                              </span>
                            ) : response === 'declined' ? (
                              <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
                                ✕ Bạn đã từ chối
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
                                ⏳ Chờ bạn xác nhận
                              </span>
                            )}

                            <button
                              className="btn btn--primary btn--sm"
                              onClick={() => setSelectedInterviewForModal(app)}
                              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                            >
                              Xem thư mời & Phản hồi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== TAB 4: LỊCH PHỎNG VẤN ========== */}
        {activeTab === 'interviews' && (
          <div className="profile-cv-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                  📅 Lịch Phỏng vấn Tuyển dụng ({interviews.length})
                </h3>
                <div style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '2px' }}>
                  Xem thời gian, địa điểm, quy định phỏng vấn và gửi phản hồi xác nhận tham gia
                </div>
              </div>
            </div>

            {loading ? (
              <div className="profile-loading">
                <span className="spinner"></span> Đang tải lịch phỏng vấn...
              </div>
            ) : interviews.length === 0 ? (
              <div className="profile-empty">
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🗓️</div>
                <h3>Chưa có lịch hẹn phỏng vấn nào</h3>
                <p>Khi nhà tuyển dụng lựa chọn hồ sơ của bạn và lên lịch phỏng vấn, thông báo sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {interviews.map(inv => {
                  const info = inv.interview_info || {};
                  const response = info.candidate_response;
                  const isHired = inv.status === 'hired' || info.type === 'hired';

                  return (
                    <div 
                      key={inv.match_id}
                      style={{
                        background: isHired ? '#f0fdf4' : '#ffffff',
                        border: isHired ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '22px',
                        boxShadow: isHired ? '0 4px 16px rgba(16, 185, 129, 0.12)' : '0 2px 10px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.3rem' }}>{isHired ? '🏆' : '✉️'}</span>
                            <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: isHired ? '#065f46' : '#1e293b' }}>
                              {isHired ? `🎉 Trúng tuyển: ${inv.job_title}` : inv.job_title}
                            </h4>
                          </div>
                          <div style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '4px' }}>
                            🏢 {inv.department || 'Công ty Công nghệ'} — {isHired ? 'Quyết định Tuyển dụng & Tiếp nhận' : 'Ban Tuyển dụng'}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isHired ? (
                            <span style={{ fontSize: '0.84rem', padding: '6px 12px', borderRadius: '8px', background: '#bbf7d0', color: '#166534', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              ✓ Đã trúng tuyển (Hired)
                            </span>
                          ) : response === 'confirmed' ? (
                            <span style={{ fontSize: '0.84rem', padding: '6px 12px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              ✓ Đã xác nhận tham gia
                            </span>
                          ) : response === 'declined' ? (
                            <span style={{ fontSize: '0.84rem', padding: '6px 12px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              ✕ Đã từ chối tham gia
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.84rem', padding: '6px 12px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              ⏳ Cần xác nhận đi phỏng vấn
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Thông tin chi tiết */}
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '10px',
                        padding: '14px 18px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '12px',
                        border: '1px solid #f1f5f9',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            {isHired ? 'Ngày nhận việc dự kiến:' : 'Thời gian phỏng vấn:'}
                          </div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: isHired ? '#047857' : '#4338ca', marginTop: '2px' }}>
                            {isHired ? (
                              info.start_date || info.scheduled_at 
                                ? `📅 ${new Date(info.start_date || info.scheduled_at).toLocaleDateString('vi-VN')}`
                                : '📅 Theo thỏa thuận'
                            ) : (
                              `⏰ ${info.scheduled_at ? new Date(info.scheduled_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa định ngày'}`
                            )}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            {isHired ? 'Địa điểm làm việc:' : 'Hình thức & Địa điểm:'}
                          </div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
                            📍 {isHired ? (info.location || 'Tại văn phòng công ty') : `[${info.interview_type || 'Trực tiếp'}] ${info.location}`}
                          </div>
                        </div>

                        {isHired && info.salary_offer && (
                          <div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Mức lương Offer:</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                              💵 {info.salary_offer}
                            </div>
                          </div>
                        )}

                        {!isHired && info.interviewer && (
                          <div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Người liên hệ:</div>
                            <div style={{ fontSize: '0.92rem', color: '#334155', marginTop: '2px' }}>
                              👤 {info.interviewer}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ghi chú / Lời nhắn */}
                      {(info.message || info.note) && isHired && (
                        <div style={{ fontSize: '0.86rem', color: '#065f46', fontStyle: 'italic', background: '#ecfdf5', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                          Lời nhắn nhà tuyển dụng: "{info.message || info.note}"
                        </div>
                      )}

                      {!isHired && info.candidate_note && (
                        <div style={{ fontSize: '0.86rem', color: '#475569', fontStyle: 'italic', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px' }}>
                          Lời nhắn của bạn: "{info.candidate_note}"
                        </div>
                      )}

                      {/* Nút hành động */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button
                          className="btn btn--primary"
                          onClick={() => setSelectedInterviewForModal(inv)}
                          style={{
                            padding: '9px 20px',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isHired
                              ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                              : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                            border: 'none',
                          }}
                        >
                          <span>
                            {isHired 
                              ? 'Xem thư trúng tuyển & quyết định tiếp nhận ➔' 
                              : (response ? 'Xem lại thư mời / Đổi phản hồi' : 'Xem chi tiết & Xác nhận đi phỏng vấn ➔')}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== TAB 5: CÀI ĐẶT ========== */}
        {activeTab === 'settings' && (
          <div className="profile-settings">
            <div className="profile-info-card">
              <h3 className="profile-info-card__title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Bảo mật tài khoản
              </h3>
              <div className="profile-settings-item">
                <div>
                  <strong>Đổi mật khẩu</strong>
                  <p className="text-secondary">Cập nhật mật khẩu đăng nhập của bạn.</p>
                </div>
                <button className="btn btn--outline btn--sm">Đổi mật khẩu</button>
              </div>
              <div className="profile-settings-item">
                <div>
                  <strong>Xóa tài khoản</strong>
                  <p className="text-secondary">Hành động này không thể hoàn tác. Tất cả dữ liệu sẽ bị xóa vĩnh viễn.</p>
                </div>
                <button className="btn btn--danger btn--sm">Xóa tài khoản</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL XÁC NHẬN PHỎNG VẤN CHO ỨNG VIÊN */}
      {selectedInterviewForModal && (
        <CandidateInterviewModal 
          interview={selectedInterviewForModal}
          onClose={() => setSelectedInterviewForModal(null)}
          onResponded={handleInterviewResponded}
        />
      )}

      {/* MODAL TẠO CV TỰ ĐỘNG CÙNG AI */}
      <CVBuilderModal 
        isOpen={isCVBuilderOpen}
        onClose={() => { setIsCVBuilderOpen(false); loadProfileData(); }}
        currentUser={currentUser}
      />
    </div>
  );
}
