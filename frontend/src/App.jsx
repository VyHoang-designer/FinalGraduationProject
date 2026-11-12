// ==============================================================================
// FILE: frontend/src/App.jsx
// MÔ TẢ: Root App — Phân luồng giao diện Ứng viên / Nhà tuyển dụng
// ==============================================================================

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import JobListingsPage from './pages/JobListingsPage';
import CandidatesPage from './pages/CandidatesPage';
import CandidateDetail from './pages/CandidateDetail';
import AuthPage from './pages/AuthPage';
import CandidatePortal from './pages/CandidatePortal';
import ProfilePage from './pages/ProfilePage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyManagementPage from './pages/CompanyManagementPage';
import ReportsPage from './pages/ReportsPage';
import ContactPage from './pages/ContactPage';
import InquiriesManagementPage from './pages/InquiriesManagementPage';
import FloatingWidgets from './components/FloatingWidgets';
import { signOutFirebase } from './services/firebase';

const STORAGE_KEY_USER = 'aimatcher_current_user';
const STORAGE_KEY_PAGE = 'aimatcher_current_page';
const STORAGE_KEY_CANDIDATE_ID = 'aimatcher_candidate_id';

export default function App() {
  // 1. Phục hồi thông tin người dùng từ localStorage khi load/refresh trang
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Lỗi đọc currentUser từ localStorage:', e);
      return null;
    }
  });

  // 2. Phục hồi trang hiện tại từ localStorage
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const savedUserStr = localStorage.getItem(STORAGE_KEY_USER);
      const savedPage = localStorage.getItem(STORAGE_KEY_PAGE);
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedPage && savedPage !== 'auth') {
          return savedPage;
        }
        return savedUser?.role === 'ung_tuyen' ? 'candidate-portal' : 'jobs';
      }
      return 'auth';
    } catch (e) {
      console.warn('Lỗi đọc currentPage từ localStorage:', e);
      return 'auth';
    }
  });

  const [selectedCandidateId, setSelectedCandidateId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CANDIDATE_ID);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [contactJobData, setContactJobData] = useState(null);

  // Tự động đồng bộ currentUser vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
      } catch (e) {
        console.warn('Lỗi ghi currentUser vào localStorage:', e);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [currentUser]);

  // Tự động đồng bộ currentPage vào localStorage mỗi khi chuyển trang
  useEffect(() => {
    if (currentPage && currentPage !== 'auth') {
      try {
        localStorage.setItem(STORAGE_KEY_PAGE, currentPage);
      } catch (e) {
        console.warn('Lỗi ghi currentPage vào localStorage:', e);
      }
    } else if (currentPage === 'auth') {
      localStorage.removeItem(STORAGE_KEY_PAGE);
    }
  }, [currentPage]);

  // Đồng bộ selectedCandidateId
  useEffect(() => {
    if (selectedCandidateId) {
      try {
        localStorage.setItem(STORAGE_KEY_CANDIDATE_ID, JSON.stringify(selectedCandidateId));
      } catch {}
    } else {
      localStorage.removeItem(STORAGE_KEY_CANDIDATE_ID);
    }
  }, [selectedCandidateId]);

  function navigateTo(page, data = null) {
    setCurrentPage(page);
    try {
      localStorage.setItem(STORAGE_KEY_PAGE, page);
    } catch {}

    if (page === 'candidate-detail' && data?.candidateId) {
      setSelectedCandidateId(data.candidateId);
      try {
        localStorage.setItem(STORAGE_KEY_CANDIDATE_ID, JSON.stringify(data.candidateId));
      } catch {}
    }
    if (page === 'contact') {
      setContactJobData(data?.job || null);
    }
  }

  function handleLogin(user) {
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } catch {}

    const targetPage = user.role === 'ung_tuyen' ? 'candidate-portal' : 'jobs';
    setCurrentPage(targetPage);
    try {
      localStorage.setItem(STORAGE_KEY_PAGE, targetPage);
    } catch {}
  }

  function handleLogout() {
    signOutFirebase();
    setCurrentUser(null);
    setCurrentPage('auth');
    setGlobalSearchTerm('');
    setSelectedCandidateId(null);
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_PAGE);
      localStorage.removeItem(STORAGE_KEY_CANDIDATE_ID);
    } catch {}
  }

  // Nếu chưa đăng nhập, bắt buộc ở trang Auth
  if (!currentUser || currentPage === 'auth') {
    return <AuthPage onNavigate={navigateTo} onLogin={handleLogin} />;
  }

  // Nếu đang ở trang Profile
  if (currentPage === 'profile') {
    return (
      <>
        <ProfilePage
          currentUser={currentUser}
          onUpdateUser={setCurrentUser}
          onLogout={handleLogout}
          onNavigate={navigateTo}
        />
        <FloatingWidgets currentUser={currentUser} />
      </>
    );
  }

  // Nếu đang ở trang Candidate Portal
  if (currentPage === 'candidate-portal') {
    return (
      <>
        <CandidatePortal 
          currentUser={currentUser} 
          onLogout={handleLogout}
          onNavigate={navigateTo}
        />
        <FloatingWidgets currentUser={currentUser} />
      </>
    );
  }

  // Nếu đang ở trang Danh bạ Doanh nghiệp / Công ty
  if (currentPage === 'companies') {
    return (
      <>
        <CompaniesPage
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigate={navigateTo}
        />
        <FloatingWidgets currentUser={currentUser} />
      </>
    );
  }

  // Nếu đang ở trang Liên hệ / Hỏi đáp Nhà tuyển dụng
  if (currentPage === 'contact') {
    return (
      <>
        <ContactPage
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigate={navigateTo}
          initialJob={contactJobData}
        />
        <FloatingWidgets currentUser={currentUser} />
      </>
    );
  }

  // Mặc định (hoặc nếu là nhà tuyển dụng) -> Render Dashboard Layout
  function renderPage() {
    switch (currentPage) {
      case 'jobs':
        return <JobListingsPage onNavigate={navigateTo} globalSearchTerm={globalSearchTerm} />;
      case 'candidates':
        return <CandidatesPage onNavigate={navigateTo} globalSearchTerm={globalSearchTerm} />;
      case 'company-management':
        return (
          <CompanyManagementPage
            onNavigate={navigateTo}
            currentUser={currentUser}
            globalSearchTerm={globalSearchTerm}
          />
        );
      case 'inquiries':
        return <InquiriesManagementPage onNavigate={navigateTo} globalSearchTerm={globalSearchTerm} />;
      case 'candidate-detail':
        return (
          <CandidateDetail
            candidateId={selectedCandidateId}
            onNavigate={navigateTo}
          />
        );
      case 'reports':
        return <ReportsPage globalSearchTerm={globalSearchTerm} />;
      default:
        return <JobListingsPage onNavigate={navigateTo} globalSearchTerm={globalSearchTerm} />;
    }
  }

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'app-layout--collapsed' : ''}`}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigateTo}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="app-main">
        <TopBar 
          currentPage={currentPage} 
          currentUser={currentUser} 
          onLogout={handleLogout} 
          searchTerm={globalSearchTerm}
          onSearchChange={setGlobalSearchTerm}
          onNavigate={navigateTo}
        />
        <main className="app-content">
          {renderPage()}
        </main>
        <FloatingWidgets currentUser={currentUser} />
      </div>
    </div>
  );
}
