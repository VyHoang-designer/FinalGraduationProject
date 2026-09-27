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

export default function App() {
  const [currentPage, setCurrentPage] = useState('auth');
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  function navigateTo(page, data = null) {
    setCurrentPage(page);
    if (page === 'candidate-detail' && data?.candidateId) {
      setSelectedCandidateId(data.candidateId);
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
    setCurrentUser(null);
    setCurrentPage('auth');
  }

  // Nếu chưa đăng nhập, bắt buộc ở trang Auth
  if (!currentUser || currentPage === 'auth') {
    return <AuthPage onNavigate={navigateTo} onLogin={handleLogin} />;
  }

  // Nếu đang ở trang Candidate Portal
  if (currentPage === 'candidate-portal') {
    return (
      <CandidatePortal 
        currentUser={currentUser} 
        onLogout={handleLogout}
        onNavigate={navigateTo}
      />
    );
  }

  // Mặc định (hoặc nếu là nhà tuyển dụng) -> Render Dashboard Layout
  function renderPage() {
    switch (currentPage) {
      case 'jobs':
        return <JobListingsPage onNavigate={navigateTo} />;
      case 'candidates':
        return <CandidatesPage onNavigate={navigateTo} />;
      case 'candidate-detail':
        return (
          <CandidateDetail
            candidateId={selectedCandidateId}
            onNavigate={navigateTo}
          />
        );
      default:
        return <JobListingsPage onNavigate={navigateTo} />;
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
        <TopBar currentPage={currentPage} />
        <main className="app-content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

