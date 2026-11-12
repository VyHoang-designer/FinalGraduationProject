// ==============================================================================
// FILE: frontend/src/App.jsx
// MÔ TẢ: Root App — Phân luồng giao diện Ứng viên / Nhà tuyển dụng
// ==============================================================================

import { useState } from 'react';
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

export default function App() {
  const [currentPage, setCurrentPage] = useState('auth');
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [contactJobData, setContactJobData] = useState(null);

  function navigateTo(page, data = null) {
    setCurrentPage(page);
    if (page === 'candidate-detail' && data?.candidateId) {
      setSelectedCandidateId(data.candidateId);
    }
    if (page === 'contact') {
      setContactJobData(data?.job || null);
    }
  }

  function handleLogin(user) {
    setCurrentUser(user);
    if (user.role === 'ung_tuyen') {
      setCurrentPage('candidate-portal');
    } else {
      setCurrentPage('jobs');
    }
  }

  function handleLogout() {
    signOutFirebase();
    setCurrentUser(null);
    setCurrentPage('auth');
    setGlobalSearchTerm('');
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
