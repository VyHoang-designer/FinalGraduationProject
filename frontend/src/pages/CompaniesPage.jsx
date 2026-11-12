// ==============================================================================
// FILE: frontend/src/pages/CompaniesPage.jsx
// MÔ TẢ: Trang Danh bạ Doanh nghiệp / Công ty (Tab CÔNG TY)
//         - Tìm kiếm, lọc theo Địa điểm, Ngành nghề, Quy mô
//         - Danh sách thẻ Công ty với số lượng việc làm đang tuyển
//         - Xem chi tiết công ty và ứng tuyển ngay bằng AI
// ==============================================================================

import { useState, useEffect, useMemo } from 'react';
import CandidateHeader from '../components/CandidateHeader';
import CompanyDetailModal from '../components/CompanyDetailModal';
import ApplyAIModal from '../components/ApplyAIModal';
import CandidateInterviewModal from '../components/CandidateInterviewModal';
import { fetchCompanies, fetchCandidateInterviews, getAssetUrl } from '../services/api';

const INDUSTRY_FILTERS = [
  { key: 'all', label: 'Tất cả lĩnh vực' },
  { key: 'Trí tuệ Nhân tạo', label: '🤖 AI & Deep Learning' },
  { key: 'Fintech', label: '💳 Fintech & Tài chính' },
  { key: 'Phần mềm', label: '💻 Phần mềm & SaaS' },
  { key: 'Internet', label: '🌐 Internet & Cloud' },
  { key: 'Viễn thông', label: '📡 Viễn thông & Số' },
];

const LOCATION_FILTERS = [
  { key: 'all', label: 'Toàn quốc' },
  { key: 'Hồ Chí Minh', label: 'TP. Hồ Chí Minh' },
  { key: 'Hà Nội', label: 'Hà Nội' },
  { key: 'Đà Nẵng', label: 'Đà Nẵng' },
];

export default function CompaniesPage({ currentUser, onLogout, onNavigate }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Modals
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [selectedInterviewForModal, setSelectedInterviewForModal] = useState(null);

  useEffect(() => {
    loadCompanies();
    if (currentUser?.id) {
      loadInterviews();
    }
  }, [selectedIndustry, selectedLocation]);

  async function loadCompanies() {
    setLoading(true);
    try {
      const data = await fetchCompanies({
        industry: selectedIndustry,
        location: selectedLocation,
      });
      setCompanies(data);
    } catch (err) {
      console.error('Lỗi tải danh sách công ty:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadInterviews() {
    try {
      const data = await fetchCandidateInterviews(currentUser.id);
      setInterviews(data || []);
    } catch (err) {
      console.error('Lỗi tải lịch phỏng vấn:', err);
    }
  }

  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return companies;
    const lower = searchTerm.toLowerCase();
    return companies.filter(c => 
      c.name.toLowerCase().includes(lower) ||
      (c.tagline && c.tagline.toLowerCase().includes(lower)) ||
      (c.industry && c.industry.toLowerCase().includes(lower)) ||
      (c.location && c.location.toLowerCase().includes(lower))
    );
  }, [companies, searchTerm]);

  return (
    <div className="candidate-portal-layout">
      {/* HEADER */}
      <CandidateHeader 
        currentUser={currentUser} 
        onLogout={onLogout} 
        onSwitchToEmployer={() => onNavigate('jobs')}
        onNavigateProfile={() => onNavigate('profile')}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        interviews={interviews}
        onSelectInterview={setSelectedInterviewForModal}
        activeNav="companies"
        onNavigate={onNavigate}
      />

      <div className="candidate-portal-content">
        
        {/* HERO BANNER DOANH NGHIỆP */}
        <div style={{
          margin: '24px 24px 0',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          color: '#ffffff',
          padding: '48px 40px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(49, 46, 129, 0.25)',
        }}>
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '5px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '14px', backdropFilter: 'blur(8px)' }}>
              <span>🏢</span>
              <span>DANH BẠ CÔNG TY CÔNG NGHỆ</span>
            </div>
            <h1 style={{ margin: '0 0 12px', fontSize: '2.1rem', fontWeight: 800, lineHeight: '1.25' }}>
              Khám phá Doanh nghiệp Hàng đầu & Môi trường Lý tưởng
            </h1>
            <p style={{ margin: '0 0 24px', fontSize: '1rem', color: '#c7d2fe', lineHeight: '1.5' }}>
              Tìm hiểu văn hóa, chế độ phúc lợi và các vị trí tuyển dụng hot nhất từ các tập đoàn công nghệ & kỳ lân đổi mới sáng tạo tại Việt Nam.
            </p>

            {/* SEARCH INPUT TRONG BANNER */}
            <div style={{ display: 'flex', gap: '10px', background: '#ffffff', borderRadius: '12px', padding: '6px', maxWidth: '520px', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
              <input
                type="text"
                placeholder="Nhập tên công ty, công nghệ cốt lõi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '10px 16px',
                  fontSize: '0.94rem',
                  color: '#1e293b',
                  borderRadius: '8px',
                }}
              />
              <button 
                className="btn btn--primary"
                style={{ padding: '10px 22px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '8px' }}
              >
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>

        {/* SECTION BỘ LỌC */}
        <div style={{ margin: '28px 24px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Lọc Lĩnh Vực */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {INDUSTRY_FILTERS.map(f => {
              const isActive = selectedIndustry === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setSelectedIndustry(f.key)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isActive ? '#4f46e5' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    borderColor: isActive ? '#4f46e5' : '#cbd5e1',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 4px 10px rgba(79, 70, 229, 0.25)' : 'none',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Lọc Địa Điểm & Đếm Kết Quả */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Khu vực:</span>
              {LOCATION_FILTERS.map(loc => {
                const isActive = selectedLocation === loc.key;
                return (
                  <button
                    key={loc.key}
                    onClick={() => setSelectedLocation(loc.key)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      border: '1px solid',
                      cursor: 'pointer',
                      background: isActive ? '#e0e7ff' : '#f8fafc',
                      color: isActive ? '#3730a3' : '#64748b',
                      borderColor: isActive ? '#c7d2fe' : '#e2e8f0',
                    }}
                  >
                    {loc.label}
                  </button>
                );
              })}
            </div>

            <span style={{ fontSize: '0.88rem', color: '#64748b' }}>
              Tìm thấy <strong>{filteredCompanies.length}</strong> doanh nghiệp
            </span>
          </div>
        </div>

        {/* DANH SÁCH THẺ CÔNG TY (GRID) */}
        <div style={{ margin: '24px', minHeight: '380px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <span className="spinner" style={{ marginBottom: '12px' }} />
              <div>Đang tải danh sách doanh nghiệp...</div>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🏢</div>
              <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>Không tìm thấy công ty phù hợp</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                Vui lòng thử lại với từ khóa hoặc bộ lọc khu vực khác.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '22px' }}>
              {filteredCompanies.map(c => (
                <div 
                  key={c.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                    transition: 'all 0.25s',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#c7d2fe';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                  onClick={() => setSelectedCompanyId(c.id)}
                >
                  {/* Card Cover Banner */}
                  <div style={{ height: '90px', background: '#1e293b', position: 'relative', overflow: 'hidden' }}>
                    <img 
                      src={getAssetUrl(c.cover_image) || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=200&fit=crop"} 
                      alt={c.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                    />
                    {/* Rating Badge */}
                    <div style={{ position: 'absolute', top: '10px', right: '12px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: '#fef3c7', padding: '3px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700 }}>
                      ⭐ {c.rating || 4.8}
                    </div>
                  </div>

                  {/* Card Body with Overlapping Logo */}
                  <div style={{ padding: '0 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', marginTop: '-32px', position: 'relative', zIndex: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px', position: 'relative', zIndex: 10 }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: '3px solid #ffffff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 10,
                      }}>
                        <img 
                          src={c.logo || `https://ui-avatars.com/api/?name=${c.name}&background=random&size=128`} 
                          alt={c.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      <span style={{
                        background: c.active_jobs_count > 0 ? '#ecfdf5' : '#f1f5f9',
                        color: c.active_jobs_count > 0 ? '#059669' : '#64748b',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: `1px solid ${c.active_jobs_count > 0 ? '#a7f3d0' : '#e2e8f0'}`,
                      }}>
                        {c.active_jobs_count > 0 ? `🔥 ${c.active_jobs_count} việc đang tuyển` : 'Tạm dừng tuyển'}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                      {c.name}
                    </h3>
                    <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: '#64748b', lineHeight: '1.45', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.tagline || c.description || 'Doanh nghiệp Công nghệ hàng đầu'}
                    </p>

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: '#475569', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>📍 {c.location || 'Chưa cập nhật'}</span>
                        <span>👥 {c.company_size || '100-500'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ color: '#4f46e5', fontWeight: 600 }}>{c.industry}</span>
                        <span style={{ color: '#4f46e5', fontWeight: 700, fontSize: '0.86rem' }}>Khám phá ➔</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* MODAL CHI TIẾT CÔNG TY */}
      {selectedCompanyId && (
        <CompanyDetailModal 
          companyId={selectedCompanyId}
          onClose={() => setSelectedCompanyId(null)}
          onApplyJob={(job) => setSelectedJobForApply(job)}
        />
      )}

      {/* MODAL ỨNG TUYỂN BẰNG AI */}
      {selectedJobForApply && (
        <ApplyAIModal 
          job={selectedJobForApply} 
          currentUser={currentUser}
          onClose={() => setSelectedJobForApply(null)} 
          onApplied={() => {
            setSelectedJobForApply(null);
            loadCompanies();
          }}
        />
      )}

      {/* MODAL LỊCH PHỎNG VẤN NẾU CLICK TỪ CHUÔNG */}
      {selectedInterviewForModal && (
        <CandidateInterviewModal 
          interview={selectedInterviewForModal}
          onClose={() => setSelectedInterviewForModal(null)}
          onResponded={() => loadInterviews()}
        />
      )}

      {/* FOOTER */}
      <footer className="candidate-footer">
        <div className="candidate-footer__inner">
          <div className="candidate-footer__col">
            <div className="candidate-footer__brand">
              <img src={getAssetUrl('/images/logo.png')} alt="AI Matcher Logo" />
              <span>AI MATCHER</span>
            </div>
            <p className="candidate-footer__desc">
              Nền tảng Tuyển dụng Thông minh — Kết nối CV và JD chính xác hơn với Trí tuệ Nhân tạo.
            </p>
          </div>

          <div className="candidate-footer__col">
            <h4>Dành cho Ứng viên</h4>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('candidate-portal'); }}>Tìm việc làm</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('companies'); }}>Khám phá Công ty</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('profile'); }}>Hồ sơ cá nhân</a>
          </div>

          <div className="candidate-footer__col">
            <h4>Dành cho Nhà tuyển dụng</h4>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('jobs'); }}>Đăng tin tuyển dụng</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('jobs'); }}>AI Matching</a>
          </div>

          <div className="candidate-footer__col">
            <h4>Liên hệ</h4>
            <p>📧 support@aimatcher.vn</p>
            <p>📍 TP. Hồ Chí Minh, Việt Nam</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
