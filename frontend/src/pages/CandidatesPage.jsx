// ==============================================================================
// FILE: frontend/src/pages/CandidatesPage.jsx
// MÔ TẢ: Phân hệ Quản lý Ứng viên Toàn diện dành cho Nhà tuyển dụng (ATS Standard)
//         - Thống kê tiến độ tuyển dụng (Pipeline Metrics)
//         - Bộ lọc đa chiều: Giai đoạn (Applied/Screening/Interview/Offer/Hired), Vị trí JD, Điểm AI Match
//         - Bảng quản lý ứng viên: Vị trí ứng tuyển, Điểm AI Match, Kỹ năng, Học vấn
//         - Thao tác nhanh: Đổi trạng thái tuyển dụng, Lên lịch phỏng vấn, Phân tích AI, Xóa ứng viên
//         - Modal "+ Thêm ứng viên": Hỗ trợ Tải lên CV (PDF) hoặc Nhập thủ công
// ==============================================================================

import { useState, useEffect, useMemo } from 'react';
import { 
  fetchEmployerCandidates, 
  fetchJobs, 
  updateCandidateStatus, 
  deleteCandidate,
  uploadCV,
  createCandidate,
  getAvatarUrl
} from '../services/api';
import ScheduleInterviewModal from '../components/ScheduleInterviewModal';

const PIPELINE_STAGES = [
  { key: 'all', label: 'Tất cả ứng viên', color: '#475569', bg: '#f1f5f9' },
  { key: 'applied', label: 'Ứng tuyển', color: '#4338ca', bg: '#e0e7ff', border: '#c7d2fe' },
  { key: 'screening', label: 'Sàng lọc', color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  { key: 'interview', label: 'Phỏng vấn', color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe' },
  { key: 'offer', label: 'Offer', color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' },
  { key: 'hired', label: 'Đã tuyển', color: '#15803d', bg: '#dcfce7', border: '#86efac' },
];

function getStatusBadge(status) {
  const stage = PIPELINE_STAGES.find(s => s.key === status) || PIPELINE_STAGES[1];
  return {
    label: stage.label,
    color: stage.color,
    bg: stage.bg,
    border: stage.border || stage.color,
  };
}

function getScoreBadge(score) {
  if (score >= 80) {
    return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', text: `${score}% ⭐ Rất phù hợp` };
  }
  if (score >= 60) {
    return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', text: `${score}% Phù hợp` };
  }
  if (score > 0) {
    return { bg: '#fefce8', color: '#ca8a04', border: '#fef08a', text: `${score}% Cân nhắc` };
  }
  return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', text: 'Chưa đánh giá' };
}

export default function CandidatesPage({ onNavigate, globalSearchTerm }) {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStage, setActiveStage] = useState('all');
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [selectedMatchScoreFilter, setSelectedMatchScoreFilter] = useState('all');
  const [selectedExpFilter, setSelectedExpFilter] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [schedulingData, setSchedulingData] = useState(null); // { job, candidate }
  const [updatingCandidateId, setUpdatingCandidateId] = useState(null);

  // Add Candidate Form
  const [addMode, setAddMode] = useState('upload'); // 'upload' | 'manual'
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [manualForm, setManualForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    experience_years: 1.0,
    education: '',
    parsed_skills_str: '',
    cv_text: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [candidatesData, jobsData] = await Promise.all([
        fetchEmployerCandidates(),
        fetchJobs(false),
      ]);
      setCandidates(candidatesData);
      setJobs(jobsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // Quick Status Change directly from Table
  async function handleStatusChange(candidate, newStatus) {
    const activeApp = candidate.active_application;
    if (!activeApp || !activeApp.jd_id) {
      showToast('⚠️ Ứng viên này chưa được gán vào vị trí tuyển dụng cụ thể.', 'error');
      return;
    }

    try {
      setUpdatingCandidateId(candidate.id);
      await updateCandidateStatus(activeApp.jd_id, candidate.id, newStatus);
      
      // Update local state
      setCandidates(prev => prev.map(c => {
        if (c.id === candidate.id) {
          const updatedActiveApp = { ...c.active_application, status: newStatus };
          return {
            ...c,
            status: newStatus,
            active_application: updatedActiveApp,
            applications: (c.applications || []).map(app => 
              app.jd_id === activeApp.jd_id ? { ...app, status: newStatus } : app
            ),
          };
        }
        return c;
      }));

      const stageName = PIPELINE_STAGES.find(s => s.key === newStatus)?.label || newStatus;
      showToast(`✅ Đã chuyển ứng viên ${candidate.full_name} sang giai đoạn "${stageName}"`);
    } catch (err) {
      showToast(`❌ Lỗi cập nhật trạng thái: ${err.message}`, 'error');
    } finally {
      setUpdatingCandidateId(null);
    }
  }

  // Delete Candidate
  async function handleDeleteCandidate(candidate) {
    const confirmMsg = `Bạn có chắc chắn muốn xóa hồ sơ ứng viên "${candidate.full_name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteCandidate(candidate.id);
      setCandidates(prev => prev.filter(c => c.id !== candidate.id));
      showToast(`🗑️ Đã xóa ứng viên "${candidate.full_name}"`);
    } catch (err) {
      showToast(`❌ Lỗi xóa ứng viên: ${err.message}`, 'error');
    }
  }

  // Handle Schedule Interview
  function openScheduleInterview(candidate) {
    const activeApp = candidate.active_application;
    let jobObj = jobs.find(j => j.id === activeApp?.jd_id);
    if (!jobObj && jobs.length > 0) {
      jobObj = jobs[0];
    }

    setSchedulingData({
      job: jobObj || { id: activeApp?.jd_id || 1, title: candidate.applied_job_title, department: candidate.department },
      candidate: {
        cv_id: candidate.id,
        full_name: candidate.full_name,
        email: candidate.email,
        interview_info: candidate.interview_info || activeApp?.interview_info,
      },
    });
  }

  // Handle Add Candidate (Upload or Manual)
  async function handleAddCandidateSubmit(e) {
    e.preventDefault();
    if (addMode === 'upload') {
      if (!uploadFile) {
        showToast('⚠️ Vui lòng chọn file CV (PDF)', 'error');
        return;
      }
      try {
        setUploading(true);
        // Upload CV (user_id = 1 hoặc admin)
        await uploadCV(1, uploadFile);
        showToast('🎉 Tải lên và phân tích CV bằng AI thành công!');
        setIsAddModalOpen(false);
        setUploadFile(null);
        await loadData();
      } catch (err) {
        showToast(`❌ Lỗi tải lên: ${err.message}`, 'error');
      } finally {
        setUploading(false);
      }
    } else {
      // Manual Add
      if (!manualForm.full_name.trim()) {
        showToast('⚠️ Vui lòng nhập họ và tên ứng viên', 'error');
        return;
      }
      try {
        setUploading(true);
        const skills = manualForm.parsed_skills_str
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(Boolean);

        await createCandidate({
          full_name: manualForm.full_name.trim(),
          email: manualForm.email.trim() || null,
          phone: manualForm.phone.trim() || null,
          experience_years: parseFloat(manualForm.experience_years) || 0,
          education: manualForm.education.trim() || null,
          parsed_skills: skills,
          cv_text: manualForm.cv_text.trim() || `Hồ sơ ứng viên: ${manualForm.full_name}`,
        });

        showToast('✅ Đã thêm ứng viên thủ công thành công!');
        setIsAddModalOpen(false);
        setManualForm({
          full_name: '',
          email: '',
          phone: '',
          experience_years: 1.0,
          education: '',
          parsed_skills_str: '',
          cv_text: '',
        });
        await loadData();
      } catch (err) {
        showToast(`❌ Lỗi tạo ứng viên: ${err.message}`, 'error');
      } finally {
        setUploading(false);
      }
    }
  }

  // Pipeline Counts for Summary Cards & Tabs
  const stageCounts = useMemo(() => {
    const counts = { all: candidates.length, applied: 0, screening: 0, interview: 0, offer: 0, hired: 0 };
    candidates.forEach(c => {
      const st = c.status || 'applied';
      if (counts[st] !== undefined) counts[st]++;
    });
    return counts;
  }, [candidates]);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      // Stage Tab
      if (activeStage !== 'all' && c.status !== activeStage) return false;

      // Job Filter
      if (selectedJobId !== 'all') {
        const matchesJob = (c.applications || []).some(a => a.jd_id === Number(selectedJobId)) ||
                           c.applied_jd_id === Number(selectedJobId);
        if (!matchesJob) return false;
      }

      // Match Score Filter
      if (selectedMatchScoreFilter === 'high' && c.match_score < 80) return false;
      if (selectedMatchScoreFilter === 'medium' && (c.match_score < 60 || c.match_score >= 80)) return false;
      if (selectedMatchScoreFilter === 'low' && c.match_score >= 60) return false;

      // Experience Filter
      const exp = c.experience_years || 0;
      if (selectedExpFilter === 'entry' && exp > 1) return false;
      if (selectedExpFilter === 'mid' && (exp < 1 || exp > 3)) return false;
      if (selectedExpFilter === 'senior' && exp < 3) return false;

      // Search Query
      const combinedSearch = ((globalSearchTerm || '') + ' ' + (searchTerm || '')).trim().toLowerCase();
      if (combinedSearch) {
        const text = `${c.full_name} ${c.email || ''} ${c.phone || ''} ${c.applied_job_title || ''} ${(c.parsed_skills || []).join(' ')}`.toLowerCase();
        const keywords = combinedSearch.split(/\s+/);
        if (!keywords.every(kw => text.includes(kw))) return false;
      }

      return true;
    });
  }, [candidates, activeStage, selectedJobId, selectedMatchScoreFilter, selectedExpFilter, searchTerm, globalSearchTerm]);

  if (loading) {
    return (
      <div className="page-state" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
        <p>Đang tải danh sách quản lý ứng viên & quy trình tuyển dụng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-state page-state--error">
        <span className="page-state__icon">⚠️</span>
        <h3>Lỗi kết nối dữ liệu ứng viên</h3>
        <p>{error}</p>
        <button className="btn btn--primary" onClick={loadData}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className="candidates-management-page" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            padding: '12px 22px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 99999,
            fontWeight: 600,
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>👥</span>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              Quản lý Ứng viên & Tiến độ Tuyển dụng
            </h2>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Theo dõi ứng viên theo vị trí ứng tuyển, đánh giá mức độ phù hợp AI, đổi trạng thái và lên lịch phỏng vấn.
          </p>
        </div>

        <button 
          className="btn btn--primary" 
          onClick={() => setIsAddModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontWeight: 700 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Thêm ứng viên mới
        </button>
      </div>

      {/* PIPELINE METRICS SUMMARY CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {/* Card: Tổng ứng viên */}
        <div 
          onClick={() => setActiveStage('all')}
          style={{
            background: activeStage === 'all' ? '#eef2ff' : '#ffffff',
            border: `1.5px solid ${activeStage === 'all' ? '#6366f1' : '#e2e8f0'}`,
            borderRadius: '14px',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Tổng số hồ sơ</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
            {stageCounts.all}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600, marginTop: '2px' }}>
            Tất cả ứng viên
          </div>
        </div>

        {/* Card: Mới ứng tuyển */}
        <div 
          onClick={() => setActiveStage('applied')}
          style={{
            background: activeStage === 'applied' ? '#e0e7ff' : '#ffffff',
            border: `1.5px solid ${activeStage === 'applied' ? '#4f46e5' : '#e2e8f0'}`,
            borderRadius: '14px',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4338ca' }}>📥 Mới ứng tuyển</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#3730a3', marginTop: '4px' }}>
            {stageCounts.applied}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Chờ HR xử lý</div>
        </div>

        {/* Card: Đang sàng lọc */}
        <div 
          onClick={() => setActiveStage('screening')}
          style={{
            background: activeStage === 'screening' ? '#fef3c7' : '#ffffff',
            border: `1.5px solid ${activeStage === 'screening' ? '#f59e0b' : '#e2e8f0'}`,
            borderRadius: '14px',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#b45309' }}>🔍 Đang sàng lọc</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>
            {stageCounts.screening}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Đánh giá CV & Match</div>
        </div>

        {/* Card: Lên lịch phỏng vấn */}
        <div 
          onClick={() => setActiveStage('interview')}
          style={{
            background: activeStage === 'interview' ? '#dbeafe' : '#ffffff',
            border: `1.5px solid ${activeStage === 'interview' ? '#3b82f6' : '#e2e8f0'}`,
            borderRadius: '14px',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1d4ed8' }}>⏰ Đang phỏng vấn</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e40af', marginTop: '4px' }}>
            {stageCounts.interview}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Đã gửi thư mời</div>
        </div>

        {/* Card: Đã tuyển */}
        <div 
          onClick={() => setActiveStage('hired')}
          style={{
            background: activeStage === 'hired' ? '#dcfce7' : '#ffffff',
            border: `1.5px solid ${activeStage === 'hired' ? '#10b981' : '#e2e8f0'}`,
            borderRadius: '14px',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#15803d' }}>🎉 Đã tuyển / Offer</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#166534', marginTop: '4px' }}>
            {stageCounts.offer + stageCounts.hired}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Trúng tuyển</div>
        </div>
      </div>

      {/* FILTER & CONTROL TOOLBAR */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '18px 22px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        marginBottom: '20px',
      }}>
        {/* Row 1: Pipeline Stage Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
          {PIPELINE_STAGES.map(stage => {
            const isActive = activeStage === stage.key;
            const count = stageCounts[stage.key] !== undefined ? stageCounts[stage.key] : (stage.key === 'all' ? candidates.length : 0);
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => setActiveStage(stage.key)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '20px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isActive ? (stage.bg || '#4f46e5') : '#ffffff',
                  color: isActive ? (stage.color || '#ffffff') : '#64748b',
                  borderColor: isActive ? (stage.border || '#4f46e5') : '#e2e8f0',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <span>{stage.label}</span>
                <span style={{
                  background: isActive ? 'rgba(0,0,0,0.1)' : '#f1f5f9',
                  padding: '1px 7px',
                  borderRadius: '10px',
                  fontSize: '0.76rem',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Search + Select Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', paddingTop: '14px' }}>
          {/* Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 14px', flex: '1 1 280px', maxWidth: '380px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm theo tên, email, kỹ năng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.88rem', color: '#1e293b' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Lọc theo Vị trí tuyển dụng */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: '#475569' }}>
              <span>Vị trí:</span>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', outline: 'none', background: '#ffffff', fontWeight: 600 }}
              >
                <option value="all">Tất cả vị trí ({jobs.length})</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>

            {/* Lọc theo Điểm AI Match */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: '#475569' }}>
              <span>AI Match:</span>
              <select
                value={selectedMatchScoreFilter}
                onChange={(e) => setSelectedMatchScoreFilter(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', outline: 'none', background: '#ffffff', fontWeight: 600 }}
              >
                <option value="all">Tất cả điểm số</option>
                <option value="high">⭐ Rất phù hợp (&ge; 80%)</option>
                <option value="medium">✓ Phù hợp (60% - 79%)</option>
                <option value="low">⏳ Cân nhắc (&lt; 60%)</option>
              </select>
            </div>

            {/* Lọc theo Kinh nghiệm */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: '#475569' }}>
              <span>Kinh nghiệm:</span>
              <select
                value={selectedExpFilter}
                onChange={(e) => setSelectedExpFilter(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', outline: 'none', background: '#ffffff', fontWeight: 600 }}
              >
                <option value="all">Tất cả</option>
                <option value="entry">&le; 1 năm</option>
                <option value="mid">1 - 3 năm</option>
                <option value="senior">&gt; 3 năm</option>
              </select>
            </div>

            {/* Đếm số lượng */}
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginLeft: '6px' }}>
              Hiển thị {filteredCandidates.length}/{candidates.length}
            </span>
          </div>
        </div>
      </div>

      {/* CANDIDATES TABLE */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
      }}>
        {filteredCandidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔍</div>
            <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>Không tìm thấy ứng viên phù hợp</h4>
            <p style={{ margin: 0, fontSize: '0.88rem' }}>Vui lòng thay đổi từ khóa hoặc bộ lọc giai đoạn tuyển dụng.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="candidates-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 20px' }}>Ứng viên</th>
                  <th style={{ padding: '14px 16px' }}>Vị trí ứng tuyển</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Điểm AI Match</th>
                  <th style={{ padding: '14px 16px' }}>Kinh nghiệm & Học vấn</th>
                  <th style={{ padding: '14px 16px' }}>Kỹ năng nổi bật</th>
                  <th style={{ padding: '14px 16px' }}>Giai đoạn tuyển dụng</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map(c => {
                  const initials = c.full_name
                    ? c.full_name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase()
                    : 'UV';
                  const scoreInfo = getScoreBadge(c.match_score);
                  const isUpdating = updatingCandidateId === c.id;

                  return (
                    <tr 
                      key={c.id} 
                      className="candidates-table__row"
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    >
                      {/* Cột 1: Thông tin ứng viên */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div 
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              flexShrink: 0,
                              overflow: 'hidden',
                              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.2)',
                            }}
                          >
                            {c.avatar_url ? (
                              <img 
                                src={getAvatarUrl(c.avatar_url)} 
                                alt={c.full_name} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div>
                            <div 
                              style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', cursor: 'pointer' }}
                              onClick={() => onNavigate('candidate-detail', { candidateId: c.id })}
                            >
                              {c.full_name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                              {c.email || '—'}
                            </div>
                            {c.phone && (
                              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                📞 {c.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Vị trí ứng tuyển & Công ty */}
                      <td style={{ padding: '16px 16px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                            {c.applied_job_title}
                          </div>
                          {c.department && (
                            <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600, marginTop: '2px' }}>
                              🏢 {c.department}
                            </div>
                          )}
                          {c.active_application?.applied_at && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                              Nộp: {new Date(c.active_application.applied_at).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cột 3: Điểm AI Match */}
                      <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                        <span 
                          style={{
                            display: 'inline-block',
                            background: scoreInfo.bg,
                            color: scoreInfo.color,
                            border: `1px solid ${scoreInfo.border}`,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {scoreInfo.text}
                        </span>
                      </td>

                      {/* Cột 4: Kinh nghiệm & Học vấn */}
                      <td style={{ padding: '16px 16px' }}>
                        <div>
                          <span className="experience-tag" style={{ fontSize: '0.82rem', padding: '3px 8px' }}>
                            {c.experience_years ? `${c.experience_years} năm` : '0 năm'}
                          </span>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', maxWidth: '180px', lineHeight: '1.3' }}>
                            {c.education || '—'}
                          </div>
                        </div>
                      </td>

                      {/* Cột 5: Kỹ năng */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '200px' }}>
                          {(c.parsed_skills || []).slice(0, 3).map((s, idx) => (
                            <span key={idx} className="skill-mini" style={{ fontSize: '0.76rem', padding: '2px 7px' }}>
                              {s}
                            </span>
                          ))}
                          {(c.parsed_skills || []).length > 3 && (
                            <span className="skill-mini skill-mini--more" style={{ fontSize: '0.74rem' }}>
                              +{c.parsed_skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột 6: Giai đoạn tuyển dụng (Dropdown thay đổi trực tiếp) */}
                      <td style={{ padding: '16px 16px' }}>
                        <div>
                          <select
                            value={c.status || 'applied'}
                            onChange={(e) => handleStatusChange(c, e.target.value)}
                            disabled={isUpdating}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: `1.5px solid ${getStatusBadge(c.status).border}`,
                              background: getStatusBadge(c.status).bg,
                              color: getStatusBadge(c.status).color,
                              outline: 'none',
                            }}
                          >
                            <option value="applied">📥 Ứng tuyển</option>
                            <option value="screening">🔍 Sàng lọc</option>
                            <option value="interview">⏰ Phỏng vấn</option>
                            <option value="offer">⭐ Đề nghị (Offer)</option>
                            <option value="hired">🎉 Đã tuyển</option>
                          </select>

                          {/* Badge Lịch phỏng vấn nếu có */}
                          {c.interview_info?.scheduled_at && (
                            <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#1d4ed8', background: '#eff6ff', padding: '3px 6px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                              📅 {new Date(c.interview_info.scheduled_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                              {c.interview_info.candidate_response === 'confirmed' && (
                                <span style={{ color: '#059669', fontWeight: 700, marginLeft: '4px' }}>✓ Đã nhận</span>
                              )}
                              {c.interview_info.candidate_response === 'declined' && (
                                <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: '4px' }}>✕ Từ chối</span>
                              )}
                              {!c.interview_info.candidate_response && (
                                <span style={{ color: '#d97706', marginLeft: '4px' }}>⏳ Chờ</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cột 7: Thao tác hành động */}
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Nút Lên lịch phỏng vấn */}
                          <button
                            type="button"
                            className="btn btn--sm btn--outline"
                            onClick={() => openScheduleInterview(c)}
                            title="Lên lịch hẹn phỏng vấn & gửi thông báo"
                            style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}
                          >
                            📅 Lịch hẹn
                          </button>

                          {/* Nút Phân tích AI */}
                          <button
                            type="button"
                            className="btn btn--sm btn--primary"
                            onClick={() => onNavigate('candidate-detail', { candidateId: c.id })}
                            title="Mở hồ sơ & phân tích đối sánh AI"
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                          >
                            🪄 Phân tích AI
                          </button>

                          {/* Nút Xóa hồ sơ */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCandidate(c)}
                            title="Xóa ứng viên khỏi hệ thống"
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', fontSize: '0.9rem' }}
                          >
                            🗑️
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

      {/* MODAL LÊN LỊCH PHỎNG VẤN */}
      {schedulingData && (
        <ScheduleInterviewModal
          job={schedulingData.job}
          candidate={schedulingData.candidate}
          onClose={() => setSchedulingData(null)}
          onSuccess={() => {
            showToast('🎉 Đã lên lịch phỏng vấn và gửi thông báo thành công!');
            setSchedulingData(null);
            loadData();
          }}
        />
      )}

      {/* MODAL THÊM ỨNG VIÊN MỚI */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)} style={{ zIndex: 12000 }}>
          <div 
            className="modal-content"
            style={{ maxWidth: '580px', width: '92%', borderRadius: '18px', padding: '26px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>➕</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
                  Thêm Hồ sơ Ứng viên Mới
                </h3>
              </div>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setAddMode('upload')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  background: addMode === 'upload' ? '#ffffff' : 'transparent',
                  color: addMode === 'upload' ? '#4f46e5' : '#64748b',
                  boxShadow: addMode === 'upload' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                📄 Tải lên file CV (PDF - Tự động trích xuất AI)
              </button>
              <button
                type="button"
                onClick={() => setAddMode('manual')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  background: addMode === 'manual' ? '#ffffff' : 'transparent',
                  color: addMode === 'manual' ? '#4f46e5' : '#64748b',
                  boxShadow: addMode === 'manual' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                ✍️ Nhập thông tin thủ công
              </button>
            </div>

            <form onSubmit={handleAddCandidateSubmit}>
              {addMode === 'upload' ? (
                <div>
                  <div style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '14px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    marginBottom: '16px',
                  }}>
                    <input 
                      type="file" 
                      accept=".pdf" 
                      id="cv-upload-input"
                      style={{ display: 'none' }}
                      onChange={(e) => setUploadFile(e.target.files[0] || null)}
                    />
                    <label htmlFor="cv-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📤</div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                        {uploadFile ? uploadFile.name : 'Bấm để chọn file CV (định dạng PDF)'}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                        Hệ thống sẽ dùng AI đọc hiểu, tự động bóc tách kỹ năng, kinh nghiệm và học vấn.
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Họ và tên ứng viên *
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      value={manualForm.full_name}
                      onChange={(e) => setManualForm(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="VD: Nguyễn Văn A"
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Email liên hệ
                      </label>
                      <input
                        type="email"
                        className="input-control"
                        value={manualForm.email}
                        onChange={(e) => setManualForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Số điện thoại
                      </label>
                      <input
                        type="text"
                        className="input-control"
                        value={manualForm.phone}
                        onChange={(e) => setManualForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="0912345678"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Số năm kinh nghiệm
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className="input-control"
                        value={manualForm.experience_years}
                        onChange={(e) => setManualForm(prev => ({ ...prev, experience_years: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Học vấn / Trường học
                      </label>
                      <input
                        type="text"
                        className="input-control"
                        value={manualForm.education}
                        onChange={(e) => setManualForm(prev => ({ ...prev, education: e.target.value }))}
                        placeholder="VD: Cử nhân CNTT - ĐH Bách Khoa"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Kỹ năng chính (ngăn cách bằng dấu phẩy)
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      value={manualForm.parsed_skills_str}
                      onChange={(e) => setManualForm(prev => ({ ...prev, parsed_skills_str: e.target.value }))}
                      placeholder="VD: python, fastapi, docker, postgresql"
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={uploading}
                  style={{ padding: '10px 24px', fontWeight: 700 }}
                >
                  {uploading ? 'Đang xử lý...' : '✓ Thêm ứng viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
